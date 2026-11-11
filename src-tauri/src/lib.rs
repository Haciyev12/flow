use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::ShortcutState;

// ── Shared state type ─────────────────────────────────────────────────────────

type SharedSettings = Arc<Mutex<AppSettings>>;

// ── Settings model ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    #[serde(default = "default_shortcut")]
    palette_shortcut: String,
    #[serde(default)]
    launch_at_login: bool,
    #[serde(default = "bool_true")]
    keep_in_background: bool,
    #[serde(default = "bool_true")]
    show_main_window_at_startup: bool,
    #[serde(default)]
    open_palette_at_startup: bool,
}

fn default_shortcut() -> String {
    "CommandOrControl+Shift+Space".to_string()
}

fn bool_true() -> bool { true }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            palette_shortcut: default_shortcut(),
            launch_at_login: false,
            keep_in_background: true,
            show_main_window_at_startup: true,
            open_palette_at_startup: false,
        }
    }
}

fn load_settings(app: &tauri::AppHandle) -> AppSettings {
    app.path()
        .app_data_dir()
        .ok()
        .and_then(|d| std::fs::read_to_string(d.join("settings.json")).ok())
        .and_then(|s| serde_json::from_str::<AppSettings>(&s).ok())
        .unwrap_or_default()
}

fn write_settings(app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("settings.json"), content).map_err(|e| e.to_string())
}

// ── Data model ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherItem {
    id: String,
    #[serde(rename = "type")]
    item_type: String,
    name: String,
    description: String,
    target: String,
    color: String,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    favorite: Option<bool>,
}

// ── Workspace model ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceItemSettings {
    auto_execute: bool,
    confirm_before: bool,
    continue_on_failure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Workspace {
    id: String,
    name: String,
    description: String,
    icon: String,
    color: String,
    item_ids: Vec<String>,
    #[serde(default)]
    item_settings: HashMap<String, WorkspaceItemSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    browser_open_mode: Option<String>,
    created_at: String,
    updated_at: String,
}

// ── Recents model ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecentEntry {
    id: String,
    kind: String,
    used_at: String,
}

// ── Path helpers ──────────────────────────────────────────────────────────────

fn do_open_path(path: &str) -> Result<(), String> {
    if !Path::new(path).exists() {
        return Err(format!("\"{}\" was not found on disk.", path));
    }
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Could not open: {}", e))?;
    Ok(())
}

fn do_open_url(url: &str) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only https:// and http:// URLs are supported.".into());
    }
    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("Could not open URL: {}", e))?;
    Ok(())
}

// ── Validation ────────────────────────────────────────────────────────────────

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

// ── Launchers ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn open_item_path(path: String) -> Result<(), String> {
    do_open_path(&path)
}

#[tauri::command]
fn open_item_url(url: String) -> Result<(), String> {
    do_open_url(&url)
}

#[tauri::command]
fn open_in_vscode(path: String) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err("Project folder not found on disk.".into());
    }
    std::process::Command::new("open")
        .args(["-a", "Visual Studio Code", &path])
        .spawn()
        .map_err(|_| "Could not open VS Code. Make sure it is installed.".to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_terminal(path: String) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err("Project folder not found on disk.".into());
    }
    std::process::Command::new("open")
        .args(["-a", "Terminal", &path])
        .spawn()
        .map_err(|e| format!("Could not open Terminal: {}", e))?;
    Ok(())
}

#[tauri::command]
fn launch_item(item_type: String, target: String) -> Result<(), String> {
    match item_type.as_str() {
        "app" | "file" | "folder" | "project" => do_open_path(&target),
        "website" => do_open_url(&target),
        other => Err(format!("Unknown item type: \"{}\".", other)),
    }
}

// ── Browser window launcher ───────────────────────────────────────────────────

fn find_brave_binary() -> Result<std::path::PathBuf, String> {
    let standard = std::path::Path::new(
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    );
    if standard.exists() {
        return Ok(standard.to_path_buf());
    }
    if let Ok(home) = std::env::var("HOME") {
        let user = std::path::PathBuf::from(home)
            .join("Applications/Brave Browser.app/Contents/MacOS/Brave Browser");
        if user.exists() {
            return Ok(user);
        }
    }
    Err("Brave Browser not found at /Applications/Brave Browser.app. \
         Install it from https://brave.com or move it to /Applications."
        .into())
}

