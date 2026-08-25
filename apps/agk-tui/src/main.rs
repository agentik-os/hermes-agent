mod data;
mod input;
mod model;
mod system_info;
mod theme;
mod ui;

use std::{
    io,
    process::Command,
    time::{Duration, Instant},
};

use anyhow::{Context, Result};
use crossterm::{
    cursor::Show,
    event::{
        self, DisableBracketedPaste, DisableMouseCapture, EnableBracketedPaste, EnableMouseCapture,
        Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers,
    },
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use data::RegistryClient;
use input::Action;
use model::{App, Focus, Mode, View};
use ratatui::{Terminal, backend::CrosstermBackend};
use ratatui_rmux::PaneState;
use rmux_sdk::{Pane, Rmux, TerminalSizeSpec};
use system_info::SystemInfoService;
use theme::Preferences;

const FRAME_TIME: Duration = Duration::from_millis(80);

#[tokio::main]
async fn main() -> Result<()> {
    let environment = std::env::var("AGK_ENVIRONMENT")
        .unwrap_or_else(|_| std::env::var("USER").unwrap_or_else(|_| "agentik".into()));
    let (preferences, preference_warning) = match Preferences::load() {
        Ok(preferences) => (preferences, None),
        Err(error) => (
            Preferences::default(),
            Some(format!("Preferences could not be loaded: {error}")),
        ),
    };
    let registry = RegistryClient::discover(environment.clone());
    let rmux = Rmux::builder()
        .default_timeout(Duration::from_secs(3))
        .connect_or_start()
        .await
        .context("connect to RMUX")?;

    let mut app = App::new(environment, preferences);
    app.status = preference_warning;
    refresh(&rmux, &registry, &mut app).await?;

    enable_raw_mode().context("enable terminal raw mode")?;
    let _restore = RestoreTerminal;
    let mut stdout = io::stdout();
    execute!(
        stdout,
        EnterAlternateScreen,
        EnableMouseCapture,
        EnableBracketedPaste
    )?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout))?;
    terminal.clear()?;
    run(&mut terminal, &rmux, &registry, &mut app).await
}

struct RestoreTerminal;

impl Drop for RestoreTerminal {
    fn drop(&mut self) {
        let _ = disable_raw_mode();
        let _ = execute!(
            io::stdout(),
            DisableBracketedPaste,
            DisableMouseCapture,
            LeaveAlternateScreen,
            Show
        );
    }
}

async fn refresh(rmux: &Rmux, registry: &RegistryClient, app: &mut App) -> Result<()> {
    let live_names = rmux
        .list_sessions()
        .await
        .context("list RMUX sessions")?
        .into_iter()
        .map(|name| name.as_ref().to_owned())
        .filter(|name| !name.ends_with("-control"))
        .collect::<Vec<_>>();
    app.set_snapshot(registry.load(&live_names));
    Ok(())
}

