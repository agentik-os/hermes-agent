mod model;
mod ui;

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use model::{App, Focus, Mode, RuntimeItem, View};
use ratatui::{Terminal, backend::CrosstermBackend};
use ratatui_rmux::PaneState;
use rmux_sdk::Rmux;
use std::{
    io,
    time::{Duration, Instant},
};

#[tokio::main]
async fn main() -> Result<()> {
    let environment = std::env::var("AGK_ENVIRONMENT")
        .unwrap_or_else(|_| std::env::var("USER").unwrap_or_else(|_| "agentik".into()));
    let rmux = Rmux::builder()
        .default_timeout(Duration::from_secs(3))
        .connect_or_start()
        .await?;
    let mut app = App::new(environment);
    refresh(&rmux, &mut app).await?;
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout))?;
    let result = run(&mut terminal, &rmux, &mut app).await;
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    result
}

async fn refresh(rmux: &Rmux, app: &mut App) -> Result<()> {
    let sessions = rmux
        .list_sessions()
        .await?
        .into_iter()
        .map(|name| RuntimeItem::from_rmux(name.as_ref()))
        .collect();
    app.set_sessions(sessions);
    Ok(())
}

async fn preview(rmux: &Rmux, app: &App) -> Option<PaneState> {
    let name = app.current()?.name.clone();
    let name = rmux_sdk::SessionName::new(name).ok()?;
    let session = rmux.session(name).await.ok()?;
    let snapshot = session.pane(0, 0).snapshot().await.ok()?;
    Some(PaneState::from_snapshot(snapshot))
}

async fn run(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    rmux: &Rmux,
    app: &mut App,
) -> Result<()> {
    let mut last_refresh = Instant::now() - Duration::from_secs(5);
    loop {
        if last_refresh.elapsed() >= Duration::from_secs(1) {
            refresh(rmux, app).await?;
            last_refresh = Instant::now();
        }
        let pane = if app.view == View::Sessions {
            preview(rmux, app).await
        } else {
            None
        };
        terminal.draw(|frame| ui::draw(frame, app, pane.as_ref()))?;
        if !event::poll(Duration::from_millis(100))? {
            continue;
        }
        let Event::Key(key) = event::read()? else {
            continue;
        };
        if key.kind != KeyEventKind::Press {
            continue;
        }
        if app.mode == Mode::Terminal {
            if key.code == KeyCode::Esc {
                app.mode = Mode::Control;
                app.view = View::Sessions;
                app.focus = Focus::List;
                continue;
            }
            if key.code == KeyCode::Tab {
                app.mode = Mode::Control;
                app.view = View::Sessions;
                app.focus = Focus::List;
                continue;
            }
            send_terminal_key(rmux, app, key.code, key.modifiers).await;
            continue;
        }
        match (key.code, key.modifiers) {
            (KeyCode::Char('q'), _) => break,
            (KeyCode::Char('1'), _) => app.view = View::Sessions,
            (KeyCode::Char('2'), _) => app.view = View::Projects,
            (KeyCode::Char('3'), _) => app.view = View::Agents,
            (KeyCode::Char('4'), _) => app.view = View::Os,
            (KeyCode::Char('5'), _) => app.view = View::Mcp,
            (KeyCode::Char('6'), _) => app.view = View::Skills,
            (KeyCode::Char('s'), _) => app.view = View::System,
            (KeyCode::Char(','), _) => app.view = View::Settings,
            (KeyCode::Char('?'), _) => app.view = View::Help,
            (KeyCode::Right | KeyCode::Char('l'), _) if app.focus == Focus::Nav => app.next_view(),
            (KeyCode::Left | KeyCode::Char('h'), _) if app.focus == Focus::Nav => {
                app.previous_view()
            }
            (KeyCode::Down | KeyCode::Char('j'), _) if app.focus == Focus::Nav => {
                app.focus = Focus::List
            }
            (KeyCode::Down | KeyCode::Char('j'), _) => app.select_next(),
            (KeyCode::Up | KeyCode::Char('k'), _) if app.focus == Focus::List => {
                if app.selected == 0 {
                    app.focus = Focus::Nav
                } else {
                    app.select_previous()
                }
            }
            (KeyCode::Tab, _) => app.tab(Instant::now(), terminal.size()?.width >= 120),
            (KeyCode::BackTab, _) => app.back_tab(terminal.size()?.width >= 120),
            (KeyCode::Char('v'), _) => app.split = !app.split,
            (KeyCode::Char('p'), KeyModifiers::CONTROL) => app.palette = true,
            (KeyCode::Enter, _) if app.focus == Focus::Nav => app.focus = Focus::List,
            (KeyCode::Enter, _) if app.view == View::Settings => app.theme = app.theme.next(),
            (KeyCode::Enter, _) if app.view == View::Sessions => {
                app.mode = Mode::Terminal;
            }
            (KeyCode::Esc, _) => {
                app.palette = false;
                app.expanded = false;
                app.focus = Focus::List;
            }
            _ => {}
        }
    }
    Ok(())
}

async fn send_terminal_key(rmux: &Rmux, app: &App, code: KeyCode, modifiers: KeyModifiers) {
    let Some(name) = app.current().map(|item| item.name.clone()) else {
        return;
    };
    let Ok(name) = rmux_sdk::SessionName::new(name) else {
        return;
    };
    let Ok(session) = rmux.session(name).await else {
        return;
    };
    let keyboard = session.pane(0, 0).keyboard();
    let result = match code {
        KeyCode::Char(ch) if modifiers.contains(KeyModifiers::CONTROL) => {
            keyboard.press(format!("C-{ch}")).await
        }
        KeyCode::Char(ch) => keyboard.type_text(ch.to_string()).await,
        KeyCode::Enter => keyboard.press("Enter").await,
        KeyCode::Backspace => keyboard.press("Backspace").await,
        KeyCode::Delete => keyboard.press("Delete").await,
        KeyCode::Left => keyboard.press("Left").await,
        KeyCode::Right => keyboard.press("Right").await,
        KeyCode::Up => keyboard.press("Up").await,
        KeyCode::Down => keyboard.press("Down").await,
        _ => return,
    };
    let _ = result;
}
