use crate::commands::{FileEntry, OperationResult};
use std::fs;
use std::path::Path;
use tauri::State;
use walkdir::WalkDir;

use crate::commands::notes::AppState;

fn is_path_within_notes_dir(file_path: &str, notes_dir: &str) -> bool {
    let resolved_path = Path::new(file_path).canonicalize().unwrap_or_default();
    let resolved_notes_dir = Path::new(notes_dir).canonicalize().unwrap_or_default();
    resolved_path.starts_with(&resolved_notes_dir)
}

#[tauri::command]
pub fn delete_folder(state: State<'_, AppState>, folder_path: String) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&folder_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied: path outside notes directory".to_string()),
            new_path: None,
            path: None,
        };
    }

    if Path::new(&folder_path).exists() {
        match fs::remove_dir_all(&folder_path) {
            Ok(_) => OperationResult {
                success: true,
                error: None,
                new_path: None,
                path: None,
            },
            Err(e) => OperationResult {
                success: false,
                error: Some(e.to_string()),
                new_path: None,
                path: None,
            },
        }
    } else {
        OperationResult {
            success: false,
            error: Some("Folder not found".to_string()),
            new_path: None,
            path: None,
        }
    }
}

#[tauri::command]
pub fn has_md_files(_state: State<'_, AppState>, dir_path: String) -> bool {
    for entry in WalkDir::new(&dir_path)
        .follow_links(true)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            return true;
        }
    }
    false
}

#[tauri::command]
pub fn create_folder(
    state: State<'_, AppState>,
    parent_path: String,
    folder_name: String,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&parent_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    let sanitized_name = folder_name.replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
    let new_path = Path::new(&parent_path).join(&sanitized_name);

    if new_path.exists() {
        return OperationResult {
            success: false,
            error: Some("A folder with this name already exists".to_string()),
            new_path: None,
            path: None,
        };
    }

    match fs::create_dir_all(&new_path) {
        Ok(_) => OperationResult {
            success: true,
            error: None,
            new_path: None,
            path: Some(new_path.to_string_lossy().to_string()),
        },
        Err(e) => OperationResult {
            success: false,
            error: Some(e.to_string()),
            new_path: None,
            path: None,
        },
    }
}

#[tauri::command]
pub fn rename_folder(
    state: State<'_, AppState>,
    old_path: String,
    new_name: String,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&old_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    let sanitized_name = new_name.replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
    let parent = Path::new(&old_path).parent().unwrap_or(Path::new(&notes_dir));
    let new_path = parent.join(&sanitized_name);

    if new_path.exists() && new_path != Path::new(&old_path) {
        return OperationResult {
            success: false,
            error: Some("A folder with this name already exists".to_string()),
            new_path: None,
            path: None,
        };
    }

    match fs::rename(&old_path, &new_path) {
        Ok(_) => OperationResult {
            success: true,
            error: None,
            new_path: Some(new_path.to_string_lossy().to_string()),
            path: None,
        },
        Err(e) => OperationResult {
            success: false,
            error: Some(e.to_string()),
            new_path: None,
            path: None,
        },
    }
}

#[tauri::command]
pub fn move_file(
    state: State<'_, AppState>,
    source_path: String,
    dest_folder: String,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&source_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    if !is_path_within_notes_dir(&dest_folder, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    let file_name = Path::new(&source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let mut dest_path = Path::new(&dest_folder).join(&file_name);

    if dest_path.exists() {
        let name_without_ext = dest_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let mut counter = 1;
        let mut new_file_name = format!("{}-{}.md", name_without_ext, counter);
        dest_path = Path::new(&dest_folder).join(&new_file_name);

        while dest_path.exists() {
            counter += 1;
            new_file_name = format!("{}-{}.md", name_without_ext, counter);
            dest_path = Path::new(&dest_folder).join(&new_file_name);
        }
    }

    match fs::rename(&source_path, &dest_path) {
        Ok(_) => OperationResult {
            success: true,
            error: None,
            new_path: Some(dest_path.to_string_lossy().to_string()),
            path: None,
        },
        Err(e) => OperationResult {
            success: false,
            error: Some(e.to_string()),
            new_path: None,
            path: None,
        },
    }
}

#[tauri::command]
pub fn create_file(
    state: State<'_, AppState>,
    dir_path: String,
    file_name: String,
    content: Option<String>,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&dir_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    let sanitized_name = file_name.replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
    let file_path = Path::new(&dir_path).join(format!("{}.md", sanitized_name));

    if file_path.exists() {
        return OperationResult {
            success: false,
            error: Some("A file with this name already exists".to_string()),
            new_path: None,
            path: None,
        };
    }

    let default_content = content.unwrap_or_else(|| {
        let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
        format!(
            "---\ntitle: {}\ndate: {}\ntags: []\n#\n---\n",
            sanitized_name, date
        )
    });

    match fs::write(&file_path, default_content) {
        Ok(_) => OperationResult {
            success: true,
            error: None,
            new_path: None,
            path: Some(file_path.to_string_lossy().to_string()),
        },
        Err(e) => OperationResult {
            success: false,
            error: Some(e.to_string()),
            new_path: None,
            path: None,
        },
    }
}

#[tauri::command]
pub fn get_directory(dir_path: String) -> Vec<FileEntry> {
    let path = Path::new(&dir_path);
    if !path.exists() || !path.is_dir() {
        return Vec::new();
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    if let Ok(read_dir) = fs::read_dir(path) {
        for entry in read_dir.filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            let name = entry_path.file_name().unwrap_or_default().to_string_lossy().to_string();

            if name.starts_with('.') {
                continue;
            }

            let is_dir = entry_path.is_dir();
            if is_dir || name.ends_with(".md") {
                entries.push(FileEntry {
                    name,
                    path: entry_path.to_string_lossy().to_string(),
                    is_directory: is_dir,
                });
            }
        }
    }

    entries.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            b.is_directory.cmp(&a.is_directory)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    entries
}

use crate::commands::FileReadResult;

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, file_path: String) -> Option<FileReadResult> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&file_path, &notes_dir) {
        log::error!("read_file: Access denied for path: {}", file_path);
        return None;
    }

    let path = Path::new(&file_path);
    if !path.exists() {
        log::error!("read_file: File not found: {}", file_path);
        return None;
    }

    let content = fs::read_to_string(path).ok()?;
    let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
    let metadata = fs::metadata(path).ok();
    let props = crate::commands::parse_frontmatter_full(&content);
    let tags = crate::commands::parse_tags(&props);

    Some(FileReadResult {
        id: file_path,
        title: name,
        content,
        created_at: metadata
            .as_ref()
            .and_then(|m| m.created().ok())
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64)
            .unwrap_or(0),
        updated_at: metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64)
            .unwrap_or(0),
        tags,
        properties: props,
    })
}
