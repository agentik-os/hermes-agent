use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Tabs, Wrap},
};
use ratatui_rmux::{PaneState, PaneWidget};

use crate::model::{App, Density, Focus, Mode, Theme, View, density};

const GOLD: Color = Color::Rgb(242, 190, 58);
const INK: Color = Color::Rgb(226, 232, 240);
const MUTED: Color = Color::Rgb(107, 122, 144);
const PANEL: Color = Color::Rgb(35, 43, 57);
const GREEN: Color = Color::Rgb(73, 209, 140);
fn accent(theme: Theme) -> Color {
    match theme {
        Theme::Gold => GOLD,
        Theme::Ocean => Color::Rgb(55, 180, 255),
        Theme::Mono => Color::White,
    }
}

pub fn draw(frame: &mut Frame, app: &App, pane: Option<&PaneState>) {
    let area = frame.area();
    if app.mode == Mode::Terminal {
        draw_terminal(frame, app, pane, area);
        return;
    }
    let mode = density(area.width, area.height);
    let shell = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(2),
            Constraint::Min(5),
            Constraint::Length(2),
        ])
        .split(area);
    draw_header(frame, app, shell[0]);
    draw_nav(frame, app, shell[1], mode);
    draw_body(frame, app, pane, shell[2], mode);
    draw_footer(frame, app, shell[3], mode);
}

fn draw_terminal(frame: &mut Frame, app: &App, pane: Option<&PaneState>, area: Rect) {
    let rows = Layout::vertical([
        Constraint::Length(2),
        Constraint::Min(3),
        Constraint::Length(1),
    ])
    .split(area);
    let name = app
        .current()
        .map(|item| item.name.as_str())
        .unwrap_or("NO SESSION");
    frame.render_widget(
        Paragraph::new(format!(
            " AGK · TERMINAL MODE · {name}   Tab Sessions   Esc Control"
        ))
        .style(
            Style::default()
                .fg(accent(app.theme))
                .add_modifier(Modifier::BOLD),
        ),
        rows[0],
    );
    if let Some(state) = pane {
        frame.render_widget(PaneWidget::new(state), rows[1]);
    }
    if app.session_drawer {
        let drawer = Rect::new(
            area.x,
            area.y + 2,
            area.width.min(50),
            area.height.saturating_sub(3),
        );
        draw_sessions(frame, app, drawer);
    }
    frame.render_widget(
        Paragraph::new("Input → RMUX │ Tab drawer │ ↑↓ select │ Enter switch │ Esc control"),
        rows[2],
    );
}

fn draw_header(frame: &mut Frame, app: &App, area: Rect) {
    let online = Line::from(vec![
        Span::styled(
            " AGK ",
            Style::default()
                .fg(Color::Black)
                .bg(accent(app.theme))
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("  {}  ", app.environment.to_ascii_uppercase()),
            Style::default().fg(INK).add_modifier(Modifier::BOLD),
        ),
        Span::styled("MISSION CONTROL", Style::default().fg(MUTED)),
        Span::raw(" "),
        Span::styled(
            "● ONLINE",
            Style::default().fg(GREEN).add_modifier(Modifier::BOLD),
        ),
    ]);
    frame.render_widget(
        Paragraph::new(online).block(
            Block::default()
                .borders(Borders::BOTTOM)
                .border_style(Style::default().fg(PANEL)),
        ),
        area,
    );
}

fn draw_nav(frame: &mut Frame, app: &App, area: Rect, mode: Density) {
    let views = match mode {
        Density::Compact => &View::ALL[..3],
        Density::Standard => &View::ALL[..6],
        Density::Wide => &View::ALL[..],
    };
    let titles = views
        .iter()
        .map(|view| Line::from(view.label()))
        .collect::<Vec<_>>();
    let selected = views.iter().position(|view| *view == app.view).unwrap_or(0);
    let nav_style = if app.focus == Focus::Nav {
        accent(app.theme)
    } else {
        MUTED
    };
    frame.render_widget(
        Tabs::new(titles)
            .select(selected)
            .divider("  ")
            .style(Style::default().fg(nav_style))
            .highlight_style(
                Style::default()
                    .fg(Color::Black)
                    .bg(accent(app.theme))
                    .add_modifier(Modifier::BOLD),
            ),
        area,
    );
}

