mod commands;

use commands::notes::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_store::StoreExt;

fn setup_menu(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, Some("CmdOrCtrl+N"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let choose_folder = MenuItem::with_id(app, "choose_folder", "Choose Notes Folder...", true, Some("CmdOrCtrl+Shift+O"))?;
    let open_folder = MenuItem::with_id(app, "open_folder", "Open Notes Folder", true, None::<&str>)?;
    let close = PredefinedMenuItem::close_window(app, None)?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_note,
            &separator,
            &choose_folder,
            &open_folder,
            &separator,
            &close,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "toggle_devtools", "Toggle Developer Tools", true, Some("CmdOrCtrl+Shift+I"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::bring_all_to_front(app, None)?,
        ],
    )?;

    let menu = Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &window_menu])?;
    app.set_menu(menu)?;

    Ok(())
}

fn get_default_notes_dir() -> String {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("calcite")
        .join("notes")
        .to_string_lossy()
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let default_notes_dir = get_default_notes_dir();
    std::fs::create_dir_all(&default_notes_dir).ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(AppState {
            notes_dir: std::sync::Mutex::new(default_notes_dir.clone()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_notes,
            commands::notes::get_all_notes_for_graph,
            commands::notes::save_note,
            commands::notes::delete_note,
            commands::notes::save_new_note,
            commands::notes::rename_note,
            commands::notes::update_note_tags,
            commands::filesystem::delete_folder,
            commands::filesystem::has_md_files,
            commands::filesystem::create_folder,
            commands::filesystem::rename_folder,
            commands::filesystem::move_file,
            commands::filesystem::create_file,
            commands::filesystem::get_directory,
            commands::filesystem::read_file,
            commands::config::get_notes_folder,
            commands::config::set_notes_dir,
            commands::config::get_theme,
            commands::config::save_theme,
            commands::config::get_tree_width,
            commands::config::save_tree_width,
            commands::config::get_show_graph,
            commands::config::save_show_graph,
            commands::notes::update_note_properties,
            commands::notes::search_notes,
            commands::config::get_open_tabs,
            commands::config::save_open_tabs,
            commands::config::get_active_tab,
            commands::config::save_active_tab,
            commands::config::get_sidebar_width,
            commands::config::save_sidebar_width,
            commands::config::get_editor_mode,
            commands::config::save_editor_mode,
            commands::git::git_init,
            commands::git::git_status,
            commands::git::git_commit,
            commands::git::git_log,
            commands::git::git_diff_file,
            commands::git::git_restore_file,
            select_notes_folder,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            let app_state = app.state::<AppState>();
            if let Ok(store) = app.store("settings.json") {
                if let Some(val) = store.get("notes_dir") {
                    if let Some(saved) = val.as_str() {
                        let mut notes_dir = app_state.notes_dir.lock().unwrap();
                        *notes_dir = saved.to_string();
                        log::info!("Notes directory loaded from store: {}", saved);
                    }
                } else {
                    let notes_dir = app_state.notes_dir.lock().unwrap().clone();
                    store.set("notes_dir", serde_json::Value::String(notes_dir.clone()));
                    let _ = store.save();
                    log::info!("Notes directory saved to store: {}", notes_dir);
                }
            }

            let notes_dir = app.state::<AppState>().notes_dir.lock().unwrap().clone();
            log::info!("Notes directory: {}", notes_dir);

            setup_menu(&app.handle())?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let app_state = app.state::<AppState>();
            match event.id().as_ref() {
                "new_note" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu:new-note", ());
                    }
                }
                "choose_folder" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("choose-notes-folder", ());
                    }
                }
                "open_folder" => {
                    let dir = app_state.notes_dir.lock().unwrap().clone();
                    if !dir.is_empty() {
                        let _ = tauri_plugin_opener::open_path(&dir, None::<&str>);
                    }
                }
                "toggle_devtools" => {
                    if let Some(window) = app.get_webview_window("main") {
                        #[cfg(debug_assertions)]
                        {
                            if window.is_devtools_open() {
                                window.close_devtools();
                            } else {
                                window.open_devtools();
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                log::info!("Window close requested");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn select_notes_folder(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app_handle
        .dialog()
        .file()
        .set_title("Select Notes Folder")
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let path_str = path.to_string();
            {
                let mut dir = state.notes_dir.lock().unwrap();
                *dir = path_str.clone();
            }
            std::fs::create_dir_all(&path_str).map_err(|e| e.to_string())?;
            let _ = commands::config::set_notes_dir(app_handle.clone(), state, path_str.clone());
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.emit("reload-notes", ());
            }
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}