mod model;
mod ui;

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use model::{App, Focus, RuntimeItem, View};
use ratatui::{Terminal, backend::CrosstermBackend};
use ratatui_rmux::PaneState;
use rmux_sdk::Rmux;
use std::{
    io,
    process::Command,
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
            (KeyCode::Down | KeyCode::Char('j'), _) => app.select_next(),
            (KeyCode::Up | KeyCode::Char('k'), _) => app.select_previous(),
            (KeyCode::Tab, _) => app.tab(Instant::now(), terminal.size()?.width >= 120),
            (KeyCode::BackTab, _) => {
                app.focus = if app.focus == Focus::List {
                    Focus::Preview
                } else {
                    Focus::List
                }
            }
            (KeyCode::Char('v'), _) => app.split = !app.split,
            (KeyCode::Char('p'), KeyModifiers::CONTROL) => app.palette = true,
            (KeyCode::Enter, _) if app.view == View::Sessions => {
                if let Some(name) = app.current().map(|item| item.name.clone()) {
                    disable_raw_mode()?;
                    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
                    let _ = Command::new("rmux")
                        .args(["attach-session", "-t", &name])
                        .status();
                    enable_raw_mode()?;
                    execute!(terminal.backend_mut(), EnterAlternateScreen)?;
                    terminal.clear()?;
                }
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
