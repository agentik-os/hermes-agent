use std::time::Instant;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::model::{App, Focus, Overlay, SessionKind, SettingsSection, View};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Action {
    None,
    Quit,
    Refresh,
    PersistPreferences,
    EnterTerminal,
    CreateSession { kind: SessionKind, name: String },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PaletteCommand {
    Open(View),
    NewSession,
    TogglePreview,
    Refresh,
    Quit,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PaletteItem {
    pub label: &'static str,
    pub hint: &'static str,
    pub command: PaletteCommand,
}

const PALETTE_ITEMS: [PaletteItem; 13] = [
    PaletteItem {
        label: "Open Sessions",
        hint: "1",
        command: PaletteCommand::Open(View::Sessions),
    },
    PaletteItem {
        label: "Open Projects & Missions",
        hint: "2",
        command: PaletteCommand::Open(View::Projects),
    },
    PaletteItem {
        label: "Open Agents",
        hint: "3",
        command: PaletteCommand::Open(View::Agents),
    },
    PaletteItem {
        label: "Open Agentik OS",
        hint: "4",
        command: PaletteCommand::Open(View::Os),
    },
    PaletteItem {
        label: "Open MCP servers",
        hint: "5",
        command: PaletteCommand::Open(View::Mcp),
    },
    PaletteItem {
        label: "Open Skills",
        hint: "6",
        command: PaletteCommand::Open(View::Skills),
    },
    PaletteItem {
        label: "Open System",
        hint: "s",
        command: PaletteCommand::Open(View::System),
    },
    PaletteItem {
        label: "Open Settings",
        hint: ",",
        command: PaletteCommand::Open(View::Settings),
    },
    PaletteItem {
        label: "Open Help",
        hint: "?",
        command: PaletteCommand::Open(View::Help),
    },
    PaletteItem {
        label: "New session",
        hint: "n",
        command: PaletteCommand::NewSession,
    },
    PaletteItem {
        label: "Toggle live preview",
        hint: "v",
        command: PaletteCommand::TogglePreview,
    },
    PaletteItem {
        label: "Refresh registries",
        hint: "r",
        command: PaletteCommand::Refresh,
    },
    PaletteItem {
        label: "Detach AGK",
        hint: "q",
        command: PaletteCommand::Quit,
    },
];

pub fn palette_items(query: &str) -> Vec<PaletteItem> {
    let terms = query
        .split_whitespace()
        .map(str::to_ascii_lowercase)
        .collect::<Vec<_>>();
    PALETTE_ITEMS
        .iter()
        .copied()
        .filter(|item| {
            let haystack = format!("{} {}", item.label, item.hint).to_ascii_lowercase();
            terms.iter().all(|term| haystack.contains(term))
        })
        .collect()
}

pub fn handle_key(app: &mut App, key: KeyEvent, detail_available: bool) -> Action {
    if app.overlay.is_open() {
        return handle_overlay_key(app, key);
    }

    if key.modifiers == KeyModifiers::CONTROL && key.code == KeyCode::Char('p') {
        app.overlay = Overlay::Palette {
            query: String::new(),
            selected: 0,
        };
        return Action::None;
    }
    if key.modifiers == KeyModifiers::CONTROL && key.code == KeyCode::Char('r') {
        app.status = Some("Reloading AGK and RMUX state".into());
        return Action::Refresh;
    }

    let plain = !key.modifiers.intersects(
        KeyModifiers::CONTROL
            | KeyModifiers::ALT
            | KeyModifiers::SUPER
            | KeyModifiers::HYPER
            | KeyModifiers::META,
    );
    if !plain {
        return Action::None;
    }

    match key.code {
        KeyCode::Char('q') => Action::Quit,
        KeyCode::Char('1') => set_view(app, View::Sessions),
        KeyCode::Char('2') => set_view(app, View::Projects),
        KeyCode::Char('3') => set_view(app, View::Agents),
        KeyCode::Char('4') => set_view(app, View::Os),
        KeyCode::Char('5') => set_view(app, View::Mcp),
        KeyCode::Char('6') => set_view(app, View::Skills),
        KeyCode::Char('s') => set_view(app, View::System),
        KeyCode::Char(',') => set_view(app, View::Settings),
        KeyCode::Char('?') => set_view(app, View::Help),
        KeyCode::Char('/') => {
            app.overlay = Overlay::Search {
                value: app.query.clone(),
                original: app.query.clone(),
            };
            Action::None
        }
        KeyCode::Char('n') => {
            app.overlay = Overlay::NewKind { selected: 0 };
            Action::None
        }
        KeyCode::Char('h') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::Hermes)
        }
        KeyCode::Char('c') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::Claude)
        }
        KeyCode::Char('x') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::Codex)
        }
        KeyCode::Char('o') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::OpenRouter)
        }
        KeyCode::Char('k') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::OpenCode)
        }
        KeyCode::Char('t') if app.view == View::Sessions && app.focus == Focus::List => {
            new_session_name(app, SessionKind::Shell)
        }
        KeyCode::Char('r') | KeyCode::F(5) => Action::Refresh,
        KeyCode::Tab => {
            app.tab(Instant::now(), detail_available);
            Action::None
        }
        KeyCode::BackTab => {
            app.back_tab(detail_available);
            Action::None
        }
        KeyCode::Left | KeyCode::Char('h') if app.focus == Focus::Nav => {
            app.previous_view();
            Action::None
        }
        KeyCode::Right | KeyCode::Char('l') if app.focus == Focus::Nav => {
            app.next_view();
            Action::None
        }
        KeyCode::Down | KeyCode::Char('j') if app.focus == Focus::Nav => {
            app.focus = Focus::List;
            Action::None
        }
        KeyCode::Up | KeyCode::Char('k') if app.focus == Focus::List => {
            if app.selection_is_first() {
                app.focus = Focus::Nav;
            } else {
                app.select_previous();
            }
            Action::None
        }
        KeyCode::Down | KeyCode::Char('j') if app.focus == Focus::List => {
            app.select_next();
            Action::None
        }
        KeyCode::Up | KeyCode::Char('k') if app.focus == Focus::Detail => {
            if app.view == View::Settings && app.settings_section() == SettingsSection::Appearance {
                app.preview_previous_theme();
            } else {
                app.detail_scroll = app.detail_scroll.saturating_sub(1);
            }
            Action::None
        }
        KeyCode::Down | KeyCode::Char('j') if app.focus == Focus::Detail => {
            if app.view == View::Settings && app.settings_section() == SettingsSection::Appearance {
                app.preview_next_theme();
            } else {
                app.detail_scroll = app.detail_scroll.saturating_add(1);
            }
            Action::None
        }
        KeyCode::PageUp if app.focus == Focus::Detail => {
            app.detail_scroll = app.detail_scroll.saturating_sub(8);
            Action::None
        }
        KeyCode::PageDown if app.focus == Focus::Detail => {
            app.detail_scroll = app.detail_scroll.saturating_add(8);
            Action::None
        }
        KeyCode::Home if app.focus == Focus::Detail => {
            app.detail_scroll = 0;
            Action::None
        }
        KeyCode::Char('f') | KeyCode::F(11)
            if app.view == View::Sessions && app.current_session().is_some() =>
        {
            app.focus = Focus::Detail;
            app.expanded = !app.expanded;
            Action::None
        }
        KeyCode::Char('v') if app.view == View::Sessions => toggle_preview(app),
        KeyCode::Left | KeyCode::Char('h')
            if app.view == View::Settings && app.focus == Focus::Detail =>
        {
            settings_left(app)
        }
        KeyCode::Right | KeyCode::Char('l')
            if app.view == View::Settings && app.focus == Focus::Detail =>
        {
            settings_right(app)
        }
        KeyCode::Char(' ') if app.view == View::Settings && app.focus == Focus::Detail => {
            activate_settings(app)
        }
        KeyCode::Enter if app.focus == Focus::Nav => {
            app.focus = Focus::List;
            Action::None
        }
        KeyCode::Enter if app.view == View::Settings && app.focus == Focus::List => {
            app.focus = Focus::Detail;
            Action::None
        }
        KeyCode::Enter if app.view == View::Settings => activate_settings(app),
        KeyCode::Enter if app.view == View::Sessions => {
            if app.current_session().is_some() {
                Action::EnterTerminal
            } else {
                app.status = Some("No session selected".into());
                Action::None
            }
        }
        KeyCode::Enter if app.view == View::Agents => {
            let runtime = app.current_agent().map(|agent| agent.runtime_name.clone());
            if runtime
                .as_deref()
                .is_some_and(|name| app.select_session_by_name(name))
            {
                app.status = Some("Opened linked runtime".into());
            } else {
                app.focus = Focus::Detail;
            }
            Action::None
        }
        KeyCode::Enter => {
            app.focus = Focus::Detail;
            Action::None
        }
        KeyCode::Esc => {
            if app.view == View::Settings
                && app.focus == Focus::Detail
                && app.settings_section() == SettingsSection::Appearance
            {
                app.cancel_theme_preview();
                app.status = Some("Theme preview reverted".into());
                return Action::None;
            }
            if app.expanded {
                app.expanded = false;
            } else if !app.query.is_empty() {
                app.query.clear();
                app.selected = 0;
            } else {
                app.focus = Focus::List;
            }
            Action::None
        }
        _ => Action::None,
    }
}