async fn run(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    rmux: &Rmux,
    registry: &RegistryClient,
    app: &mut App,
) -> Result<()> {
    let mut host = SystemInfoService::new();
    let mut last_refresh = Instant::now();
    let mut refresh_requested = false;
    let mut pending_session: Option<String> = None;
    let mut last_resize: Option<(String, u16, u16)> = None;
    let mut observed_status = app.status.clone();
    let mut status_since = Instant::now();

    loop {
        if app.status != observed_status {
            observed_status.clone_from(&app.status);
            status_since = Instant::now();
        } else if app.status.is_some() && status_since.elapsed() >= Duration::from_secs(4) {
            app.status = None;
            observed_status = None;
        }
        let refresh_interval = Duration::from_millis(app.preferences.refresh_ms.max(100));
        if refresh_requested || last_refresh.elapsed() >= refresh_interval {
            match refresh(rmux, registry, app).await {
                Ok(()) => {
                    if let Some(name) = pending_session.take()
                        && app.select_session_by_name(&name)
                    {
                        app.status = Some(format!("Created and selected {name}"));
                    }
                    if refresh_requested {
                        app.status
                            .get_or_insert_with(|| "RMUX and registries refreshed".into());
                    }
                }
                Err(error) => app.status = Some(format!("Refresh failed: {error:#}")),
            }
            last_refresh = Instant::now();
            refresh_requested = false;
        }

        update_footer(&mut host, app);
        if app.mode == Mode::Terminal {
            let size = terminal.size()?;
            app.preview_width = size.width;
            app.preview_height = size.height;
        }
        let pane = if app.view == View::Sessions {
            preview(rmux, app, &mut last_resize).await
        } else {
            None
        };
        terminal.draw(|frame| ui::draw(frame, app, pane.as_ref()))?;

        if !event::poll(FRAME_TIME)? {
            continue;
        }
        let event = event::read()?;
        if app.mode == Mode::Terminal {
            if let Event::Key(key) = &event
                && accepts_key(key)
                && (key.code == KeyCode::Tab
                    || (key.code == KeyCode::Char('g')
                        && key.modifiers.contains(KeyModifiers::CONTROL))
                    || (key.code == KeyCode::Char('r')
                        && key.modifiers.contains(KeyModifiers::CONTROL)))
            {
                app.mode = Mode::Control;
                app.view = View::Sessions;
                app.focus = Focus::Detail;
                last_resize = None;
                if key.code == KeyCode::Char('r') {
                    refresh_requested = true;
                    app.status = Some("Reloading AGK and RMUX state".into());
                }
                continue;
            }
            send_terminal_event(rmux, app, event).await;
            continue;
        }

        let Event::Key(key) = event else {
            continue;
        };
        if !accepts_key(&key) {
            continue;
        }
        let detail_available = detail_available(app);
        match input::handle_key(app, key, detail_available) {
            Action::None => {}
            Action::Quit => break,
            Action::Refresh => refresh_requested = true,
            Action::PersistPreferences => match app.preferences.save() {
                Ok(()) => {
                    if app.status.is_none() {
                        app.status = Some("Preferences saved".into());
                    }
                }
                Err(error) => app.status = Some(format!("Could not save preferences: {error}")),
            },
            Action::EnterTerminal => {
                app.mode = Mode::Terminal;
                app.focus = Focus::Detail;
                last_resize = None;
            }
            Action::CreateSession { kind, name } => match create_session(kind.slug(), &name) {
                Ok(message) => {
                    app.status = Some(message);
                    pending_session = Some(name);
                    refresh_requested = true;
                }
                Err(error) => app.status = Some(format!("Session creation failed: {error:#}")),
            },
        }
    }
    Ok(())
}

fn update_footer(host: &mut SystemInfoService, app: &mut App) {
    host.refresh_if_due(app.snapshot.token_total, app.snapshot.runtimes.len());
    app.footer = host.snapshot().clone();
}

async fn preview(
    rmux: &Rmux,
    app: &App,
    last_resize: &mut Option<(String, u16, u16)>,
) -> Option<PaneState> {
    let runtime = app.current_session()?;
    if !runtime.live {
        return None;
    }
    let session_name = runtime.rmux_session.clone();
    let pane = primary_pane(rmux, &session_name).await?;
    let width = app.preview_width;
    let height = app.preview_height;
    if width > 1 && height > 1 {
        let desired = (session_name, width, height);
        if last_resize.as_ref() != Some(&desired) {
            let _ = pane.resize(TerminalSizeSpec::new(width, height)).await;
            *last_resize = Some(desired);
        }
    }
    pane.snapshot().await.ok().map(PaneState::from_snapshot)
}

fn create_session(kind: &str, name: &str) -> Result<String> {
    let output = Command::new("agk")
        .arg("new")
        .arg(kind)
        .arg(name)
        .output()
        .context("run `agk new`")?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        anyhow::bail!(if error.is_empty() {
            format!("agk exited with {}", output.status)
        } else {
            error
        });
    }
    let message = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    Ok(if message.is_empty() {
        format!("Created {name}")
    } else {
        message
    })
}

