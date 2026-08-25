//! AGK-owned visual themes and durable TUI preferences.
//!
//! The file format is intentionally small and forwards-compatible: one
//! `key=value` pair per line, with unknown keys and malformed values ignored.

use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use ratatui::style::Color;

/// Semantic colors used by AGK widgets.
///
/// Keeping widgets on semantic roles instead of theme-specific colors makes a
/// theme change take effect immediately and keeps status colors consistent
/// across every view.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Palette {
    pub background: Color,
    pub surface: Color,
    pub surface_alt: Color,
    pub text: Color,
    pub text_muted: Color,
    pub accent: Color,
    pub accent_alt: Color,
    pub selection_bg: Color,
    pub selection_text: Color,
    pub border: Color,
    pub border_focused: Color,
    pub success: Color,
    pub warning: Color,
    pub error: Color,
    pub info: Color,
}

/// Built-in AGK themes. Variant order is the stable order shown in Settings.
#[derive(Clone, Copy, Debug, Default, Eq, Hash, PartialEq)]
pub enum Theme {
    #[default]
    Gold,
    Ocean,
    Mono,
    Ares,
    Nord,
    Matrix,
}

impl Theme {
    pub const ALL: [Self; 6] = [
        Self::Gold,
        Self::Ocean,
        Self::Mono,
        Self::Ares,
        Self::Nord,
        Self::Matrix,
    ];