fn open_urls_new_window(urls: &[String]) -> Result<(), String> {
    if urls.is_empty() {
        return Ok(());
    }
    let binary = find_brave_binary()?;
    let mut cmd = std::process::Command::new(&binary);
    cmd.arg("--new-window");
    for url in urls {
        cmd.arg(url.as_str());
    }
    cmd.spawn()
        .map_err(|e| format!("Could not launch Brave Browser: {}", e))?;
    Ok(())
}

#[tauri::command]
fn open_urls_in_browser_window(urls: Vec<String>) -> Result<(), String> {
    for url in &urls {
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err(format!(
                "\"{}\" is not a valid URL. Only http:// and https:// are supported.",
                url
            ));
        }
    }
    open_urls_new_window(&urls)
}

// ── Command palette window ────────────────────────────────────────────────────

#[tauri::command]
fn show_palette(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("palette") {
        w.show().map_err(|e| e.to_string())?;
        w.center().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_palette(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("palette") {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Recents ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn load_recents(app: tauri::AppHandle) -> Result<Vec<RecentEntry>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("recents.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn record_recent(
    app: tauri::AppHandle,
    id: String,
    kind: String,
    used_at: String,
) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("recents.json");

    let mut recents: Vec<RecentEntry> = if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    recents.retain(|r| r.id != id);
    recents.insert(0, RecentEntry { id, kind, used_at });
    recents.truncate(20);

    let content = serde_json::to_string_pretty(&recents).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// ── Persistence ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyProject {
    id: String,
    name: String,
    description: String,
    folder_path: String,
    category: String,
    color: String,
    created_at: String,
}

#[tauri::command]
fn load_items(app: tauri::AppHandle) -> Result<Vec<LauncherItem>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let items_path = dir.join("items.json");

    if items_path.exists() {
        let content = std::fs::read_to_string(&items_path).map_err(|e| e.to_string())?;
        return serde_json::from_str(&content).map_err(|e| e.to_string());
    }

    let legacy_path = dir.join("projects.json");
    if legacy_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&legacy_path) {
            if let Ok(legacy) = serde_json::from_str::<Vec<LegacyProject>>(&content) {
                return Ok(legacy
                    .into_iter()
                    .map(|p| LauncherItem {
                        id: p.id,
                        item_type: "project".to_string(),
                        name: p.name,
                        description: p.description,
                        target: p.folder_path,
                        color: p.color,
                        created_at: p.created_at,
                        project_category: Some(p.category),
                        favorite: None,
                    })
                    .collect());
            }
        }
    }

    Ok(vec![])
}

#[tauri::command]
fn save_items(app: tauri::AppHandle, items: Vec<LauncherItem>) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("items.json"), content).map_err(|e| e.to_string())?;
    refresh_tray_menu(&app);
    Ok(())
}

#[tauri::command]
fn load_workspaces(app: tauri::AppHandle) -> Result<Vec<Workspace>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workspaces.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_workspaces(app: tauri::AppHandle, workspaces: Vec<Workspace>) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&workspaces).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("workspaces.json"), content).map_err(|e| e.to_string())?;
    refresh_tray_menu(&app);
    Ok(())
}

// ── Export / Import ───────────────────────────────────────────────────────────

#[tauri::command]
fn export_config(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let items: serde_json::Value = {
        let p = dir.join("items.json");
        if p.exists() {
            serde_json::from_str(&std::fs::read_to_string(&p).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?
        } else {
            serde_json::Value::Array(vec![])
        }
    };

    let workspaces: serde_json::Value = {
        let p = dir.join("workspaces.json");
        if p.exists() {
            serde_json::from_str(&std::fs::read_to_string(&p).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?
        } else {
            serde_json::Value::Array(vec![])
        }
    };

    serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "items": items,
        "workspaces": workspaces,
    }))
    .map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportResult {
    items_added: usize,
    workspaces_added: usize,
}

