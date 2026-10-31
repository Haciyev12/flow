use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Manager;

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
}

// ── Workspace model ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Workspace {
    id: String,
    name: String,
    description: String,
    icon: String,
    color: String,
    item_ids: Vec<String>,
    created_at: String,
    updated_at: String,
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
/// - .app  → launches the application
/// - file  → opens in the OS-default app for that file type
/// - folder → opens in Finder
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

// ── Persistence ───────────────────────────────────────────────────────────────
//
// Items are stored at: ~/Library/Application Support/com.amal.flow/items.json
// On first run, any existing projects.json is transparently migrated.

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

// ── App entry ─────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            path_exists,
            open_item_path,
            open_item_url,
            open_in_vscode,
            open_in_terminal,
            load_items,
            save_items,
            load_workspaces,
            save_workspaces,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