async fn send_terminal_event(rmux: &Rmux, app: &App, event: Event) {
    let Some(runtime) = app.current_session() else {
        return;
    };
    let Some(pane) = primary_pane(rmux, &runtime.rmux_session).await else {
        return;
    };
    match event {
        Event::Paste(text) => {
            let _ = pane.send_text(text).await;
        }
        Event::Key(key) if accepts_key(&key) => {
            if let KeyCode::Char(character) = key.code
                && !key
                    .modifiers
                    .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT)
            {
                let _ = pane.send_text(character.to_string()).await;
            } else if let Some(token) = rmux_key_token(key) {
                let _ = pane.send_key(token).await;
            }
        }
        _ => {}
    }
}

async fn primary_pane(rmux: &Rmux, session_name: &str) -> Option<Pane> {
    rmux.find_panes()
        .session(session_name)
        .all()
        .await
        .ok()?
        .into_iter()
        .next()
        .map(|discovered| discovered.pane)
}

fn rmux_key_token(key: KeyEvent) -> Option<String> {
    let base = match key.code {
        KeyCode::Backspace => "Backspace".into(),
        KeyCode::Enter => "Enter".into(),
        KeyCode::Left => "Left".into(),
        KeyCode::Right => "Right".into(),
        KeyCode::Up => "Up".into(),
        KeyCode::Down => "Down".into(),
        KeyCode::Home => "Home".into(),
        KeyCode::End => "End".into(),
        KeyCode::PageUp => "PageUp".into(),
        KeyCode::PageDown => "PageDown".into(),
        KeyCode::Tab => "Tab".into(),
        KeyCode::BackTab => "BTab".into(),
        KeyCode::Delete => "Delete".into(),
        KeyCode::Insert => "Insert".into(),
        KeyCode::F(number) => format!("F{number}"),
        KeyCode::Char(character) => character.to_string(),
        KeyCode::Null => "C-Space".into(),
        KeyCode::Esc => "Escape".into(),
        _ => return None,
    };
    if matches!(key.code, KeyCode::Null) {
        return Some(base);
    }
    let mut prefixes = Vec::new();
    if key.modifiers.contains(KeyModifiers::CONTROL) {
        prefixes.push("C");
    }
    if key.modifiers.contains(KeyModifiers::ALT) {
        prefixes.push("M");
    }
    if key.modifiers.contains(KeyModifiers::SHIFT)
        && !matches!(key.code, KeyCode::Char(_) | KeyCode::BackTab)
    {
        prefixes.push("S");
    }
    if prefixes.is_empty() {
        Some(base)
    } else {
        Some(format!("{}-{base}", prefixes.join("-")))
    }
}

fn accepts_key(key: &KeyEvent) -> bool {
    matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat)
}

fn detail_available(app: &App) -> bool {
    match app.view {
        View::Sessions => app.current_session().is_some(),
        View::Projects => app.current_object().is_some(),
        View::Agents => app.current_agent().is_some(),
        View::Os => app.current_os().is_some(),
        View::Mcp => app.current_mcp().is_some(),
        View::Skills => app.current_skill().is_some(),
        View::System | View::Settings | View::Help => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn terminal_key_mapping_forwards_navigation_function_and_modifiers() {
        let cases = [
            (KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE), "Escape"),
            (KeyEvent::new(KeyCode::Tab, KeyModifiers::NONE), "Tab"),
            (KeyEvent::new(KeyCode::BackTab, KeyModifiers::SHIFT), "BTab"),
            (KeyEvent::new(KeyCode::PageUp, KeyModifiers::NONE), "PageUp"),
            (KeyEvent::new(KeyCode::F(11), KeyModifiers::NONE), "F11"),
            (
                KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL),
                "C-c",
            ),
            (KeyEvent::new(KeyCode::Char('x'), KeyModifiers::ALT), "M-x"),
            (
                KeyEvent::new(
                    KeyCode::Char('x'),
                    KeyModifiers::CONTROL | KeyModifiers::ALT,
                ),
                "C-M-x",
            ),
            (KeyEvent::new(KeyCode::Up, KeyModifiers::SHIFT), "S-Up"),
        ];
        for (key, expected) in cases {
            assert_eq!(rmux_key_token(key).as_deref(), Some(expected));
        }
    }

    #[test]
    fn media_and_lock_keys_are_ignored_safely() {
        assert_eq!(
            rmux_key_token(KeyEvent::new(KeyCode::CapsLock, KeyModifiers::NONE)),
            None
        );
    }
}