fn new_session_name(app: &mut App, kind: SessionKind) -> Action {
    app.overlay = Overlay::NewName {
        kind,
        value: String::new(),
    };
    Action::None
}

fn handle_overlay_key(app: &mut App, key: KeyEvent) -> Action {
    let overlay = std::mem::replace(&mut app.overlay, Overlay::None);
    match overlay {
        Overlay::Search {
            mut value,
            original,
        } => match key.code {
            KeyCode::Esc => {
                app.query = original;
                app.selected = 0;
                Action::None
            }
            KeyCode::Enter => {
                app.query = value;
                app.selected = 0;
                Action::None
            }
            KeyCode::Backspace => {
                value.pop();
                app.query.clone_from(&value);
                app.selected = 0;
                app.overlay = Overlay::Search { value, original };
                Action::None
            }
            KeyCode::Char(character) if printable(key.modifiers) => {
                value.push(character);
                app.query.clone_from(&value);
                app.selected = 0;
                app.overlay = Overlay::Search { value, original };
                Action::None
            }
            _ => {
                app.overlay = Overlay::Search { value, original };
                Action::None
            }
        },
        Overlay::Palette {
            mut query,
            mut selected,
        } => match key.code {
            KeyCode::Esc => Action::None,
            KeyCode::Up => {
                selected = selected.saturating_sub(1);
                app.overlay = Overlay::Palette { query, selected };
                Action::None
            }
            KeyCode::Down => {
                selected = (selected + 1).min(palette_items(&query).len().saturating_sub(1));
                app.overlay = Overlay::Palette { query, selected };
                Action::None
            }
            KeyCode::Backspace => {
                query.pop();
                selected = selected.min(palette_items(&query).len().saturating_sub(1));
                app.overlay = Overlay::Palette { query, selected };
                Action::None
            }
            KeyCode::Char(character) if printable(key.modifiers) => {
                query.push(character);
                selected = 0;
                app.overlay = Overlay::Palette { query, selected };
                Action::None
            }
            KeyCode::Enter => palette_items(&query)
                .get(selected)
                .map(|item| execute_palette(app, item.command))
                .unwrap_or(Action::None),
            _ => {
                app.overlay = Overlay::Palette { query, selected };
                Action::None
            }
        },
        Overlay::NewKind { mut selected } => match key.code {
            KeyCode::Esc => Action::None,
            KeyCode::Up => {
                selected = selected.saturating_sub(1);
                app.overlay = Overlay::NewKind { selected };
                Action::None
            }
            KeyCode::Down => {
                selected = (selected + 1).min(SessionKind::ALL.len() - 1);
                app.overlay = Overlay::NewKind { selected };
                Action::None
            }
            KeyCode::Enter => {
                app.overlay = Overlay::NewName {
                    kind: SessionKind::ALL[selected],
                    value: String::new(),
                };
                Action::None
            }
            _ => {
                app.overlay = Overlay::NewKind { selected };
                Action::None
            }
        },
        Overlay::NewName { kind, mut value } => match key.code {
            KeyCode::Esc => Action::None,
            KeyCode::Backspace => {
                value.pop();
                app.overlay = Overlay::NewName { kind, value };
                Action::None
            }
            KeyCode::Char(character)
                if printable(key.modifiers)
                    && (character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
                    && value.len() < 64 =>
            {
                value.push(character.to_ascii_lowercase());
                app.overlay = Overlay::NewName { kind, value };
                Action::None
            }
            KeyCode::Enter if !value.is_empty() => Action::CreateSession { kind, name: value },
            _ => {
                app.overlay = Overlay::NewName { kind, value };
                Action::None
            }
        },
        Overlay::None => Action::None,
    }
}

fn execute_palette(app: &mut App, command: PaletteCommand) -> Action {
    match command {
        PaletteCommand::Open(view) => set_view(app, view),
        PaletteCommand::NewSession => {
            app.overlay = Overlay::NewKind { selected: 0 };
            Action::None
        }
        PaletteCommand::TogglePreview => toggle_preview(app),
        PaletteCommand::Refresh => Action::Refresh,
        PaletteCommand::Quit => Action::Quit,
    }
}

fn set_view(app: &mut App, view: View) -> Action {
    app.set_view(view);
    Action::None
}

fn toggle_preview(app: &mut App) -> Action {
    app.preferences.split_preview = !app.preferences.split_preview;
    app.status = Some(
        if app.preferences.split_preview {
            "Live preview enabled"
        } else {
            "Live preview hidden"
        }
        .into(),
    );
    Action::PersistPreferences
}

fn activate_settings(app: &mut App) -> Action {
    match app.settings_section() {
        SettingsSection::Appearance => {
            app.commit_theme();
            Action::PersistPreferences
        }
        SettingsSection::Sessions => toggle_preview(app),
        SettingsSection::Runtime => Action::Refresh,
        SettingsSection::About => Action::None,
    }
}

fn settings_left(app: &mut App) -> Action {
    match app.settings_section() {
        SettingsSection::Appearance => {
            app.preview_previous_theme();
            Action::None
        }
        SettingsSection::Runtime => {
            cycle_refresh(app, false);
            Action::PersistPreferences
        }
        _ => Action::None,
    }
}

fn settings_right(app: &mut App) -> Action {
    match app.settings_section() {
        SettingsSection::Appearance => {
            app.preview_next_theme();
            Action::None
        }
        SettingsSection::Runtime => {
            cycle_refresh(app, true);
            Action::PersistPreferences
        }
        _ => Action::None,
    }
}

fn cycle_refresh(app: &mut App, forwards: bool) {
    const VALUES: [u64; 4] = [250, 500, 1_000, 2_000];
    let index = VALUES
        .iter()
        .position(|value| *value == app.preferences.refresh_ms)
        .unwrap_or(2);
    app.preferences.refresh_ms = if forwards {
        VALUES[(index + 1) % VALUES.len()]
    } else {
        VALUES[(index + VALUES.len() - 1) % VALUES.len()]
    };
    app.status = Some(format!("Refresh every {} ms", app.preferences.refresh_ms));
}

fn printable(modifiers: KeyModifiers) -> bool {
    !modifiers.intersects(
        KeyModifiers::CONTROL
            | KeyModifiers::ALT
            | KeyModifiers::SUPER
            | KeyModifiers::HYPER
            | KeyModifiers::META,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{RegistrySnapshot, RuntimeRecord};
    use crate::theme::Preferences;

    fn app() -> App {
        App::new("mission".into(), Preferences::default())
    }

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    fn add_session(app: &mut App) {
        app.set_snapshot(RegistrySnapshot {
            runtimes: vec![RuntimeRecord {
                id: "runtime-moon".into(),
                name: "moon".into(),
                kind: "hermes".into(),
                environment: "mission".into(),
                client: None,
                project: None,
                mission: None,
                native_session: None,
                rmux_session: "mission-moon-hermes".into(),
                cwd: "/work".into(),
                status: "active".into(),
                created_at: 1.0,
                last_activity: 2.0,
                tokens: 0,
                managed: true,
                live: true,
            }],
            ..RegistrySnapshot::default()
        });
    }

    #[test]
    fn every_advertised_view_shortcut_opens_its_view() {
        let cases = [
            ('1', View::Sessions),
            ('2', View::Projects),
            ('3', View::Agents),
            ('4', View::Os),
            ('5', View::Mcp),
            ('6', View::Skills),
            ('s', View::System),
            (',', View::Settings),
            ('?', View::Help),
        ];
        for (character, view) in cases {
            let mut app = app();
            handle_key(&mut app, key(KeyCode::Char(character)), true);
            assert_eq!(app.view, view);
        }
    }

    #[test]
    fn control_r_requests_a_full_registry_reload() {
        let mut app = app();
        assert_eq!(
            handle_key(
                &mut app,
                KeyEvent::new(KeyCode::Char('r'), KeyModifiers::CONTROL),
                true,
            ),
            Action::Refresh
        );
        assert!(
            app.status
                .as_deref()
                .is_some_and(|value| value.contains("Reloading"))
        );
    }

    #[test]
    fn overlay_captures_q_and_search_escape_restores_original_filter() {
        let mut app = app();
        app.query = "old".into();
        handle_key(&mut app, key(KeyCode::Char('/')), true);
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Char('q')), true),
            Action::None
        );
        assert_eq!(app.query, "oldq");
        handle_key(&mut app, key(KeyCode::Esc), true);
        assert_eq!(app.query, "old");
        assert!(!app.overlay.is_open());
    }

    #[test]
    fn palette_filters_and_executes_without_leaking_shortcuts() {
        let mut app = app();
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('p'), KeyModifiers::CONTROL),
            true,
        );
        for character in "settings".chars() {
            handle_key(&mut app, key(KeyCode::Char(character)), true);
        }
        handle_key(&mut app, key(KeyCode::Enter), true);
        assert_eq!(app.view, View::Settings);
        assert!(!app.overlay.is_open());
    }

    #[test]
    fn new_session_flow_returns_a_validated_side_effect() {
        let mut app = app();
        handle_key(&mut app, key(KeyCode::Char('n')), true);
        handle_key(&mut app, key(KeyCode::Down), true);
        handle_key(&mut app, key(KeyCode::Enter), true);
        for character in "Moon_1 !".chars() {
            handle_key(&mut app, key(KeyCode::Char(character)), true);
        }
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Enter), true),
            Action::CreateSession {
                kind: SessionKind::Claude,
                name: "moon_1".into()
            }
        );
    }

    #[test]
    fn settings_theme_is_live_then_cancelled_or_committed() {
        let mut app = app();
        app.set_view(View::Settings);
        app.focus = Focus::Detail;
        let initial = app.theme;
        handle_key(&mut app, key(KeyCode::Right), true);
        assert_ne!(app.theme, initial);
        handle_key(&mut app, key(KeyCode::Esc), true);
        assert_eq!(app.theme, initial);
        handle_key(&mut app, key(KeyCode::Right), true);
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Enter), true),
            Action::PersistPreferences
        );
        assert_eq!(app.committed_theme, app.theme);
    }

    #[test]
    fn session_shortcuts_toggle_preview_expand_and_enter_terminal() {
        let mut app = app();
        add_session(&mut app);
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Char('v')), true),
            Action::PersistPreferences
        );
        assert!(!app.preferences.split_preview);
        handle_key(&mut app, key(KeyCode::Char('f')), true);
        assert!(app.expanded);
        assert_eq!(app.focus, Focus::Detail);
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Enter), true),
            Action::EnterTerminal
        );
    }

    #[test]
    fn direct_session_shortcuts_open_the_correct_name_dialog() {
        for (key_code, expected) in [
            (KeyCode::Char('h'), SessionKind::Hermes),
            (KeyCode::Char('c'), SessionKind::Claude),
            (KeyCode::Char('x'), SessionKind::Codex),
            (KeyCode::Char('o'), SessionKind::OpenRouter),
            (KeyCode::Char('k'), SessionKind::OpenCode),
            (KeyCode::Char('t'), SessionKind::Shell),
        ] {
            let mut app = app();
            app.focus = Focus::List;
            handle_key(&mut app, key(key_code), true);
            assert_eq!(
                app.overlay,
                Overlay::NewName {
                    kind: expected,
                    value: String::new(),
                }
            );
        }
    }

    #[test]
    fn settings_runtime_arrows_persist_refresh_cadence() {
        let mut app = app();
        app.set_view(View::Settings);
        app.settings_section = 2;
        app.focus = Focus::Detail;
        let initial = app.preferences.refresh_ms;
        assert_eq!(
            handle_key(&mut app, key(KeyCode::Right), true),
            Action::PersistPreferences
        );
        assert_ne!(app.preferences.refresh_ms, initial);
    }
}