#[tauri::command]
fn import_config(
    app: tauri::AppHandle,
    content: String,
    merge: bool,
) -> Result<ImportResult, String> {
    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|_| "Invalid JSON file.".to_string())?;

    if json.get("version").and_then(|v| v.as_i64()).unwrap_or(0) != 1 {
        return Err("Unsupported file format. Only Flow v1 exports are accepted.".into());
    }

    let new_items: Vec<LauncherItem> = serde_json::from_value(
        json.get("items")
            .cloned()
            .unwrap_or(serde_json::Value::Array(vec![])),
    )
    .map_err(|e| format!("Invalid items data: {}", e))?;

    let new_workspaces: Vec<Workspace> = serde_json::from_value(
        json.get("workspaces")
            .cloned()
            .unwrap_or(serde_json::Value::Array(vec![])),
    )
    .map_err(|e| format!("Invalid workspaces data: {}", e))?;

    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let (final_items, items_added) = if merge {
        let mut existing: Vec<LauncherItem> = {
            let p = dir.join("items.json");
            if p.exists() {
                serde_json::from_str(&std::fs::read_to_string(&p).map_err(|e| e.to_string())?)
                    .unwrap_or_default()
            } else {
                vec![]
            }
        };
        let existing_ids: std::collections::HashSet<String> =
            existing.iter().map(|i| i.id.clone()).collect();
        let added: Vec<LauncherItem> = new_items
            .into_iter()
            .filter(|i| !existing_ids.contains(&i.id))
            .collect();
        let count = added.len();
        existing.extend(added);
        (existing, count)
    } else {
        let count = new_items.len();
        (new_items, count)
    };

    let (final_workspaces, workspaces_added) = if merge {
        let mut existing: Vec<Workspace> = {
            let p = dir.join("workspaces.json");
            if p.exists() {
                serde_json::from_str(&std::fs::read_to_string(&p).map_err(|e| e.to_string())?)
                    .unwrap_or_default()
            } else {
                vec![]
            }
        };
        let existing_ids: std::collections::HashSet<String> =
            existing.iter().map(|w| w.id.clone()).collect();
        let added: Vec<Workspace> = new_workspaces
            .into_iter()
            .filter(|w| !existing_ids.contains(&w.id))
            .collect();
        let count = added.len();
        existing.extend(added);
        (existing, count)
    } else {
        let count = new_workspaces.len();
        (new_workspaces, count)
    };

    std::fs::write(
        dir.join("items.json"),
        serde_json::to_string_pretty(&final_items).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    std::fs::write(
        dir.join("workspaces.json"),
        serde_json::to_string_pretty(&final_workspaces).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    refresh_tray_menu(&app);
    Ok(ImportResult {
        items_added,
        workspaces_added,
    })
}

#[tauri::command]
fn clear_all_data(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    for name in &["items.json", "workspaces.json", "recents.json"] {
        let p = dir.join(name);
        if p.exists() {
            std::fs::remove_file(&p).map_err(|e| e.to_string())?;
        }
    }
    refresh_tray_menu(&app);
    Ok(())
}

// ── Settings commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_settings(state: tauri::State<SharedSettings>) -> AppSettings {
    state.lock().unwrap().clone()
}

/// Saves all app settings and handles side-effects (autostart, tray refresh).
/// Returns an optional warning string if autostart registration failed.
#[tauri::command]
fn save_app_settings(
    app: tauri::AppHandle,
    state: tauri::State<SharedSettings>,
    settings: AppSettings,
) -> Result<Option<String>, String> {
    write_settings(&app, &settings)?;
    *state.lock().unwrap() = settings.clone();

    let autostart_warning: Option<String> = {
        use tauri_plugin_autostart::ManagerExt;
        let result = if settings.launch_at_login {
            app.autolaunch().enable()
        } else {
            app.autolaunch().disable()
        };
        result.err().map(|e| format!("Could not update Launch at Login: {}", e))
    };

    refresh_tray_menu(&app);
    Ok(autostart_warning)
}

// ── Shortcut settings ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_palette_shortcut(state: tauri::State<SharedSettings>) -> String {
    state.lock().unwrap().palette_shortcut.clone()
}

#[tauri::command]
fn set_palette_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<SharedSettings>,
    shortcut: String,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let old = state.lock().unwrap().palette_shortcut.clone();
    let _ = app.global_shortcut().unregister(old.as_str());

    if let Err(e) = app.global_shortcut().register(shortcut.as_str()) {
        let _ = app.global_shortcut().register(old.as_str());
        return Err(format!("Could not register shortcut: {}", e));
    }

    {
        let mut s = state.lock().unwrap();
        s.palette_shortcut = shortcut;
    }

    write_settings(&app, &state.lock().unwrap().clone())
}

// ── App entry ─────────────────────────────────────────────────────────────────

fn toggle_palette(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("palette") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.center();
            let _ = w.set_focus();
        }
    }
}

// ── Tray helpers ──────────────────────────────────────────────────────────────

fn load_tray_data(
    app: &tauri::AppHandle,
) -> (Vec<LauncherItem>, Vec<Workspace>, Vec<RecentEntry>) {
    let dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return (vec![], vec![], vec![]),
    };

    let items: Vec<LauncherItem> = {
        let p = dir.join("items.json");
        if p.exists() {
            std::fs::read_to_string(&p)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            vec![]
        }
    };

    let workspaces: Vec<Workspace> = {
        let p = dir.join("workspaces.json");
        if p.exists() {
            std::fs::read_to_string(&p)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            vec![]
        }
    };

    let recents: Vec<RecentEntry> = {
        let p = dir.join("recents.json");
        if p.exists() {
            std::fs::read_to_string(&p)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            vec![]
        }
    };

    (items, workspaces, recents)
}

