use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

// ── Data model ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherItem {
    id: String,
    #[serde(rename = "type")]
    item_type: String,
    name: String,
    description: String,
    /// Filesystem path for app/project/file/folder; URL for website.
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
    created_at: String,
    updated_at: String,
}

// ── Recents model ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecentEntry {
    id: String,
    kind: String,  // "item" or "workspace"
    used_at: String,
}

// ── Validation ────────────────────────────────────────────────────────────────

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

// ── Launchers ─────────────────────────────────────────────────────────────────
//
// All commands use Command::new(...).arg(&value) — the value is always passed
// as a separate OS-level argument, never interpolated into a shell string.
// This eliminates any possibility of command injection.

/// Opens any file, folder, or .app bundle with the macOS default handler.
#[tauri::command]
fn open_item_path(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(format!("\"{}\" was not found on disk.", path));
    }
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Could not open: {}", e))?;
    Ok(())
}

/// Opens a URL in the default browser. Only http/https are permitted.
#[tauri::command]
fn open_item_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only https:// and http:// URLs are supported.".into());
    }
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Could not open URL: {}", e))?;
    Ok(())
}

/// Opens a project folder in Visual Studio Code.
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

/// Opens a project folder in Terminal.app.
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

/// Launches a single workspace item.
/// item_type must be one of: "app", "file", "folder", "project", "website".
/// Paths are passed as separate OS arguments — never interpolated into a shell string.
#[tauri::command]
fn launch_item(item_type: String, target: String) -> Result<(), String> {
    match item_type.as_str() {
        "app" | "file" | "folder" | "project" => {
            if !Path::new(&target).exists() {
                return Err(format!("\"{}\" was not found on disk.", target));
            }
            std::process::Command::new("open")
                .arg(&target)
                .spawn()
                .map_err(|e| format!("Could not open: {}", e))?;
        }
        "website" => {
            if !target.starts_with("https://") && !target.starts_with("http://") {
                return Err("Only https:// and http:// URLs are supported.".into());
            }
            std::process::Command::new("open")
                .arg(&target)
                .spawn()
                .map_err(|e| format!("Could not open URL: {}", e))?;
        }
        other => return Err(format!("Unknown item type: \"{}\".", other)),
    }
    Ok(())
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

/// Used only to migrate from the legacy projects.json format.
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

    // Migrate from legacy projects.json (Stage 2 data).
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
    std::fs::write(dir.join("items.json"), content).map_err(|e| e.to_string())
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
    std::fs::write(dir.join("workspaces.json"), content).map_err(|e| e.to_string())
}

// ── Export / Import ───────────────────────────────────────────────────────────

/// Returns a JSON string containing all items and workspaces ready for download.
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

/// Accepts a JSON config string and merges or replaces the stored data.
/// `merge = true` skips items/workspaces whose IDs already exist.
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

    Ok(ImportResult {
        items_added,
        workspaces_added,
    })
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            app.global_shortcut()
                .register("CommandOrControl+Shift+Space")
                .map_err(|e| e.to_string())?;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
