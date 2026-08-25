use std::time::{Duration, Instant};

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
            Self::Sessions => "SESSION",
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
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Focus {
    Nav,
    List,
    Preview,
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RuntimeItem {
    pub name: String,
    pub kind: String,
    pub scope: String,
    pub status: String,
    pub activity: String,
}

impl RuntimeItem {
    pub fn from_rmux(name: impl Into<String>) -> Self {
        let name = name.into();
        let lower = name.to_ascii_lowercase();
        let kind = ["hermes", "claude", "codex", "agent", "workflow", "monitor"]
            .into_iter()
            .find(|candidate| lower.contains(candidate))
            .unwrap_or("shell")
            .to_ascii_uppercase();
        let scope = name
            .split('-')
            .next()
            .unwrap_or("local")
            .to_ascii_uppercase();
        Self {
            name,
            kind,
            scope,
            status: "RUNNING".into(),
            activity: "live".into(),
        }
    }
}

#[derive(Debug)]
pub struct App {
    pub environment: String,
    pub view: View,
    pub focus: Focus,
    pub sessions: Vec<RuntimeItem>,
    pub selected: usize,
    pub query: String,
    pub palette: bool,
    pub expanded: bool,
    pub split: bool,
    last_tab: Option<Instant>,
}

impl App {
    pub fn new(environment: String) -> Self {
        Self {
            environment,
            view: View::Sessions,
            focus: Focus::List,
            sessions: Vec::new(),
            selected: 0,
            query: String::new(),
            palette: false,
            expanded: false,
            split: true,
            last_tab: None,
        }
    }

    pub fn select_next(&mut self) {
        if !self.sessions.is_empty() {
            self.selected = (self.selected + 1).min(self.sessions.len() - 1);
        }
    }
    pub fn select_previous(&mut self) {
        self.selected = self.selected.saturating_sub(1);
    }
    pub fn current(&self) -> Option<&RuntimeItem> {
        self.sessions.get(self.selected)
    }
    pub fn next_view(&mut self) {
        let index = View::ALL
            .iter()
            .position(|view| *view == self.view)
            .unwrap_or(0);
        self.view = View::ALL[(index + 1) % View::ALL.len()];
        self.selected = 0;
    }
    pub fn previous_view(&mut self) {
        let index = View::ALL
            .iter()
            .position(|view| *view == self.view)
            .unwrap_or(0);
        self.view = View::ALL[(index + View::ALL.len() - 1) % View::ALL.len()];
        self.selected = 0;
    }
    pub fn set_sessions(&mut self, sessions: Vec<RuntimeItem>) {
        let identity = self.current().map(|item| item.name.clone());
        self.sessions = sessions;
        self.selected = identity
            .and_then(|name| self.sessions.iter().position(|item| item.name == name))
            .unwrap_or(self.selected.min(self.sessions.len().saturating_sub(1)));
    }
    pub fn tab(&mut self, now: Instant, preview_available: bool) {
        if self.focus != Focus::Nav
            && self
                .last_tab
                .is_some_and(|previous| now.duration_since(previous) <= Duration::from_millis(420))
        {
            self.expanded = !self.expanded;
            self.last_tab = None;
        } else {
            self.focus = match (self.focus, preview_available) {
                (Focus::Nav, _) => Focus::List,
                (Focus::List, true) => Focus::Preview,
                (Focus::List, false) | (Focus::Preview, _) => Focus::Nav,
            };
            self.last_tab = Some(now);
        }
    }

    pub fn back_tab(&mut self, preview_available: bool) {
        self.last_tab = None;
        self.focus = match (self.focus, preview_available) {
            (Focus::Nav, true) => Focus::Preview,
            (Focus::Nav, false) | (Focus::List, _) => Focus::Nav,
            (Focus::Preview, _) => Focus::List,
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn responsive_breakpoints_are_deterministic() {
        assert_eq!(density(60, 30), Density::Compact);
        assert_eq!(density(90, 24), Density::Standard);
        assert_eq!(density(140, 40), Density::Wide);
    }

    #[test]
    fn double_tab_expands_without_losing_focus() {
        let mut app = App::new("mission".into());
        let now = Instant::now();
        app.tab(now, true);
        assert_eq!(app.focus, Focus::Preview);
        app.tab(now + Duration::from_millis(100), true);
        assert!(app.expanded);
    }

    #[test]
    fn keyboard_can_reach_and_operate_top_navigation() {
        let mut app = App::new("mission".into());
        let now = Instant::now();
        app.tab(now, false);
        assert_eq!(app.focus, Focus::Nav);
        app.next_view();
        assert_eq!(app.view, View::Projects);
        app.tab(now + Duration::from_secs(1), false);
        assert_eq!(app.focus, Focus::List);
    }

    #[test]
    fn refresh_preserves_selection_by_stable_name() {
        let mut app = App::new("agentik".into());
        app.set_sessions(vec![
            RuntimeItem::from_rmux("a"),
            RuntimeItem::from_rmux("b"),
        ]);
        app.selected = 1;
        app.set_sessions(vec![
            RuntimeItem::from_rmux("b"),
            RuntimeItem::from_rmux("c"),
        ]);
        assert_eq!(app.current().unwrap().name, "b");
    }
}