fn build_tray_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

    let menu = Menu::new(app)?;

    menu.append(&MenuItem::with_id(app, "open", "Open Flow", true, None::<&str>)?)?;
    menu.append(&MenuItem::with_id(
        app,
        "palette",
        "Open Command Palette",
        true,
        None::<&str>,
    )?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    let (items, workspaces, recents) = load_tray_data(app);

    // Recent workspaces (up to 5)
    let recent_ws: Vec<&Workspace> = recents
        .iter()
        .filter(|r| r.kind == "workspace")
        .take(5)
        .filter_map(|r| workspaces.iter().find(|w| w.id == r.id))
        .collect();

    if !recent_ws.is_empty() {
        menu.append(&MenuItem::with_id(
            app,
            "h_recent",
            "Recent Workspaces",
            false,
            None::<&str>,
        )?)?;
        for ws in &recent_ws {
            menu.append(&MenuItem::with_id(
                app,
                format!("workspace_{}", ws.id),
                ws.name.as_str(),
                true,
                None::<&str>,
            )?)?;
        }
        menu.append(&PredefinedMenuItem::separator(app)?)?;
    }

    // Favorite items (up to 5)
    let favs: Vec<&LauncherItem> = items
        .iter()
        .filter(|i| i.favorite.unwrap_or(false))
        .take(5)
        .collect();

    if !favs.is_empty() {
        menu.append(&MenuItem::with_id(
            app,
            "h_favs",
            "Favorites",
            false,
            None::<&str>,
        )?)?;
        for item in &favs {
            menu.append(&MenuItem::with_id(
                app,
                format!("item_{}", item.id),
                item.name.as_str(),
                true,
                None::<&str>,
            )?)?;
        }
        menu.append(&PredefinedMenuItem::separator(app)?)?;
    }

    menu.append(&MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, "quit", "Quit Flow", true, None::<&str>)?)?;

    Ok(menu)
}