    /// Stable identifier used in `tui.conf`.
    pub const fn slug(self) -> &'static str {
        match self {
            Self::Gold => "gold",
            Self::Ocean => "ocean",
            Self::Mono => "mono",
            Self::Ares => "ares",
            Self::Nord => "nord",
            Self::Matrix => "matrix",
        }
    }

    pub const fn name(self) -> &'static str {
        match self {
            Self::Gold => "AGK Gold",
            Self::Ocean => "Ocean",
            Self::Mono => "Monochrome",
            Self::Ares => "Ares",
            Self::Nord => "Nord",
            Self::Matrix => "Matrix",
        }
    }

    pub const fn description(self) -> &'static str {
        match self {
            Self::Gold => "Warm gold highlights on a neutral near-black shell.",
            Self::Ocean => "Cool cyan and blue for a calm, high-contrast workspace.",
            Self::Mono => "A restrained grayscale palette for distraction-free work.",
            Self::Ares => "Ember red and orange accents on a deep charcoal surface.",
            Self::Nord => "Arctic blues with soft, low-glare contrast.",
            Self::Matrix => "Green phosphor accents inspired by classic terminals.",
        }
    }

    pub const fn next(self) -> Self {
        match self {
            Self::Gold => Self::Ocean,
            Self::Ocean => Self::Mono,
            Self::Mono => Self::Ares,
            Self::Ares => Self::Nord,
            Self::Nord => Self::Matrix,
            Self::Matrix => Self::Gold,
        }
    }

    pub const fn previous(self) -> Self {
        match self {
            Self::Gold => Self::Matrix,
            Self::Ocean => Self::Gold,
            Self::Mono => Self::Ocean,
            Self::Ares => Self::Mono,
            Self::Nord => Self::Ares,
            Self::Matrix => Self::Nord,
        }
    }

    pub fn from_slug(slug: &str) -> Option<Self> {
        let slug = slug.trim();
        Self::ALL
            .into_iter()
            .find(|theme| theme.slug().eq_ignore_ascii_case(slug))
    }

    /// Representative colors for the Settings theme picker.
    pub const fn swatches(self) -> [Color; 5] {
        let palette = self.palette();
        [
            palette.background,
            palette.surface_alt,
            palette.accent,
            palette.info,
            palette.text,
        ]
    }

    pub const fn palette(self) -> Palette {
        match self {
            Self::Gold => Palette {
                background: Color::Rgb(10, 12, 16),
                surface: Color::Rgb(18, 21, 27),
                surface_alt: Color::Rgb(29, 32, 39),
                text: Color::Rgb(235, 229, 213),
                text_muted: Color::Rgb(151, 145, 132),
                accent: Color::Rgb(237, 184, 59),
                accent_alt: Color::Rgb(255, 214, 112),
                selection_bg: Color::Rgb(88, 65, 20),
                selection_text: Color::Rgb(255, 242, 203),
                border: Color::Rgb(77, 73, 64),
                border_focused: Color::Rgb(237, 184, 59),
                success: Color::Rgb(92, 190, 122),
                warning: Color::Rgb(243, 166, 48),
                error: Color::Rgb(230, 84, 84),
                info: Color::Rgb(85, 168, 226),
            },
            Self::Ocean => Palette {
                background: Color::Rgb(6, 15, 25),
                surface: Color::Rgb(10, 29, 45),
                surface_alt: Color::Rgb(14, 42, 63),
                text: Color::Rgb(220, 240, 246),
                text_muted: Color::Rgb(119, 159, 174),
                accent: Color::Rgb(52, 194, 214),
                accent_alt: Color::Rgb(84, 133, 237),
                selection_bg: Color::Rgb(22, 85, 111),
                selection_text: Color::Rgb(226, 251, 255),
                border: Color::Rgb(44, 89, 108),
                border_focused: Color::Rgb(52, 194, 214),
                success: Color::Rgb(71, 190, 157),
                warning: Color::Rgb(232, 180, 92),
                error: Color::Rgb(237, 111, 111),
                info: Color::Rgb(91, 155, 245),
            },
            Self::Mono => Palette {
                background: Color::Rgb(10, 10, 10),
                surface: Color::Rgb(20, 20, 20),
                surface_alt: Color::Rgb(32, 32, 32),
                text: Color::Rgb(235, 235, 235),
                text_muted: Color::Rgb(139, 139, 139),
                accent: Color::Rgb(205, 205, 205),
                accent_alt: Color::Rgb(248, 248, 248),
                selection_bg: Color::Rgb(68, 68, 68),
                selection_text: Color::Rgb(255, 255, 255),
                border: Color::Rgb(78, 78, 78),
                border_focused: Color::Rgb(205, 205, 205),
                success: Color::Rgb(190, 190, 190),
                warning: Color::Rgb(215, 215, 215),
                error: Color::Rgb(160, 160, 160),
                info: Color::Rgb(200, 200, 200),
            },
            Self::Ares => Palette {
                background: Color::Rgb(16, 9, 10),
                surface: Color::Rgb(31, 16, 18),
                surface_alt: Color::Rgb(48, 23, 24),
                text: Color::Rgb(244, 225, 213),
                text_muted: Color::Rgb(170, 126, 116),
                accent: Color::Rgb(237, 75, 54),
                accent_alt: Color::Rgb(244, 139, 54),
                selection_bg: Color::Rgb(105, 32, 29),
                selection_text: Color::Rgb(255, 235, 220),
                border: Color::Rgb(105, 56, 51),
                border_focused: Color::Rgb(237, 75, 54),
                success: Color::Rgb(112, 195, 112),
                warning: Color::Rgb(244, 166, 61),
                error: Color::Rgb(247, 79, 90),
                info: Color::Rgb(106, 161, 224),
            },
            Self::Nord => Palette {
                background: Color::Rgb(36, 41, 51),
                surface: Color::Rgb(46, 52, 64),
                surface_alt: Color::Rgb(59, 66, 82),
                text: Color::Rgb(236, 239, 244),
                text_muted: Color::Rgb(152, 162, 179),
                accent: Color::Rgb(136, 192, 208),
                accent_alt: Color::Rgb(129, 161, 193),
                selection_bg: Color::Rgb(67, 76, 94),
                selection_text: Color::Rgb(236, 239, 244),
                border: Color::Rgb(76, 86, 106),
                border_focused: Color::Rgb(136, 192, 208),
                success: Color::Rgb(163, 190, 140),
                warning: Color::Rgb(235, 203, 139),
                error: Color::Rgb(191, 97, 106),
                info: Color::Rgb(94, 129, 172),
            },
            Self::Matrix => Palette {
                background: Color::Rgb(2, 10, 4),
                surface: Color::Rgb(5, 22, 9),
                surface_alt: Color::Rgb(8, 38, 15),
                text: Color::Rgb(194, 255, 205),
                text_muted: Color::Rgb(91, 148, 101),
                accent: Color::Rgb(52, 235, 91),
                accent_alt: Color::Rgb(137, 255, 159),
                selection_bg: Color::Rgb(15, 82, 31),
                selection_text: Color::Rgb(220, 255, 226),
                border: Color::Rgb(35, 105, 50),
                border_focused: Color::Rgb(52, 235, 91),
                success: Color::Rgb(87, 225, 112),
                warning: Color::Rgb(223, 207, 78),
                error: Color::Rgb(238, 93, 93),
                info: Color::Rgb(78, 190, 144),
            },
        }
    }
}

pub const DEFAULT_REFRESH_MS: u64 = 1_000;

