use std::time::{Duration, Instant};

use crate::{
    data::{
        AgentRecord, CapabilityRecord, ControlObject, OsPackage, RegistrySnapshot, RuntimeRecord,
        SkillRecord,
    },
    system_info::FooterSnapshot,
    theme::{Preferences, Theme},
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum View {
    Sessions,
    Projects,
    Agents,
    Os,
    Mcp,
    Skills,
    System,
    Settings,
    Help,
}

impl View {
    pub const ALL: [Self; 9] = [
        Self::Sessions,
        Self::Projects,
        Self::Agents,
        Self::Os,
        Self::Mcp,
        Self::Skills,
        Self::System,
        Self::Settings,
        Self::Help,
    ];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Sessions => "SESSIONS",
            Self::Projects => "PROJECTS",
            Self::Agents => "AGENTS",
            Self::Os => "OS",
            Self::Mcp => "MCP",
            Self::Skills => "SKILLS",
            Self::System => "SYSTEM",
            Self::Settings => "SETTINGS",
            Self::Help => "HELP",
        }
    }

    pub const fn hotkey(self) -> &'static str {
        match self {
            Self::Sessions => "1",
            Self::Projects => "2",
            Self::Agents => "3",
            Self::Os => "4",
            Self::Mcp => "5",
            Self::Skills => "6",
            Self::System => "s",
            Self::Settings => ",",
            Self::Help => "?",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Focus {
    Nav,
    List,
    Detail,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Mode {
    Control,
    Terminal,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Density {
    Compact,
    Standard,
    Wide,
}

pub fn density(width: u16, height: u16) -> Density {
    if width < 72 || height < 18 {
        Density::Compact
    } else if width < 120 || height < 28 {
        Density::Standard
    } else {
        Density::Wide
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SettingsSection {
    Appearance,
    Sessions,
    Runtime,
    About,
}

impl SettingsSection {
    pub const ALL: [Self; 4] = [Self::Appearance, Self::Sessions, Self::Runtime, Self::About];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Appearance => "Appearance",
            Self::Sessions => "Sessions",
            Self::Runtime => "Runtime",
            Self::About => "About",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SessionKind {
    Hermes,
    Claude,
    Codex,
    Shell,
}

impl SessionKind {
    pub const ALL: [Self; 4] = [Self::Hermes, Self::Claude, Self::Codex, Self::Shell];

    pub const fn slug(self) -> &'static str {
        match self {
            Self::Hermes => "hermes",
            Self::Claude => "claude",
            Self::Codex => "codex",
            Self::Shell => "shell",
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::Hermes => "Hermes",
            Self::Claude => "Claude",
            Self::Codex => "Codex",
            Self::Shell => "Terminal",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Overlay {
    None,
    Search { value: String, original: String },
    Palette { query: String, selected: usize },
    NewKind { selected: usize },
    NewName { kind: SessionKind, value: String },
}

impl Overlay {
    pub const fn is_open(&self) -> bool {
        !matches!(self, Self::None)
    }
}

#[derive(Debug)]
pub struct App {
    pub environment: String,
    pub mode: Mode,
    pub view: View,
    pub focus: Focus,
    pub snapshot: RegistrySnapshot,
    pub selected: usize,
    pub query: String,
    pub overlay: Overlay,
    pub expanded: bool,
    pub preferences: Preferences,
    pub theme: Theme,
    pub committed_theme: Theme,
    pub settings_section: usize,
    pub detail_scroll: u16,
    pub status: Option<String>,
    pub footer: FooterSnapshot,
    pub preview_width: u16,
    pub preview_height: u16,
    last_session: Option<String>,
    last_tab: Option<Instant>,
}

impl App {
    pub fn new(environment: String, preferences: Preferences) -> Self {
        let theme = preferences.theme;
        Self {
            environment,
            mode: Mode::Control,
            view: View::Sessions,
            focus: Focus::List,
            snapshot: RegistrySnapshot::default(),
            selected: 0,
            query: String::new(),
            overlay: Overlay::None,
            expanded: false,
            preferences,
            theme,
            committed_theme: theme,
            settings_section: 0,
            detail_scroll: 0,
            status: None,
            footer: FooterSnapshot::default(),
            preview_width: 0,
            preview_height: 0,
            last_session: None,
            last_tab: None,
        }
    }

    pub fn set_view(&mut self, view: View) {
        if self.view == View::Sessions
            && let Some(name) = self.current_session().map(|item| item.name.clone())
        {
            self.last_session = Some(name);
        }
        if self.view == View::Settings && view != View::Settings {
            self.cancel_theme_preview();
        }
        self.view = view;
        self.query.clear();
        self.selected = if view == View::Sessions {
            self.last_session
                .as_deref()
                .and_then(|name| {
                    self.snapshot
                        .runtimes
                        .iter()
                        .position(|item| item.name == name)
                })
                .unwrap_or_default()
        } else {
            0
        };
        self.detail_scroll = 0;
        self.expanded = false;
        self.focus = if view == View::Help {
            Focus::Detail
        } else {
            Focus::List
        };
        self.last_tab = None;
    }

    pub fn next_view(&mut self) {
        let index = View::ALL
            .iter()
            .position(|view| *view == self.view)
            .unwrap_or(0);
        self.set_view(View::ALL[(index + 1) % View::ALL.len()]);
        self.focus = Focus::Nav;
    }

    pub fn previous_view(&mut self) {
        let index = View::ALL
            .iter()
            .position(|view| *view == self.view)
            .unwrap_or(0);
        self.set_view(View::ALL[(index + View::ALL.len() - 1) % View::ALL.len()]);
        self.focus = Focus::Nav;
    }

    pub fn set_snapshot(&mut self, snapshot: RegistrySnapshot) {
        let identity = self.current_key();
        self.snapshot = snapshot;
        self.selected = identity
            .and_then(|key| {
                self.visible_keys()
                    .iter()
                    .position(|candidate| candidate == &key)
            })
            .unwrap_or_else(|| self.selected.min(self.visible_len().saturating_sub(1)));
        self.remember_current_session();
    }

    pub fn visible_len(&self) -> usize {
        match self.view {
            View::Sessions => self.filtered_sessions().count(),
            View::Projects => self.filtered_objects().count(),
            View::Agents => self.filtered_agents().count(),
            View::Os => self.filtered_os().count(),
            View::Mcp => self.filtered_mcp().count(),
            View::Skills => self.filtered_skills().count(),
            View::Settings => SettingsSection::ALL.len(),
            View::System | View::Help => 1,
        }
    }

    pub fn select_next(&mut self) {
        if self.view == View::Settings && self.focus == Focus::List {
            self.settings_section =
                (self.settings_section + 1).min(SettingsSection::ALL.len().saturating_sub(1));
            return;
        }
        let len = self.visible_len();
        if len > 0 {
            self.selected = (self.selected + 1).min(len - 1);
            self.detail_scroll = 0;
            self.remember_current_session();
        }
    }

    pub fn select_previous(&mut self) {
        if self.view == View::Settings && self.focus == Focus::List {
            self.settings_section = self.settings_section.saturating_sub(1);
            return;
        }
        self.selected = self.selected.saturating_sub(1);
        self.detail_scroll = 0;
        self.remember_current_session();
    }

    pub fn selection_is_first(&self) -> bool {
        if self.view == View::Settings && self.focus == Focus::List {
            self.settings_section == 0
        } else {
            self.selected == 0
        }
    }

    pub fn current_session(&self) -> Option<&RuntimeRecord> {
        self.filtered_sessions().nth(self.selected)
    }

    pub fn selected_session_name(&self) -> Option<&str> {
        if self.view == View::Sessions {
            self.current_session().map(|item| item.name.as_str())
        } else {
            self.last_session.as_deref()
        }
    }

    pub fn current_object(&self) -> Option<&ControlObject> {
        self.filtered_objects().nth(self.selected)
    }

    pub fn current_agent(&self) -> Option<&AgentRecord> {
        self.filtered_agents().nth(self.selected)
    }

    pub fn current_os(&self) -> Option<&OsPackage> {
        self.filtered_os().nth(self.selected)
    }

    pub fn current_mcp(&self) -> Option<&CapabilityRecord> {
        self.filtered_mcp().nth(self.selected)
    }

    pub fn current_skill(&self) -> Option<&SkillRecord> {
        self.filtered_skills().nth(self.selected)
    }

    pub fn filtered_sessions(&self) -> impl Iterator<Item = &RuntimeRecord> {
        self.snapshot.runtimes.iter().filter(|item| {
            matches_query(
                &self.query,
                &[
                    &item.name,
                    &item.kind,
                    &item.status,
                    item.project.as_deref().unwrap_or(""),
                    item.client.as_deref().unwrap_or(""),
                    item.mission.as_deref().unwrap_or(""),
                    &item.cwd,
                ],
            )
        })
    }

    pub fn filtered_objects(&self) -> impl Iterator<Item = &ControlObject> {
        self.snapshot.objects.iter().filter(|item| {
            matches_query(
                &self.query,
                &[
                    &item.id,
                    &item.kind,
                    &item.slug,
                    &item.name,
                    &item.status,
                    item.path.as_deref().unwrap_or(""),
                ],
            )
        })
    }

    pub fn filtered_agents(&self) -> impl Iterator<Item = &AgentRecord> {
        self.snapshot.agents.iter().filter(|item| {
            matches_query(
                &self.query,
                &[
                    &item.id,
                    &item.name,
                    &item.description,
                    &item.status,
                    &item.runtime,
                ],
            )
        })
    }

    pub fn filtered_os(&self) -> impl Iterator<Item = &OsPackage> {
        self.snapshot.os_packages.iter().filter(|item| {
            matches_query(
                &self.query,
                &[&item.id, &item.name, &item.version, &item.description],
            )
        })
    }

    pub fn filtered_mcp(&self) -> impl Iterator<Item = &CapabilityRecord> {
        self.snapshot
            .mcp_servers
            .iter()
            .filter(|item| matches_query(&self.query, &[&item.name, &item.transport, &item.status]))
    }

    pub fn filtered_skills(&self) -> impl Iterator<Item = &SkillRecord> {
        self.snapshot
            .skills
            .iter()
            .filter(|item| matches_query(&self.query, &[&item.name, &item.source, &item.status]))
    }

    pub fn current_key(&self) -> Option<String> {
        match self.view {
            View::Sessions => self
                .current_session()
                .map(|item| format!("runtime:{}", item.name)),
            View::Projects => self
                .current_object()
                .map(|item| format!("object:{}", item.id)),
            View::Agents => self
                .current_agent()
                .map(|item| format!("agent:{}", item.id)),
            View::Os => self
                .current_os()
                .map(|item| format!("os:{}@{}", item.id, item.version)),
            View::Mcp => self.current_mcp().map(|item| format!("mcp:{}", item.name)),
            View::Skills => self
                .current_skill()
                .map(|item| format!("skill:{}", item.name)),
            _ => None,
        }
    }

    fn visible_keys(&self) -> Vec<String> {
        match self.view {
            View::Sessions => self
                .filtered_sessions()
                .map(|item| format!("runtime:{}", item.name))
                .collect(),
            View::Projects => self
                .filtered_objects()
                .map(|item| format!("object:{}", item.id))
                .collect(),
            View::Agents => self
                .filtered_agents()
                .map(|item| format!("agent:{}", item.id))
                .collect(),
            View::Os => self
                .filtered_os()
                .map(|item| format!("os:{}@{}", item.id, item.version))
                .collect(),
            View::Mcp => self
                .filtered_mcp()
                .map(|item| format!("mcp:{}", item.name))
                .collect(),
            View::Skills => self
                .filtered_skills()
                .map(|item| format!("skill:{}", item.name))
                .collect(),
            _ => Vec::new(),
        }
    }

    pub fn tab(&mut self, now: Instant, detail_available: bool) {
        if self.focus != Focus::Nav
            && detail_available
            && self
                .last_tab
                .is_some_and(|previous| now.duration_since(previous) <= Duration::from_millis(420))
        {
            self.expanded = !self.expanded;
            self.last_tab = None;
            return;
        }
        self.focus = match (self.focus, detail_available) {
            (Focus::Nav, _) => Focus::List,
            (Focus::List, true) => Focus::Detail,
            (Focus::List, false) | (Focus::Detail, _) => Focus::Nav,
        };
        self.last_tab = Some(now);
    }

    pub fn back_tab(&mut self, detail_available: bool) {
        self.last_tab = None;
        self.focus = match (self.focus, detail_available) {
            (Focus::Nav, true) => Focus::Detail,
            (Focus::Nav, false) | (Focus::List, _) => Focus::Nav,
            (Focus::Detail, _) => Focus::List,
        };
    }

    pub fn settings_section(&self) -> SettingsSection {
        SettingsSection::ALL[self.settings_section.min(SettingsSection::ALL.len() - 1)]
    }

    pub fn preview_next_theme(&mut self) {
        self.theme = self.theme.next();
    }
    pub fn preview_previous_theme(&mut self) {
        self.theme = self.theme.previous();
    }

    pub fn commit_theme(&mut self) {
        self.committed_theme = self.theme;
        self.preferences.theme = self.theme;
        self.status = Some(format!("Theme saved: {}", self.theme.name()));
    }

    pub fn cancel_theme_preview(&mut self) {
        self.theme = self.committed_theme;
    }

    pub fn select_session_by_name(&mut self, name: &str) -> bool {
        self.query.clear();
        self.view = View::Sessions;
        self.focus = Focus::List;
        self.expanded = false;
        if let Some(index) = self
            .snapshot
            .runtimes
            .iter()
            .position(|item| item.name == name)
        {
            self.selected = index;
            self.remember_current_session();
            true
        } else {
            self.selected = 0;
            false
        }
    }

    fn remember_current_session(&mut self) {
        if self.view == View::Sessions
            && let Some(name) = self.current_session().map(|item| item.name.clone())
        {
            self.last_session = Some(name);
        }
    }
}

fn matches_query(query: &str, values: &[&str]) -> bool {
    let query = query.trim().to_ascii_lowercase();
    if query.is_empty() {
        return true;
    }
    let haystack = values.join(" ").to_ascii_lowercase();
    query.split_whitespace().all(|term| haystack.contains(term))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app() -> App {
        App::new("mission".into(), Preferences::default())
    }

    fn runtime(name: &str) -> RuntimeRecord {
        RuntimeRecord {
            id: format!("runtime-{name}"),
            name: name.into(),
            kind: "hermes".into(),
            environment: "mission".into(),
            client: None,
            project: None,
            mission: None,
            native_session: None,
            rmux_session: name.into(),
            cwd: "/work".into(),
            status: "active".into(),
            created_at: 1.0,
            last_activity: 2.0,
            tokens: 0,
            managed: true,
            live: true,
        }
    }

    #[test]
    fn responsive_breakpoints_are_deterministic() {
        assert_eq!(density(60, 30), Density::Compact);
        assert_eq!(density(90, 24), Density::Standard);
        assert_eq!(density(140, 40), Density::Wide);
    }

    #[test]
    fn tab_reaches_every_focus_and_double_tab_expands_detail() {
        let mut app = app();
        let now = Instant::now();
        app.focus = Focus::Nav;
        app.tab(now, true);
        assert_eq!(app.focus, Focus::List);
        app.tab(now + Duration::from_secs(1), true);
        assert_eq!(app.focus, Focus::Detail);
        app.tab(now + Duration::from_millis(1100), true);
        assert!(app.expanded);
        assert_eq!(app.focus, Focus::Detail);
    }

    #[test]
    fn navigation_and_theme_preview_have_cancel_commit_contracts() {
        let mut app = app();
        app.focus = Focus::Nav;
        app.next_view();
        assert_eq!(app.view, View::Projects);
        app.set_view(View::Settings);
        let original = app.theme;
        app.preview_next_theme();
        assert_ne!(app.theme, original);
        app.cancel_theme_preview();
        assert_eq!(app.theme, original);
        app.preview_next_theme();
        app.commit_theme();
        assert_eq!(app.preferences.theme, app.theme);
    }

    #[test]
    fn search_is_case_insensitive_and_requires_all_terms() {
        assert!(matches_query("MOON codex", &["moon-base", "Codex"]));
        assert!(!matches_query("moon hermes", &["moon-base", "Codex"]));
    }

    #[test]
    fn selected_session_survives_other_views_and_filters_do_not_leak() {
        let mut app = app();
        app.set_snapshot(RegistrySnapshot {
            runtimes: vec![runtime("alpha"), runtime("bravo")],
            ..RegistrySnapshot::default()
        });
        app.select_next();
        app.query = "bravo".into();
        app.set_view(View::Projects);
        assert_eq!(app.selected_session_name(), Some("bravo"));
        assert!(app.query.is_empty());
        app.set_view(View::Sessions);
        assert_eq!(
            app.current_session().map(|item| item.name.as_str()),
            Some("bravo")
        );
    }
}
