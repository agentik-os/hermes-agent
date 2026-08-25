use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Clear, List, ListItem, ListState, Paragraph, Tabs, Wrap},
};
use ratatui_rmux::{PaneState, PaneWidget};

use crate::{
    input::palette_items,
    model::{App, Density, Focus, Mode, Overlay, SessionKind, SettingsSection, View, density},
    system_info::{UNKNOWN, format_percent, format_token_total},
    theme::{Palette, Theme},
};

pub fn draw(frame: &mut Frame, app: &mut App, pane: Option<&PaneState>) {
    let area = frame.area();
    let colors = app.theme.palette();
    frame.render_widget(
        Block::default().style(Style::default().bg(colors.background)),
        area,
    );
    if app.mode == Mode::Terminal {
        draw_terminal(frame, pane, area, colors);
        return;
    }

    let size = density(area.width, area.height);
    let rows = Layout::vertical([
        Constraint::Length(3),
        Constraint::Length(2),
        Constraint::Min(5),
        Constraint::Length(3),
    ])
    .split(area);
    draw_header(frame, app, rows[0], colors);
    draw_nav(frame, app, rows[1], size, colors);
    draw_body(frame, app, pane, rows[2], size, colors);
    draw_footer(frame, app, rows[3], size, colors);
    draw_overlay(frame, app, area, colors);
}

fn draw_terminal(frame: &mut Frame, pane: Option<&PaneState>, area: Rect, colors: Palette) {
    if let Some(pane) = pane {
        frame.render_widget(PaneWidget::new(pane), area);
    } else {
        frame.render_widget(
            Paragraph::new("Live RMUX pane unavailable\n\nCtrl-g  Return to AGK")
                .alignment(Alignment::Center)
                .style(Style::default().fg(colors.text_muted).bg(colors.background)),
            area,
        );
    }
}