/// Preferences persisted outside the Agentik registries because they only
/// affect this local presentation surface.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Preferences {
    pub theme: Theme,
    pub split_preview: bool,
    pub refresh_ms: u64,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            split_preview: true,
            refresh_ms: DEFAULT_REFRESH_MS,
        }
    }
}

impl Preferences {
    pub fn load() -> io::Result<Self> {
        Self::load_from(default_preferences_path()?)
    }

    /// Loads preferences from an injectable path. A missing file is the same
    /// as first launch, and malformed or unknown values fall back field by
    /// field without making the TUI unusable.
    pub fn load_from(path: impl AsRef<Path>) -> io::Result<Self> {
        let bytes = match fs::read(path.as_ref()) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Self::default()),
            Err(error) => return Err(error),
        };
        Ok(Self::parse(&String::from_utf8_lossy(&bytes)))
    }

    pub fn save(&self) -> io::Result<()> {
        self.save_to(default_preferences_path()?)
    }

    /// Atomically replaces the preference file. On Unix, the temporary file
    /// is created with mode 0600 and renamed over the destination in the same
    /// directory, so readers observe either the old or the complete new file.
    pub fn save_to(&self, path: impl AsRef<Path>) -> io::Result<()> {
        let path = path.as_ref();
        let refresh_ms = if self.refresh_ms == 0 {
            DEFAULT_REFRESH_MS
        } else {
            self.refresh_ms
        };
        let contents = format!(
            "# AGK native TUI preferences\ntheme={}\nsplit_preview={}\nrefresh_ms={}\n",
            self.theme.slug(),
            self.split_preview,
            refresh_ms
        );
        atomic_write(path, contents.as_bytes())
    }

    fn parse(contents: &str) -> Self {
        let mut preferences = Self::default();
        for line in contents.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, value)) = line.split_once('=') else {
                continue;
            };
            let key = key.trim();
            let value = value.trim();
            match key {
                "theme" => {
                    if let Some(theme) = Theme::from_slug(value) {
                        preferences.theme = theme;
                    }
                }
                "split_preview" => match value.to_ascii_lowercase().as_str() {
                    "true" => preferences.split_preview = true,
                    "false" => preferences.split_preview = false,
                    _ => {}
                },
                "refresh_ms" => {
                    if let Ok(refresh_ms) = value.parse::<u64>()
                        && refresh_ms > 0
                    {
                        preferences.refresh_ms = refresh_ms;
                    }
                }
                _ => {}
            }
        }
        preferences
    }
}

/// The canonical per-user preferences path.
pub fn default_preferences_path() -> io::Result<PathBuf> {
    let home = std::env::var_os("HOME").filter(|value| !value.is_empty());
    home.map(PathBuf::from)
        .map(|path| path.join(".config/agk/tui.conf"))
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "HOME is not set"))
}

