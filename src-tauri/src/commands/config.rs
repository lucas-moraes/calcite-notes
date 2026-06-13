use crate::commands::notes::AppState;
use tauri::State;
use tauri_plugin_store::StoreExt;
use serde_json;

#[tauri::command]
pub fn get_notes_folder(state: State<'_, AppState>) -> String {
    state.notes_dir.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_notes_dir(app_handle: tauri::AppHandle, state: State<'_, AppState>, dir: String) -> Result<bool, String> {
    {
        let mut notes_dir = state.notes_dir.lock().unwrap();
        *notes_dir = dir.clone();
    }
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("notes_dir", serde_json::Value::String(dir));
            s.save().map_err(|e| e.to_string()).map(|_| true)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_theme(app_handle: tauri::AppHandle) -> String {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("theme")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "dark".to_string()),
        Err(_) => "dark".to_string(),
    }
}

#[tauri::command]
pub fn save_theme(app_handle: tauri::AppHandle, theme: String) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("theme", serde_json::Value::String(theme));
            s.save().is_ok()
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn get_tree_width(app_handle: tauri::AppHandle) -> u32 {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("treeWidth")
            .and_then(|v| v.as_u64())
            .map(|v| v as u32)
            .unwrap_or(350),
        Err(_) => 350,
    }
}

#[tauri::command]
pub fn save_tree_width(app_handle: tauri::AppHandle, width: u32) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("treeWidth", serde_json::Value::Number(width.into()));
            s.save().is_ok()
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn get_show_graph(app_handle: tauri::AppHandle) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("showGraph")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        Err(_) => true,
    }
}

#[tauri::command]
pub fn save_show_graph(app_handle: tauri::AppHandle, show: bool) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("showGraph", serde_json::Value::Bool(show));
            s.save().is_ok()
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn get_open_tabs(app_handle: tauri::AppHandle) -> Vec<String> {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("openTabs")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok())
            .unwrap_or_default(),
        Err(_) => vec![],
    }
}

#[tauri::command]
pub fn save_open_tabs(app_handle: tauri::AppHandle, tabs: Vec<String>) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("openTabs", serde_json::Value::Array(
                tabs.into_iter().map(serde_json::Value::String).collect()
            ));
            s.save().is_ok()
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn get_active_tab(app_handle: tauri::AppHandle) -> Option<String> {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("activeTab")
            .and_then(|v| v.as_str().map(String::from)),
        Err(_) => None,
    }
}

#[tauri::command]
pub fn get_editor_mode(app_handle: tauri::AppHandle) -> String {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => s
            .get("editorMode")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "raw".to_string()),
        Err(_) => "raw".to_string(),
    }
}

#[tauri::command]
pub fn save_editor_mode(app_handle: tauri::AppHandle, mode: String) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("editorMode", serde_json::Value::String(mode));
            s.save().is_ok()
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub fn save_active_tab(app_handle: tauri::AppHandle, tab: Option<String>) -> bool {
    let store = app_handle.store("settings.json");
    match store {
        Ok(s) => {
            s.set("activeTab", match tab {
                Some(t) => serde_json::Value::String(t),
                None => serde_json::Value::Null,
            });
            s.save().is_ok()
        }
        Err(_) => false,
    }
}