fn draw_header(frame: &mut Frame, app: &App, area: Rect, colors: Palette) {
    let live = app
        .snapshot
        .runtimes
        .iter()
        .filter(|item| item.live)
        .count();
    let line = Line::from(vec![
        Span::styled(
            " AGK ",
            Style::default()
                .fg(colors.background)
                .bg(colors.accent)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("  {}  ", app.environment.to_ascii_uppercase()),
            Style::default()
                .fg(colors.text)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled("MISSION CONTROL", Style::default().fg(colors.text_muted)),
        Span::styled(
            format!("   ● {live} LIVE"),
            Style::default()
                .fg(colors.success)
                .add_modifier(Modifier::BOLD),
        ),
    ]);
    frame.render_widget(
        Paragraph::new(line).block(
            Block::default()
                .borders(Borders::BOTTOM)
                .border_style(Style::default().fg(colors.border)),
        ),
        area,
    );
}

fn draw_nav(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    if size == Density::Compact {
        frame.render_widget(
            Paragraph::new(Line::from(vec![
                Span::styled(" ‹ ", Style::default().fg(colors.text_muted)),
                Span::styled(
                    format!(" {} {} ", app.view.hotkey(), app.view.label()),
                    Style::default()
                        .fg(colors.selection_text)
                        .bg(colors.selection_bg)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(" ›  ←/→ views", Style::default().fg(colors.text_muted)),
            ]))
            .style(Style::default().bg(colors.surface)),
            area,
        );
        return;
    }
    let labels = View::ALL
        .iter()
        .map(|view| Line::from(format!("{} {}", view.hotkey(), view.label())))
        .collect::<Vec<_>>();
    let selected = View::ALL
        .iter()
        .position(|view| *view == app.view)
        .unwrap_or_default();
    frame.render_widget(
        Tabs::new(labels)
            .select(selected)
            .divider(" ")
            .style(
                Style::default()
                    .fg(if app.focus == Focus::Nav {
                        colors.accent
                    } else {
                        colors.text_muted
                    })
                    .bg(colors.surface),
            )
            .highlight_style(
                Style::default()
                    .fg(colors.selection_text)
                    .bg(colors.selection_bg)
                    .add_modifier(Modifier::BOLD),
            ),
        area,
    );
}

fn draw_body(
    frame: &mut Frame,
    app: &mut App,
    pane: Option<&PaneState>,
    area: Rect,
    size: Density,
    colors: Palette,
) {
    match app.view {
        View::Sessions => draw_sessions(frame, app, pane, area, size, colors),
        View::Projects => draw_projects(frame, app, area, size, colors),
        View::Agents => draw_agents(frame, app, area, size, colors),
        View::Os => draw_os(frame, app, area, size, colors),
        View::Mcp => draw_mcp(frame, app, area, size, colors),
        View::Skills => draw_skills(frame, app, area, size, colors),
        View::System => draw_system(frame, app, area, colors),
        View::Settings => draw_settings(frame, app, area, size, colors),
        View::Help => draw_help(frame, app, area, colors),
    }
}

fn panes(app: &App, area: Rect, size: Density) -> (Rect, Rect) {
    let hidden = Rect::new(area.right(), area.y, 0, area.height);
    if app.expanded || size == Density::Compact {
        if app.focus == Focus::Detail {
            return (hidden, area);
        }
        return (area, hidden);
    }
    let columns =
        Layout::horizontal([Constraint::Percentage(40), Constraint::Percentage(60)]).split(area);
    (columns[0], columns[1])
}

fn draw_sessions(
    frame: &mut Frame,
    app: &mut App,
    pane: Option<&PaneState>,
    area: Rect,
    size: Density,
    colors: Palette,
) {
    let (mut list_area, mut preview_area) = panes(app, area, size);
    if !app.preferences.split_preview && !app.expanded {
        if app.focus == Focus::Detail {
            list_area.width = 0;
            preview_area = area;
        } else {
            list_area = area;
            preview_area.width = 0;
        }
    }
    if list_area.width > 0 {
        let records = app.filtered_sessions().collect::<Vec<_>>();
        let items = records
            .iter()
            .map(|runtime| {
                let scope = [
                    runtime.client.as_deref(),
                    runtime.project.as_deref(),
                    runtime.mission.as_deref(),
                ]
                .into_iter()
                .flatten()
                .collect::<Vec<_>>()
                .join(" / ");
                ListItem::new(vec![
                    Line::from(vec![
                        Span::styled(
                            if runtime.live { "● " } else { "○ " },
                            Style::default().fg(if runtime.live {
                                colors.success
                            } else {
                                colors.text_muted
                            }),
                        ),
                        Span::styled(
                            runtime.name.clone(),
                            Style::default()
                                .fg(colors.text)
                                .add_modifier(Modifier::BOLD),
                        ),
                    ]),
                    Line::styled(
                        format!(
                            "  {} · {} · {}",
                            runtime.kind,
                            runtime.status,
                            if scope.is_empty() {
                                runtime.cwd.as_str()
                            } else {
                                scope.as_str()
                            }
                        ),
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            })
            .collect();
        let title = if app.query.is_empty() {
            format!(" SESSIONS · {} ", records.len())
        } else {
            format!(" FILTER · {} · {} ", app.query, records.len())
        };
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            &title,
            colors,
        );
    }
    if preview_area.width > 0 {
        let title = app
            .current_session()
            .map(|runtime| format!(" {} · LIVE PREVIEW ", runtime.name))
            .unwrap_or_else(|| " LIVE PREVIEW ".into());
        let block = panel(&title, app.focus == Focus::Detail, colors);
        let inner = block.inner(preview_area);
        frame.render_widget(block, preview_area);
        app.preview_width = inner.width;
        app.preview_height = inner.height;
        if let Some(pane) = pane {
            frame.render_widget(PaneWidget::new(pane), inner);
        } else {
            frame.render_widget(
                Paragraph::new(
                    "No live pane snapshot\n\nEnter  Fullscreen terminal\nF / Tab Tab  Expand\nv  Toggle split preview",
                )
                .alignment(Alignment::Center)
                .wrap(Wrap { trim: true })
                .style(Style::default().fg(colors.text_muted).bg(colors.surface)),
                inner,
            );
        }
    } else {
        app.preview_width = 0;
        app.preview_height = 0;
    }
}

fn draw_projects(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let (list_area, detail_area) = panes(app, area, size);
    if list_area.width > 0 {
        let items = app
            .filtered_objects()
            .map(|object| {
                ListItem::new(vec![
                    Line::from(vec![
                        Span::styled(
                            format!("{}  ", object.kind.to_ascii_uppercase()),
                            Style::default()
                                .fg(kind_color(&object.kind, colors))
                                .add_modifier(Modifier::BOLD),
                        ),
                        Span::styled(object.name.clone(), Style::default().fg(colors.text)),
                    ]),
                    Line::styled(
                        format!("  {} · {}", object.slug, object.status),
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            })
            .collect();
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            " CLIENTS · PROJECTS · MISSIONS ",
            colors,
        );
    }
    if detail_area.width > 0 {
        let text = app.current_object().map_or_else(
            || Text::from("No canonical Agentik control objects found."),
            |object| {
                Text::from(vec![
                    field("Name", &object.name, colors),
                    field("Kind", &object.kind, colors),
                    field("Status", &object.status, colors),
                    field("Slug", &object.slug, colors),
                    field("ID", &object.id, colors),
                    field("Parent", object.parent_id.as_deref().unwrap_or("—"), colors),
                    field("Path", object.path.as_deref().unwrap_or("—"), colors),
                    Line::raw(""),
                    Line::styled(
                        "Source  ~/.agentik/control.db",
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            },
        );
        detail(frame, detail_area, text, " AGENTIK OBJECT ", app, colors);
    }
}

fn draw_agents(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let (list_area, detail_area) = panes(app, area, size);
    if list_area.width > 0 {
        let items = app
            .filtered_agents()
            .map(|agent| {
                ListItem::new(vec![
                    Line::from(vec![
                        Span::styled(
                            if agent.live { "● " } else { "○ " },
                            Style::default().fg(if agent.live {
                                colors.success
                            } else {
                                colors.text_muted
                            }),
                        ),
                        Span::styled(
                            agent.name.clone(),
                            Style::default()
                                .fg(colors.text)
                                .add_modifier(Modifier::BOLD),
                        ),
                    ]),
                    Line::styled(
                        format!("  {} · {}", agent.runtime, agent.status),
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            })
            .collect();
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            " AGENT REGISTRY ",
            colors,
        );
    }
    if detail_area.width > 0 {
        let text = app.current_agent().map_or_else(
            || Text::from("No bundled or user agents were discovered."),
            |agent| {
                Text::from(vec![
                    field("Agent", &agent.name, colors),
                    field("Version", &agent.version, colors),
                    field("Status", &agent.status, colors),
                    field("Runtime", &agent.runtime, colors),
                    field(
                        "Session",
                        if agent.runtime_name.is_empty() {
                            "—"
                        } else {
                            &agent.runtime_name
                        },
                        colors,
                    ),
                    field("Scope", &join(&agent.scope), colors),
                    Line::raw(""),
                    Line::styled(agent.description.clone(), Style::default().fg(colors.text)),
                    Line::raw(""),
                    Line::styled(
                        "Enter opens the linked live runtime.",
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            },
        );
        detail(frame, detail_area, text, " AGENT DETAIL ", app, colors);
    }
}

fn draw_os(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let (list_area, detail_area) = panes(app, area, size);
    if list_area.width > 0 {
        let items = app
            .filtered_os()
            .map(|package| {
                ListItem::new(vec![
                    Line::from(vec![
                        Span::styled(
                            if package.available { "● " } else { "○ " },
                            Style::default().fg(if package.available {
                                colors.success
                            } else {
                                colors.warning
                            }),
                        ),
                        Span::styled(
                            package.name.clone(),
                            Style::default()
                                .fg(colors.text)
                                .add_modifier(Modifier::BOLD),
                        ),
                    ]),
                    Line::styled(
                        format!(
                            "  {} · {} assignments",
                            package.version,
                            package.assignments.len()
                        ),
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            })
            .collect();
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            " AGENTIK OS REGISTRY ",
            colors,
        );
    }
    if detail_area.width > 0 {
        let text = app.current_os().map_or_else(
            || Text::from("No Agentik OS packages are installed."),
            |package| {
                Text::from(vec![
                    field("OS", &package.name, colors),
                    field("Version", &package.version, colors),
                    field("ID", &package.id, colors),
                    field("Assigned", &join(&package.assignments), colors),
                    field("Scope", &join(&package.scope), colors),
                    field("Agents", &join(&package.agents), colors),
                    field("Skills", &join(&package.skills), colors),
                    field("Workflows", &join(&package.workflows), colors),
                    Line::raw(""),
                    Line::styled(
                        package.description.clone(),
                        Style::default().fg(colors.text),
                    ),
                ])
            },
        );
        detail(frame, detail_area, text, " OPERATIVE SYSTEM ", app, colors);
    }
}

fn draw_mcp(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let (list_area, detail_area) = panes(app, area, size);
    if list_area.width > 0 {
        let items = app
            .filtered_mcp()
            .map(|record| {
                ListItem::new(Line::from(vec![
                    Span::styled(
                        "● ",
                        Style::default().fg(status_color(&record.status, colors)),
                    ),
                    Span::styled(record.name.clone(), Style::default().fg(colors.text)),
                    Span::styled(
                        format!("  {}", record.transport),
                        Style::default().fg(colors.text_muted),
                    ),
                ]))
            })
            .collect();
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            " HERMES MCP CATALOG ",
            colors,
        );
    }
    if detail_area.width > 0 {
        let text = app.current_mcp().map_or_else(
            || Text::from("No MCP servers are configured."),
            |record| {
                Text::from(vec![
                    field("Server", &record.name, colors),
                    field("Transport", &record.transport, colors),
                    field("Status", &record.status, colors),
                    Line::raw(""),
                    Line::styled(
                        "Credentials and arguments are intentionally redacted.",
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            },
        );
        detail(frame, detail_area, text, " MCP DETAIL ", app, colors);
    }
}

fn draw_skills(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let (list_area, detail_area) = panes(app, area, size);
    if list_area.width > 0 {
        let items = app
            .filtered_skills()
            .map(|record| {
                ListItem::new(Line::from(vec![
                    Span::styled("◆ ", Style::default().fg(colors.accent_alt)),
                    Span::styled(record.name.clone(), Style::default().fg(colors.text)),
                    Span::styled(
                        format!("  {}", record.source),
                        Style::default().fg(colors.text_muted),
                    ),
                ]))
            })
            .collect();
        selectable(
            frame,
            list_area,
            items,
            app.selected,
            app.focus == Focus::List,
            " INSTALLED SKILLS ",
            colors,
        );
    }
    if detail_area.width > 0 {
        let text = app.current_skill().map_or_else(
            || Text::from("No Hermes, Claude, or Codex skills were discovered."),
            |record| {
                Text::from(vec![
                    field("Skill", &record.name, colors),
                    field("Source", &record.source, colors),
                    field("Status", &record.status, colors),
                    Line::raw(""),
                    Line::styled(
                        "Skill contents remain owned by their native registry.",
                        Style::default().fg(colors.text_muted),
                    ),
                ])
            },
        );
        detail(frame, detail_area, text, " SKILL DETAIL ", app, colors);
    }
}

fn draw_system(frame: &mut Frame, app: &App, area: Rect, colors: Palette) {
    let mut lines = vec![
        heading("HOST", colors),
        field(
            "Working dir",
            &app.footer
                .cwd
                .as_deref()
                .map(|path| path.to_string_lossy().into_owned())
                .unwrap_or_else(|| UNKNOWN.into()),
            colors,
        ),
        field(
            "Git branch",
            app.footer.git_branch.as_deref().unwrap_or("—"),
            colors,
        ),
        field("CPU", &format_percent(app.footer.cpu_percent), colors),
        field("RAM", &format_percent(app.footer.ram_percent), colors),
        field("Disk", &format_percent(app.footer.disk_percent), colors),
        Line::raw(""),
        heading("REGISTRIES", colors),
        field("Sessions", &app.snapshot.runtimes.len().to_string(), colors),
        field("Objects", &app.snapshot.objects.len().to_string(), colors),
        field("Agents", &app.snapshot.agents.len().to_string(), colors),
        field(
            "OS packages",
            &app.snapshot.os_packages.len().to_string(),
            colors,
        ),
        field(
            "MCP servers",
            &app.snapshot.mcp_servers.len().to_string(),
            colors,
        ),
        field("Skills", &app.snapshot.skills.len().to_string(), colors),
        field(
            "Tokens",
            &format_token_total(app.snapshot.token_total),
            colors,
        ),
        Line::raw(""),
        heading("HEALTH", colors),
    ];
    if app.snapshot.warnings.is_empty() {
        lines.push(Line::styled(
            "✓ Registries loaded without warnings",
            Style::default().fg(colors.success),
        ));
    } else {
        lines.extend(app.snapshot.warnings.iter().map(|warning| {
            Line::styled(format!("! {warning}"), Style::default().fg(colors.warning))
        }));
    }
    frame.render_widget(
        Paragraph::new(lines)
            .scroll((app.detail_scroll, 0))
            .wrap(Wrap { trim: true })
            .style(Style::default().fg(colors.text).bg(colors.surface))
            .block(panel(" SYSTEM & REGISTRY HEALTH ", true, colors)),
        area,
    );
}

fn draw_settings(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let hidden = Rect::new(area.right(), area.y, 0, area.height);
    let (nav_area, content_area) = if size == Density::Compact {
        if app.focus == Focus::Detail {
            (hidden, area)
        } else {
            (area, hidden)
        }
    } else {
        let columns = Layout::horizontal([Constraint::Length(24), Constraint::Min(30)]).split(area);
        (columns[0], columns[1])
    };
    if nav_area.width > 0 {
        let items = SettingsSection::ALL
            .iter()
            .map(|section| ListItem::new(section.label()))
            .collect();
        selectable(
            frame,
            nav_area,
            items,
            app.settings_section,
            app.focus == Focus::List,
            " SETTINGS ",
            colors,
        );
    }
    if content_area.width == 0 {
        return;
    }
    match app.settings_section() {
        SettingsSection::Appearance => draw_appearance(frame, app, content_area, colors),
        SettingsSection::Sessions => detail(
            frame,
            content_area,
            Text::from(vec![
                heading("Session display", colors),
                Line::raw(""),
                field(
                    "Live preview",
                    if app.preferences.split_preview {
                        "ON"
                    } else {
                        "OFF"
                    },
                    colors,
                ),
                Line::raw(""),
                Line::styled(
                    "Enter / Space toggles and persists split preview.",
                    Style::default().fg(colors.text_muted),
                ),
            ]),
            " SESSION SETTINGS ",
            app,
            colors,
        ),
        SettingsSection::Runtime => detail(
            frame,
            content_area,
            Text::from(vec![
                heading("Registry refresh", colors),
                Line::raw(""),
                field(
                    "Cadence",
                    &format!("{} ms", app.preferences.refresh_ms),
                    colors,
                ),
                Line::raw(""),
                Line::styled(
                    "← / → changes cadence. Enter refreshes now.",
                    Style::default().fg(colors.text_muted),
                ),
            ]),
            " RUNTIME SETTINGS ",
            app,
            colors,
        ),
        SettingsSection::About => detail(
            frame,
            content_area,
            Text::from(vec![
                heading("AGK Native TUI", colors),
                Line::raw(""),
                Line::styled(
                    "Hermes is the agent core. RMUX owns durable terminal sessions. Agentik registries own mission state. This TUI is their native presentation surface.",
                    Style::default().fg(colors.text),
                ),
                Line::raw(""),
                Line::styled(
                    "The renderer never mutates registry files.",
                    Style::default().fg(colors.text_muted),
                ),
            ]),
            " ABOUT ",
            app,
            colors,
        ),
    }
}

fn draw_appearance(frame: &mut Frame, app: &App, area: Rect, colors: Palette) {
    let mut lines = vec![
        heading("Theme", colors),
        Line::styled(
            "↑/↓ or ←/→ live preview · Enter save · Esc revert",
            Style::default().fg(colors.text_muted),
        ),
        Line::raw(""),
    ];
    for theme in Theme::ALL {
        let selected = theme == app.theme;
        let mut spans = vec![
            Span::styled(
                if selected { "▶ " } else { "  " },
                Style::default().fg(colors.accent),
            ),
            Span::styled(
                format!("{:<14}", theme.name()),
                Style::default()
                    .fg(if selected { colors.accent } else { colors.text })
                    .add_modifier(if selected {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
        ];
        for swatch in theme.swatches() {
            spans.push(Span::styled("  ", Style::default().bg(swatch)));
            spans.push(Span::raw(" "));
        }
        lines.push(Line::from(spans));
    }
    lines.extend([
        Line::raw(""),
        Line::styled(app.theme.description(), Style::default().fg(colors.text)),
        Line::styled(
            if app.theme == app.committed_theme {
                "Saved theme"
            } else {
                "Previewing — Enter to persist, Esc to revert"
            },
            Style::default().fg(if app.theme == app.committed_theme {
                colors.success
            } else {
                colors.warning
            }),
        ),
    ]);
    detail(
        frame,
        area,
        Text::from(lines),
        " APPEARANCE · LIVE PREVIEW ",
        app,
        colors,
    );
}

fn draw_help(frame: &mut Frame, app: &App, area: Rect, colors: Palette) {
    let help = Text::from(vec![
        heading("NAVIGATION", colors),
        help_key("1–6", "Sessions, Projects, Agents, OS, MCP, Skills", colors),
        help_key("s  ,  ?", "System, Settings, Help", colors),
        help_key(
            "←/→  h/l",
            "Change view while navigation is focused",
            colors,
        ),
        help_key("↑/↓  k/j", "Move selection or scroll detail", colors),
        help_key(
            "Tab / Shift-Tab",
            "Cycle navigation, list, and detail",
            colors,
        ),
        help_key("Tab Tab", "Quick-expand or restore the detail pane", colors),
        Line::raw(""),
        heading("SESSIONS", colors),
        help_key("Enter", "Open selected RMUX pane fullscreen", colors),
        help_key("Ctrl-g", "Return from terminal to Mission Control", colors),
        help_key("f / F11", "Expand or restore live preview", colors),
        help_key("v", "Toggle persistent split preview", colors),
        help_key("n", "Create via the existing AGK client", colors),
        help_key(
            "h / c / x / t",
            "New Hermes / Claude / Codex / terminal session",
            colors,
        ),
        Line::raw(""),
        heading("COMMANDS", colors),
        help_key("/", "Search; Enter accepts, Esc restores", colors),
        help_key("Ctrl-p", "Command palette", colors),
        help_key("r / F5", "Refresh RMUX and registries", colors),
        help_key("PgUp/PgDn", "Scroll detail, System, or Help", colors),
        Line::raw(""),
        heading("SETTINGS & CONTROL", colors),
        help_key("←/→ ↑/↓", "Live theme preview / refresh cadence", colors),
        help_key("Enter", "Persist selected setting", colors),
        help_key("Esc", "Revert preview, collapse, or clear filter", colors),
        help_key("q", "Detach AGK; work sessions keep running", colors),
    ]);
    frame.render_widget(
        Paragraph::new(help)
            .scroll((app.detail_scroll, 0))
            .wrap(Wrap { trim: false })
            .style(Style::default().fg(colors.text).bg(colors.surface))
            .block(panel(" COMPLETE KEYBOARD REFERENCE ", true, colors)),
        area,
    );
}

fn draw_footer(frame: &mut Frame, app: &App, area: Rect, size: Density, colors: Palette) {
    let rows = Layout::vertical([Constraint::Length(1), Constraint::Length(2)]).split(area);
    let hint = app.status.as_deref().unwrap_or(match app.view {
        View::Sessions => "↑↓ move · Enter open · Tab focus · h Hermes · c Claude · x Codex · t terminal · n menu · / search · q detach",
        View::Settings => "↑↓ select/preview · Tab focus · ←→ change · Enter save · Esc revert · ? help",
        View::Help => "↑↓ or PgUp/PgDn scroll · 1–6 switch · q detach",
        _ => "↑↓ move · Enter detail · Tab focus · / search · r refresh · Ctrl-p palette · ? help · q detach",
    });
    frame.render_widget(
        Paragraph::new(format!(" {hint}")).style(
            Style::default()
                .fg(if app.status.is_some() {
                    colors.info
                } else {
                    colors.text_muted
                })
                .bg(colors.surface_alt),
        ),
        rows[0],
    );
    let session = app.selected_session_name().unwrap_or("—");
    let right = app.footer.right_text();
    if size != Density::Wide {
        let left = compact_context(app, session, rows[1].width as usize);
        frame.render_widget(
            Paragraph::new(vec![
                Line::styled(format!(" {left}"), Style::default().fg(colors.text)),
                Line::styled(format!(" {right}"), Style::default().fg(colors.accent)),
            ])
            .style(Style::default().bg(colors.surface)),
            rows[1],
        );
    } else {
        let right_width = (right.chars().count() as u16 + 1).min(rows[1].width);
        let columns = Layout::horizontal([Constraint::Min(8), Constraint::Length(right_width)])
            .split(rows[1]);
        let left = compact_context(app, session, columns[0].width as usize);
        frame.render_widget(
            Paragraph::new(format!(" {left}"))
                .style(Style::default().fg(colors.text).bg(colors.surface)),
            columns[0],
        );
        frame.render_widget(
            Paragraph::new(format!("{right} "))
                .alignment(Alignment::Right)
                .style(Style::default().fg(colors.accent).bg(colors.surface)),
            columns[1],
        );
    }
}

fn draw_overlay(frame: &mut Frame, app: &App, area: Rect, colors: Palette) {
    let (rect, title, lines) = match &app.overlay {
        Overlay::None => return,
        Overlay::Search { value, .. } => (
            centered(area, 70, 5),
            " SEARCH ",
            vec![
                Line::styled(format!("/{value}▌"), Style::default().fg(colors.text)),
                Line::styled(
                    "Enter accept · Esc restore · Backspace edit",
                    Style::default().fg(colors.text_muted),
                ),
            ],
        ),
        Overlay::Palette { query, selected } => {
            let items = palette_items(query);
            let mut lines = vec![
                Line::from(vec![
                    Span::styled("› ", Style::default().fg(colors.accent)),
                    Span::styled(format!("{query}▌"), Style::default().fg(colors.text)),
                ]),
                Line::raw(""),
            ];
            lines.extend(items.iter().enumerate().map(|(index, item)| {
                Line::from(vec![
                    Span::styled(
                        if index == *selected { "▶ " } else { "  " },
                        Style::default().fg(colors.accent),
                    ),
                    Span::styled(
                        format!("{:<34}", item.label),
                        Style::default()
                            .fg(if index == *selected {
                                colors.selection_text
                            } else {
                                colors.text
                            })
                            .bg(if index == *selected {
                                colors.selection_bg
                            } else {
                                colors.surface_alt
                            }),
                    ),
                    Span::styled(item.hint, Style::default().fg(colors.text_muted)),
                ])
            }));
            (
                centered(area, 68, (items.len() as u16 + 5).min(20)),
                " COMMAND PALETTE · CTRL-P ",
                lines,
            )
        }
        Overlay::NewKind { selected } => (
            centered(area, 46, 9),
            " NEW SESSION · TYPE ",
            SessionKind::ALL
                .iter()
                .enumerate()
                .map(|(index, kind)| {
                    Line::from(vec![
                        Span::styled(
                            if index == *selected { "▶ " } else { "  " },
                            Style::default().fg(colors.accent),
                        ),
                        Span::styled(kind.label(), Style::default().fg(colors.text)),
                    ])
                })
                .collect(),
        ),
        Overlay::NewName { kind, value } => (
            centered(area, 56, 7),
            " NEW SESSION · NAME ",
            vec![
                field("Type", kind.label(), colors),
                Line::raw(""),
                Line::styled(format!("> {value}▌"), Style::default().fg(colors.text)),
                Line::styled(
                    "Letters, numbers, - and _ · Enter create · Esc cancel",
                    Style::default().fg(colors.text_muted),
                ),
            ],
        ),
    };
    frame.render_widget(Clear, rect);
    frame.render_widget(
        Paragraph::new(lines)
            .wrap(Wrap { trim: true })
            .style(Style::default().fg(colors.text).bg(colors.surface_alt))
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title(title)
                    .border_style(Style::default().fg(colors.accent)),
            ),
        rect,
    );
}

fn selectable(
    frame: &mut Frame,
    area: Rect,
    items: Vec<ListItem<'static>>,
    selected: usize,
    focused: bool,
    title: &str,
    colors: Palette,
) {
    let empty = items.is_empty();
    let items = if empty {
        vec![ListItem::new(Line::styled(
            "No matching records",
            Style::default().fg(colors.text_muted),
        ))]
    } else {
        items
    };
    let mut state = ListState::default().with_selected((!empty).then_some(selected));
    let list = List::new(items)
        .style(Style::default().fg(colors.text).bg(colors.surface))
        .block(panel(title, focused, colors))
        .highlight_style(
            Style::default()
                .fg(colors.selection_text)
                .bg(colors.selection_bg)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");
    frame.render_stateful_widget(list, area, &mut state);
}

fn detail(
    frame: &mut Frame,
    area: Rect,
    text: Text<'static>,
    title: &str,
    app: &App,
    colors: Palette,
) {
    frame.render_widget(
        Paragraph::new(text)
            .scroll((app.detail_scroll, 0))
            .wrap(Wrap { trim: true })
            .style(Style::default().fg(colors.text).bg(colors.surface))
            .block(panel(title, app.focus == Focus::Detail, colors)),
        area,
    );
}

fn panel<'a>(title: &'a str, focused: bool, colors: Palette) -> Block<'a> {
    Block::default()
        .borders(Borders::ALL)
        .title(title)
        .style(Style::default().bg(colors.surface))
        .border_style(Style::default().fg(if focused {
            colors.border_focused
        } else {
            colors.border
        }))
}

fn field(label: &str, value: &str, colors: Palette) -> Line<'static> {
    Line::from(vec![
        Span::styled(
            format!("{label:<14}"),
            Style::default().fg(colors.text_muted),
        ),
        Span::styled(value.to_owned(), Style::default().fg(colors.text)),
    ])
}

fn heading(label: &str, colors: Palette) -> Line<'static> {
    Line::styled(
        label.to_owned(),
        Style::default()
            .fg(colors.accent)
            .add_modifier(Modifier::BOLD),
    )
}

fn help_key(key: &str, description: &str, colors: Palette) -> Line<'static> {
    Line::from(vec![
        Span::styled(
            format!("  {key:<18}"),
            Style::default()
                .fg(colors.accent_alt)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(description.to_owned(), Style::default().fg(colors.text)),
    ])
}

fn join(values: &[String]) -> String {
    if values.is_empty() {
        "—".into()
    } else {
        values.join(", ")
    }
}

fn kind_color(kind: &str, colors: Palette) -> Color {
    match kind.to_ascii_lowercase().as_str() {
        "client" => colors.info,
        "project" => colors.accent_alt,
        "mission" => colors.accent,
        _ => colors.text_muted,
    }
}

fn status_color(status: &str, colors: Palette) -> Color {
    match status.to_ascii_lowercase().as_str() {
        "active" | "available" | "configured" | "live" | "running" => colors.success,
        "failed" | "error" | "unavailable" => colors.error,
        _ => colors.warning,
    }
}

fn centered(area: Rect, width_percent: u16, height: u16) -> Rect {
    let width = area
        .width
        .saturating_mul(width_percent)
        .saturating_div(100)
        .clamp(20.min(area.width), area.width);
    let height = height.min(area.height);
    Rect::new(
        area.x + area.width.saturating_sub(width) / 2,
        area.y + area.height.saturating_sub(height) / 2,
        width,
        height,
    )
}

fn compact_context(app: &App, session: &str, width: usize) -> String {
    const FIXED_WIDTH: usize = 20;
    let full = app.footer.left_text(Some(session));
    if full.chars().count() <= width {
        return full;
    }
    let cwd = app
        .footer
        .cwd
        .as_deref()
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|| UNKNOWN.into());
    let branch = app.footer.git_branch.as_deref().unwrap_or(UNKNOWN);
    let value_width = width.saturating_sub(FIXED_WIDTH) / 3;
    format!(
        "CWD {}  GIT {}  SESSION {}",
        abbreviate(&cwd, value_width),
        abbreviate(branch, value_width),
        abbreviate(session, value_width),
    )
}

fn abbreviate(value: &str, width: usize) -> String {
    let characters = value.chars().collect::<Vec<_>>();
    if characters.len() <= width {
        return value.into();
    }
    if width == 0 {
        return String::new();
    }
    if width <= 2 {
        return "…".repeat(width);
    }
    let left = (width - 1) / 2;
    let right = width - left - 1;
    characters[..left]
        .iter()
        .chain(std::iter::once(&'…'))
        .chain(characters[characters.len() - right..].iter())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{RegistrySnapshot, RuntimeRecord};
    use crate::theme::Preferences;
    use ratatui::{Terminal, backend::TestBackend};

    fn test_app() -> App {
        let mut app = App::new("mission".into(), Preferences::default());
        app.set_snapshot(RegistrySnapshot {
            runtimes: vec![RuntimeRecord {
                id: "runtime-moon".into(),
                name: "moon".into(),
                kind: "hermes".into(),
                environment: "mission".into(),
                client: Some("acme".into()),
                project: Some("luna".into()),
                mission: Some("launch".into()),
                native_session: Some("hermes-moon".into()),
                rmux_session: "mission-moon-hermes".into(),
                cwd: "/work/luna".into(),
                status: "active".into(),
                created_at: 1.0,
                last_activity: 2.0,
                tokens: 12_300,
                managed: true,
                live: true,
            }],
            ..RegistrySnapshot::default()
        });
        app.footer.cwd = Some("/work/hermes-agent".into());
        app.footer.git_branch = Some("agk/native".into());
        app.footer.cpu_percent = Some(12.0);
        app.footer.ram_percent = Some(34.0);
        app.footer.disk_percent = Some(56.0);
        app.footer.session_count = 2;
        app.footer.token_total = 12_300;
        app.footer.local_time = "13:37:00".into();
        app
    }

    fn render(mut app: App, width: u16, height: u16) -> String {
        let backend = TestBackend::new(width, height);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal.draw(|frame| draw(frame, &mut app, None)).unwrap();
        terminal
            .backend()
            .buffer()
            .content
            .iter()
            .map(|cell| cell.symbol())
            .collect()
    }

    #[test]
    fn every_view_renders_at_every_density() {
        for view in View::ALL {
            for (width, height) in [(60, 16), (90, 24), (140, 40)] {
                let mut app = test_app();
                app.set_view(view);
                assert!(render(app, width, height).contains("AGK"));
            }
        }
    }

    #[test]
    fn footer_has_all_required_fields() {
        let output = render(test_app(), 160, 32);
        for value in [
            "/work/hermes-agent",
            "GIT agk/native",
            "SESSION moon",
            "TKN 12.3K",
            "CPU 12%",
            "RAM 34%",
            "DSK 56%",
            "SESS 2",
            "13:37:00",
        ] {
            assert!(output.contains(value), "missing {value:?}");
        }
    }

    #[test]
    fn settings_uses_left_navigation_and_live_theme_content() {
        let mut app = test_app();
        app.set_view(View::Settings);
        let output = render(app, 140, 40);
        assert!(output.contains("Appearance"));
        assert!(output.contains("APPEARANCE · LIVE PREVIEW"));
        assert!(output.contains("AGK Gold"));
        assert!(output.contains("Matrix"));
    }

    #[test]
    fn help_documents_all_interaction_layers() {
        let mut app = test_app();
        app.set_view(View::Help);
        let output = render(app, 140, 48);
        for value in ["Tab / Shift-Tab", "Ctrl-g", "Ctrl-p", "Esc", "F11", "Enter"] {
            assert!(output.contains(value), "missing {value:?}");
        }
    }

    #[test]
    fn terminal_mode_is_full_screen() {
        let mut app = test_app();
        app.mode = Mode::Terminal;
        let output = render(app, 100, 28);
        assert!(output.contains("Ctrl-g"));
        assert!(!output.contains("MISSION CONTROL"));
    }

    #[test]
    fn hidden_split_still_allows_focused_live_preview() {
        let mut app = test_app();
        app.preferences.split_preview = false;
        app.focus = Focus::Detail;
        let output = render(app, 100, 28);
        assert!(output.contains("moon · LIVE PREVIEW"));
        assert!(!output.contains("SESSIONS · 1"));
    }

    #[test]
    fn standard_footer_keeps_both_sides_and_all_labels_visible() {
        let output = render(test_app(), 80, 24);
        for value in [
            "CWD ", "GIT ", "SESSION ", "TKN ", "CPU ", "RAM ", "DSK ", "SESS ",
        ] {
            assert!(output.contains(value), "missing {value:?}");
        }
    }
}