fn atomic_write(path: &Path, contents: &[u8]) -> io::Result<()> {
    let file_name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "missing file name"))?;
    let parent = path
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;

    static NEXT_TEMP_FILE: AtomicU64 = AtomicU64::new(0);
    let mut temporary = None;
    let mut file = None;
    for _ in 0..128 {
        let sequence = NEXT_TEMP_FILE.fetch_add(1, Ordering::Relaxed);
        let temp_name = format!(
            ".{}.tmp.{}.{}",
            file_name.to_string_lossy(),
            std::process::id(),
            sequence
        );
        let temp_path = parent.join(temp_name);
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        match options.open(&temp_path) {
            Ok(opened) => {
                temporary = Some(temp_path);
                file = Some(opened);
                break;
            }
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(error),
        }
    }

    let temporary = temporary.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::AlreadyExists,
            "could not allocate an AGK preference temporary file",
        )
    })?;
    let mut file = file.expect("temporary path and file are allocated together");

    let write_result = (|| {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            file.set_permissions(fs::Permissions::from_mode(0o600))?;
        }
        file.write_all(contents)?;
        file.sync_all()?;
        drop(file);

        #[cfg(unix)]
        fs::rename(&temporary, path)?;

        #[cfg(not(unix))]
        {
            if path.exists() {
                fs::remove_file(path)?;
            }
            fs::rename(&temporary, path)?;
        }

        #[cfg(unix)]
        File::open(parent)?.sync_all()?;

        Ok(())
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write_result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use std::sync::atomic::{AtomicU64, Ordering};

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);
            let sequence = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir()
                .join(format!("agk-theme-test-{}-{sequence}", std::process::id()));
            fs::create_dir(&path).expect("create isolated test directory");
            Self(path)
        }

        fn config(&self) -> PathBuf {
            self.0.join("nested/tui.conf")
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn preferences_round_trip_through_the_real_file_format() {
        let directory = TestDirectory::new();
        let path = directory.config();
        let expected = Preferences {
            theme: Theme::Nord,
            split_preview: false,
            refresh_ms: 2_500,
        };

        expected.save_to(&path).expect("save preferences");

        assert_eq!(Preferences::load_from(path).unwrap(), expected);
    }

    #[test]
    fn corrupt_and_unknown_values_fall_back_without_losing_valid_values() {
        let directory = TestDirectory::new();
        let path = directory.config();
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(
            &path,
            b"theme=not-a-theme\nsplit_preview=perhaps\nrefresh_ms=0\nfuture_key=yes\n\xff\n",
        )
        .unwrap();

        assert_eq!(
            Preferences::load_from(&path).unwrap(),
            Preferences::default()
        );

        fs::write(
            &path,
            b"theme=matrix\nsplit_preview=broken\nrefresh_ms=275\n",
        )
        .unwrap();
        assert_eq!(
            Preferences::load_from(path).unwrap(),
            Preferences {
                theme: Theme::Matrix,
                split_preview: true,
                refresh_ms: 275,
            }
        );
    }

    #[test]
    fn save_atomically_replaces_existing_file_without_temporary_debris() {
        let directory = TestDirectory::new();
        let path = directory.config();
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, "incomplete old contents").unwrap();

        #[cfg(unix)]
        let old_inode = {
            use std::os::unix::fs::MetadataExt;
            fs::metadata(&path).unwrap().ino()
        };

        let expected = Preferences {
            theme: Theme::Ares,
            split_preview: false,
            refresh_ms: 750,
        };
        expected.save_to(&path).unwrap();

        assert_eq!(Preferences::load_from(&path).unwrap(), expected);
        let entries = fs::read_dir(path.parent().unwrap())
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect::<Vec<_>>();
        assert_eq!(entries, vec![path.file_name().unwrap()]);

        #[cfg(unix)]
        {
            use std::os::unix::fs::{MetadataExt, PermissionsExt};
            let metadata = fs::metadata(&path).unwrap();
            assert_ne!(metadata.ino(), old_inode);
            assert_eq!(metadata.permissions().mode() & 0o777, 0o600);
        }
    }

    #[test]
    fn theme_navigation_wraps_and_slugs_are_stable_and_unique() {
        let mut seen = HashSet::new();
        for (index, theme) in Theme::ALL.into_iter().enumerate() {
            assert!(seen.insert(theme.slug()));
            assert_eq!(Theme::from_slug(theme.slug()), Some(theme));
            assert_eq!(
                Theme::from_slug(&theme.slug().to_ascii_uppercase()),
                Some(theme)
            );
            assert_eq!(theme.next().previous(), theme);
            assert_eq!(theme.previous().next(), theme);
            assert_eq!(theme.next(), Theme::ALL[(index + 1) % Theme::ALL.len()]);
        }
        assert_eq!(Theme::Matrix.next(), Theme::Gold);
        assert_eq!(Theme::Gold.previous(), Theme::Matrix);
    }

    #[test]
    fn every_theme_has_a_distinct_semantic_palette() {
        for (index, theme) in Theme::ALL.into_iter().enumerate() {
            let palette = theme.palette();
            assert_ne!(
                palette.background,
                palette.text,
                "{} contrast",
                theme.slug()
            );
            assert_ne!(
                palette.background,
                palette.accent,
                "{} accent",
                theme.slug()
            );
            assert_ne!(
                palette.surface,
                palette.surface_alt,
                "{} surfaces",
                theme.slug()
            );
            assert_ne!(
                palette.success,
                palette.warning,
                "{} statuses",
                theme.slug()
            );
            assert_ne!(palette.warning, palette.error, "{} statuses", theme.slug());
            assert_ne!(palette.error, palette.info, "{} statuses", theme.slug());
            assert_eq!(
                theme.swatches(),
                [
                    palette.background,
                    palette.surface_alt,
                    palette.accent,
                    palette.info,
                    palette.text,
                ]
            );
            for other in Theme::ALL.into_iter().skip(index + 1) {
                assert_ne!(palette, other.palette(), "duplicate palette: {theme:?}");
            }
        }
    }
}
