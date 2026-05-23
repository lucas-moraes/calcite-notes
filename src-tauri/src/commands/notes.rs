use crate::commands::{GraphNote, Note, OperationResult};
use regex::Regex;
use std::fs;
use std::path::Path;
use tauri::State;
use walkdir::WalkDir;

pub struct AppState {
    pub notes_dir: std::sync::Mutex<String>,
}

fn parse_frontmatter(content: &str) -> Vec<String> {
    let frontmatter_regex = Regex::new(r"^---\n([\s\S]*?)\n---").unwrap();
    let tags_regex = Regex::new(r"tags:\s*\[(.*?)\]").unwrap();

    if let Some(captures) = frontmatter_regex.captures(content) {
        if let Some(tags_capture) = tags_regex.captures(&captures[1]) {
            let tags_str = tags_capture.get(1).map_or("", |m| m.as_str());
            return tags_str
                .replace(['\'', '"', ' '], "")
                .split(',')
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect();
        }
    }
    Vec::new()
}

fn is_path_within_notes_dir(file_path: &str, notes_dir: &str) -> bool {
    let resolved_path = Path::new(file_path).canonicalize().unwrap_or_default();
    let resolved_notes_dir = Path::new(notes_dir).canonicalize().unwrap_or_default();
    resolved_path.starts_with(&resolved_notes_dir)
}

#[tauri::command]
pub fn get_notes(state: State<'_, AppState>) -> Vec<Note> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    if notes_dir.is_empty() {
        return Vec::new();
    }

    let mut notes = Vec::new();

    for entry in WalkDir::new(&notes_dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            if let Ok(content) = fs::read_to_string(path) {
                let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let metadata = fs::metadata(path).ok();
                let tags = parse_frontmatter(&content);

                notes.push(Note {
                    id: path.to_string_lossy().to_string(),
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
                });
            }
        }
    }

    notes
}

#[tauri::command]
pub fn get_all_notes_for_graph(state: State<'_, AppState>) -> Vec<GraphNote> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    if notes_dir.is_empty() {
        return Vec::new();
    }

    let mut notes = Vec::new();

    for entry in WalkDir::new(&notes_dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            if let Ok(content) = fs::read_to_string(path) {
                let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let metadata = fs::metadata(path).ok();
                let tags = parse_frontmatter(&content);

                notes.push(GraphNote {
                    id: path.to_string_lossy().to_string(),
                    name,
                    content,
                    created_at: metadata
                        .as_ref()
                        .and_then(|m| m.created().ok())
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64),
                    updated_at: metadata
                        .as_ref()
                        .and_then(|m| m.modified().ok())
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64),
                    tags,
                });
            }
        }
    }

    notes
}

#[tauri::command]
pub fn save_note(
    state: State<'_, AppState>,
    note: Note,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    let file_path = if note.id.ends_with(".md") {
        note.id.clone()
    } else {
        format!("{}/{}.md", notes_dir, note.id)
    };

    if !is_path_within_notes_dir(&file_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied: path outside notes directory".to_string()),
            new_path: None,
            path: None,
        };
    }

    match fs::write(&file_path, &note.content) {
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
}

#[tauri::command]
pub fn delete_note(state: State<'_, AppState>, file_path: String) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&file_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied: path outside notes directory".to_string()),
            new_path: None,
            path: None,
        };
    }

    if Path::new(&file_path).exists() {
        match fs::remove_file(&file_path) {
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
            error: Some("File not found".to_string()),
            new_path: None,
            path: None,
        }
    }
}

#[tauri::command]
pub fn save_new_note(
    state: State<'_, AppState>,
    file_path: String,
    content: String,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&file_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied: path outside notes directory".to_string()),
            new_path: None,
            path: None,
        };
    }

    match fs::write(&file_path, &content) {
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
}

#[tauri::command]
pub fn rename_note(
    state: State<'_, AppState>,
    old_path: String,
    new_file_name: String,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&old_path, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied: path outside notes directory".to_string()),
            new_path: None,
            path: None,
        };
    }

    let sanitized_name = new_file_name.replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
    let dir = Path::new(&old_path).parent().unwrap_or(Path::new(&notes_dir));
    let new_path = dir.join(format!("{}.md", sanitized_name));

    if new_path.exists() {
        return OperationResult {
            success: false,
            error: Some("A file with this name already exists".to_string()),
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
pub fn update_note_tags(
    state: State<'_, AppState>,
    note_id: String,
    tags: Vec<String>,
) -> OperationResult {
    let notes_dir = state.notes_dir.lock().unwrap().clone();

    if !is_path_within_notes_dir(&note_id, &notes_dir) {
        return OperationResult {
            success: false,
            error: Some("Access denied".to_string()),
            new_path: None,
            path: None,
        };
    }

    let content = match fs::read_to_string(&note_id) {
        Ok(c) => c,
        Err(e) => {
            return OperationResult {
                success: false,
                error: Some(e.to_string()),
                new_path: None,
                path: None,
            }
        }
    };

    let frontmatter_regex = Regex::new(r"(?m)^---\n([\s\S]*?)\n---").unwrap();
    let tags_line = format!("tags: [{}]", tags.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(", "));

    let new_content = if frontmatter_regex.is_match(&content) {
        let new_frontmatter = frontmatter_regex.replace(&content, |caps: &regex::Captures| {
            let mut frontmatter = caps[1].to_string();
            if frontmatter.contains("tags:") {
                frontmatter = Regex::new(r"tags:\s*\[.*?\]").unwrap().replace(&frontmatter, &tags_line).to_string();
            } else {
                frontmatter.push_str(&format!("\n{}", tags_line));
            }
            format!("---\n{}\n---", frontmatter)
        }).to_string();
        new_frontmatter
    } else {
        format!("---\n{}\n---\n\n{}", tags_line, content)
    };

    match fs::write(&note_id, new_content) {
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
}