fn refresh_tray_menu(app: &tauri::AppHandle) {
    if let Some(tray) = app.tray_by_id("flow-tray") {
        if let Ok(menu) = build_tray_menu(app) {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

fn execute_workspace_from_tray(app: &tauri::AppHandle, workspace_id: String) {
    let (items, workspaces, _) = load_tray_data(app);
    if let Some(ws) = workspaces.iter().find(|w| w.id == workspace_id) {
        let use_new_window = ws.browser_open_mode.as_deref() != Some("active-session");

        if use_new_window {
            let urls: Vec<String> = ws.item_ids.iter().filter_map(|id| {
                let item = items.iter().find(|i| &i.id == id)?;
                let auto_exec = ws.item_settings.get(id).map(|s| s.auto_execute).unwrap_or(true);
                if auto_exec && item.item_type == "website" {
                    Some(item.target.clone())
                } else {
                    None
                }
            }).collect();
            let _ = open_urls_new_window(&urls);

            for item_id in &ws.item_ids {
                if let Some(item) = items.iter().find(|i| &i.id == item_id) {
                    let auto_exec = ws.item_settings.get(item_id).map(|s| s.auto_execute).unwrap_or(true);
                    if auto_exec && item.item_type != "website" {
                        let _ = do_open_path(&item.target);
                    }
                }
            }
        } else {
            for item_id in &ws.item_ids {
                if let Some(item) = items.iter().find(|i| &i.id == item_id) {
                    let auto_exec = ws.item_settings.get(item_id).map(|s| s.auto_execute).unwrap_or(true);
                    if auto_exec {
                        let _ = match item.item_type.as_str() {
                            "website" => do_open_url(&item.target),
                            _ => do_open_path(&item.target),
                        };
                    }
                }
            }
        }
    }
}

fn execute_item_from_tray(app: &tauri::AppHandle, item_id: String) {
    let (items, _, _) = load_tray_data(app);
    if let Some(item) = items.iter().find(|i| i.id == item_id) {
        let _ = match item.item_type.as_str() {
            "website" => do_open_url(&item.target),
            _ => do_open_path(&item.target),
        };
    }
}

// ── Menu event handler ────────────────────────────────────────────────────────

fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    eprintln!("[flow] menu event: {}", event.id().as_ref());
    match event.id().as_ref() {
        "open" => {
            #[cfg(target_os = "macos")]
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }
        "palette" => toggle_palette(app),
        "settings" => {
            #[cfg(target_os = "macos")]
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.emit("navigate", "settings");
            }
        }
        "quit" => std::process::exit(0),
        // CMD+Q from the macOS app menu — respect keep_in_background
        "app_quit" => {
            let keep = app.state::<SharedSettings>().lock().unwrap().keep_in_background;
            if keep {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            } else {
                std::process::exit(0);
            }
        }
        id => {
            if let Some(rest) = id.strip_prefix("workspace_") {
                execute_workspace_from_tray(app, rest.to_string());
            } else if let Some(rest) = id.strip_prefix("item_") {
                execute_item_from_tray(app, rest.to_string());
            }
        }
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_palette(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // 1. Load settings and register as shared state
            let settings = load_settings(&app.handle().clone());
            let shared: SharedSettings = Arc::new(Mutex::new(settings.clone()));
            app.manage(shared.clone());

            // 2. Register global shortcut
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                app.global_shortcut()
                    .register(settings.palette_shortcut.as_str())
                    .map_err(|e| e.to_string())?;
            }

            // 3. Build tray icon and menu
            {
                use tauri::tray::TrayIconBuilder;
                let menu = build_tray_menu(app.handle())?;
                let icon = app
                    .default_window_icon()
                    .cloned()
                    .ok_or("No app icon found")?;
                match TrayIconBuilder::with_id("flow-tray")
                    .tooltip("Flow")
                    .icon(icon)
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .build(app)
                {
                    Ok(_) => eprintln!("[flow] tray icon initialized successfully"),
                    Err(e) => eprintln!("[flow] tray icon FAILED: {}", e),
                }
            }

            // 4. Override macOS app menu so CMD+Q goes through our handler
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
                let quit_item = MenuItemBuilder::with_id("app_quit", "Quit Flow")
                    .accelerator("CmdOrCtrl+Q")
                    .build(app)?;
                let app_submenu = SubmenuBuilder::new(app, "Flow")
                    .about(None)
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .item(&quit_item)
                    .build()?;
                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;
                let win_submenu = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .item(&PredefinedMenuItem::maximize(app, None)?)
                    .separator()
                    .close_window()
                    .build()?;
                let menu = MenuBuilder::new(app)
                    .item(&app_submenu)
                    .item(&edit_submenu)
                    .item(&win_submenu)
                    .build()?;
                app.set_menu(menu)?;
            }

            // 5. Global menu event handler (app menu + tray menu clicks)
            app.on_menu_event(handle_menu_event);

            // 6. Main window close handler
            if let Some(main_win) = app.get_webview_window("main") {
                let main_win_clone = main_win.clone();
                let shared_clone = shared.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        eprintln!("[flow] CloseRequested received");
                        let keep = shared_clone.lock().unwrap().keep_in_background;
                        if keep {
                            eprintln!("[flow] keep_in_background=true → hiding window");
                            api.prevent_close();
                            let _ = main_win_clone.hide();
                            #[cfg(target_os = "macos")]
                            {
                                let _ = main_win_clone.app_handle()
                                    .set_activation_policy(tauri::ActivationPolicy::Accessory);
                                eprintln!("[flow] switched to Accessory activation policy");
                            }
                        } else {
                            eprintln!("[flow] keep_in_background=false → exiting");
                            let handle = main_win_clone.app_handle().clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(50));
                                handle.exit(0);
                            });
                        }
                    }
                });
            }

            // 7. Apply startup settings
            if !settings.show_main_window_at_startup {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            if settings.open_palette_at_startup {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    if let Some(w) = handle.get_webview_window("palette") {
                        let _ = w.show();
                        let _ = w.center();
                        let _ = w.set_focus();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            path_exists,
            open_item_path,
            open_item_url,
            open_in_vscode,
            open_in_terminal,
            launch_item,
            show_palette,
            hide_palette,
            load_items,
            save_items,
            load_workspaces,
            save_workspaces,
            load_recents,
            record_recent,
            export_config,
            import_config,
            clear_all_data,
            get_palette_shortcut,
            set_palette_shortcut,
            get_settings,
            save_app_settings,
            open_urls_in_browser_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                eprintln!("[flow] ExitRequested received");
                let keep = app_handle
                    .state::<SharedSettings>()
                    .lock()
                    .unwrap()
                    .keep_in_background;
                if keep {
                    eprintln!("[flow] preventing exit (keep_in_background=true)");
                    api.prevent_exit();
                }
            }
        });
}