fn draw_body(frame: &mut Frame, app: &App, pane: Option<&PaneState>, area: Rect, mode: Density) {
    if app.view != View::Sessions {
        let text = match app.view {
            View::Projects => "Projects resolve canonical paths, sessions, missions and agents.",
            View::Agents => "Agents are execution actors linked to stable RMUX panes.",
            View::Os => "No Operative Systems are installed. The registry is ready.",
            View::Mcp => "MCP connections are scoped and credentials are always redacted.",
            View::Skills => "Skills are reusable capabilities; OS are methodologies.",
            View::System => "System health and runtime reconciliation.",
            View::Settings => {
                "APPEARANCE\n\nEnter  Change theme\n\nThemes: AGK Gold · Ocean · Mono"
            }
            View::Help => {
                "Press 1–6 to navigate, Tab to focus, Tab Tab to expand, q to detach Control."
            }
            View::Sessions => unreachable!(),
        };
        frame.render_widget(
            Paragraph::new(text).wrap(Wrap { trim: true }).block(
                Block::bordered()
                    .title(format!(" {} ", app.view.label()))
                    .border_style(Style::default().fg(PANEL)),
            ),
            area,
        );
        return;
    }
    let show_preview = mode == Density::Wide && app.split;
    let panes = if app.expanded {
        if app.focus == Focus::Preview {
            vec![Rect::new(area.x, area.y, 0, area.height), area]
        } else {
            vec![area, Rect::new(area.right(), area.y, 0, area.height)]
        }
    } else if show_preview {
        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(42), Constraint::Percentage(58)])
            .split(area)
            .to_vec()
    } else {
        vec![area, Rect::new(area.right(), area.y, 0, area.height)]
    };
    draw_sessions(frame, app, panes[0]);
    if panes[1].width > 0 {
        draw_preview(frame, app, pane, panes[1]);
    }
}

fn draw_sessions(frame: &mut Frame, app: &App, area: Rect) {
    let items = app
        .sessions
        .iter()
        .map(|item| {
            ListItem::new(vec![
                Line::from(vec![
                    Span::styled("● ", Style::default().fg(GREEN)),
                    Span::styled(
                        &item.name,
                        Style::default().fg(INK).add_modifier(Modifier::BOLD),
                    ),
                ]),
                Line::from(vec![Span::styled(
                    format!("  {} · {} · {}", item.scope, item.kind, item.activity),
                    Style::default().fg(MUTED),
                )]),
            ])
        })
        .collect::<Vec<_>>();
    let title = if app.query.is_empty() {
        " ACTIVE + RECENT ".into()
    } else {
        format!(" FILTER · {} ", app.query)
    };
    let list = List::new(items)
        .block(
            Block::bordered()
                .title(title)
                .border_style(Style::default().fg(if app.focus == Focus::List {
                    accent(app.theme)
                } else {
                    PANEL
                })),
        )
        .highlight_style(Style::default().bg(Color::Rgb(38, 50, 67)).fg(Color::White))
        .highlight_symbol("▶ ");
    let mut state =
        ListState::default().with_selected((!app.sessions.is_empty()).then_some(app.selected));
    frame.render_stateful_widget(list, area, &mut state);
}

fn draw_preview(frame: &mut Frame, app: &App, pane: Option<&PaneState>, area: Rect) {
    let title = app
        .current()
        .map(|item| format!(" {} · LIVE ", item.name))
        .unwrap_or_else(|| " PREVIEW ".into());
    let block = Block::bordered()
        .title(title)
        .border_style(Style::default().fg(if app.focus == Focus::Preview {
            accent(app.theme)
        } else {
            PANEL
        }));
    let inner = block.inner(area);
    frame.render_widget(block, area);
    if let Some(state) = pane {
        frame.render_widget(PaneWidget::new(state), inner);
    } else {
        frame.render_widget(
            Paragraph::new("Select a live RMUX session")
                .style(Style::default().fg(MUTED))
                .alignment(Alignment::Center),
            inner,
        );
    }
}

fn draw_footer(frame: &mut Frame, app: &App, area: Rect, mode: Density) {
    let keys = if mode == Density::Compact {
        "↑↓ move  Enter open  n new  / find  q detach"
    } else {
        "↑↓ move  Enter open  Tab focus  Tab·Tab expand  n new  / search  Ctrl-p palette  q detach"
    };
    let context = app
        .current()
        .map(|item| {
            format!(
                "{} │ {} │ rmux:{}",
                app.environment.to_ascii_uppercase(),
                item.kind,
                item.name
            )
        })
        .unwrap_or_else(|| app.environment.to_ascii_uppercase());
    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled(
                format!(" {context} │ {}  ", app.theme.name()),
                Style::default().fg(accent(app.theme)),
            ),
            Span::styled(keys, Style::default().fg(MUTED)),
        ])),
        area,
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::RuntimeItem;
    use ratatui::{Terminal, backend::TestBackend};

    fn app() -> App {
        let mut app = App::new("mission".into());
        app.set_sessions(vec![
            RuntimeItem::from_rmux("mission-moonbase-hermes"),
            RuntimeItem::from_rmux("mission-dentistry-codex"),
        ]);
        app
    }

    #[test]
    fn every_responsive_mode_renders_without_overflow() {
        for (width, height) in [(60, 16), (90, 24), (140, 40)] {
            let backend = TestBackend::new(width, height);
            let mut terminal = Terminal::new(backend).unwrap();
            terminal.draw(|frame| draw(frame, &app(), None)).unwrap();
            let rendered = terminal
                .backend()
                .buffer()
                .content
                .iter()
                .map(|cell| cell.symbol())
                .collect::<String>();
            assert!(rendered.contains("AGK"));
            assert!(rendered.contains("Moonbase") || rendered.contains("moonbase"));
        }
    }
}
