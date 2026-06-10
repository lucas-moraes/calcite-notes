use crate::commands::notes::AppState;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileDiff {
    pub path: String,
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub additions: u32,
    pub deletions: u32,
}

fn get_repo(notes_dir: &str) -> Result<git2::Repository, String> {
    let path = std::path::Path::new(notes_dir);
    git2::Repository::open(path).map_err(|e| format!("Failed to open repository: {}", e))
}

#[tauri::command]
pub fn git_init(state: State<'_, AppState>) -> Result<bool, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let path = std::path::Path::new(&notes_dir);

    if git2::Repository::open(path).is_ok() {
        return Ok(false);
    }

    git2::Repository::init(path)
        .map(|_| true)
        .map_err(|e| format!("Failed to init repository: {}", e))
}

#[tauri::command]
pub fn git_status(state: State<'_, AppState>) -> Result<Vec<GitFileStatus>, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let repo = get_repo(&notes_dir)?;

    let mut statuses = Vec::new();
    let status_entries = repo
        .statuses(None)
        .map_err(|e| format!("Failed to get statuses: {}", e))?;

    for entry in status_entries.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let status_flag = entry.status();
        let status_str = if status_flag.is_wt_new() || status_flag.is_index_new() {
            "new"
        } else if status_flag.is_wt_deleted() || status_flag.is_index_deleted() {
            "deleted"
        } else if status_flag.is_wt_modified()
            || status_flag.is_index_modified()
            || status_flag.is_wt_renamed()
            || status_flag.is_index_renamed()
        {
            "modified"
        } else {
            "unmodified"
        };

        statuses.push(GitFileStatus {
            path,
            status: status_str.to_string(),
        });
    }

    Ok(statuses)
}

#[tauri::command]
pub fn git_commit(state: State<'_, AppState>, message: String) -> Result<crate::commands::OperationResult, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let repo = get_repo(&notes_dir)?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    index
        .add_all(&["."], git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add files: {}", e))?;
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;

    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    let sig = repo
        .signature()
        .or_else(|_| git2::Signature::now("Calcite", "calcite@local"))
        .map_err(|e| format!("Failed to create signature: {}", e))?;

    let head = repo.head().ok();
    let parent_commit = head.as_ref().and_then(|h| h.target()).and_then(|oid| repo.find_commit(oid).ok());

    let result = match parent_commit {
        Some(parent) => repo
            .commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&parent])
            .map_err(|e| format!("Failed to commit: {}", e))?,
        None => repo
            .commit(Some("HEAD"), &sig, &sig, &message, &tree, &[])
            .map_err(|e| format!("Failed to commit: {}", e))?,
    };

    Ok(crate::commands::OperationResult {
        success: true,
        error: None,
        new_path: Some(result.to_string()),
        path: None,
    })
}

#[tauri::command]
pub fn git_log(state: State<'_, AppState>, limit: u32) -> Result<Vec<GitCommit>, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let repo = get_repo(&notes_dir)?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    revwalk
        .push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;

    let mut commits = Vec::new();
    for (i, oid_result) in revwalk.enumerate() {
        if i >= limit as usize {
            break;
        }
        let oid = oid_result.map_err(|e| format!("Failed to get OID: {}", e))?;
        let commit = repo
            .find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;

        let hash = commit.id().to_string();
        let short_hash = hash.chars().take(7).collect();
        let message = commit.message().unwrap_or("").to_string();
        let author = commit
            .author()
            .name()
            .unwrap_or("Unknown")
            .to_string();
        let timestamp = commit.time().seconds();

        commits.push(GitCommit {
            hash,
            short_hash,
            message,
            author,
            timestamp,
        });
    }

    Ok(commits)
}

#[tauri::command]
pub fn git_diff_file(
    state: State<'_, AppState>,
    path: String,
    commit_hash: String,
) -> Result<GitFileDiff, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let repo = get_repo(&notes_dir)?;

    let full_path = if Path::new(&path).is_absolute() {
        path.clone()
    } else {
        format!("{}/{}", notes_dir, path)
    };

    if !crate::commands::notes::is_path_within_notes_dir(&full_path, &notes_dir) {
        return Err("Path is outside notes directory".to_string());
    }

    let new_content = std::fs::read_to_string(&full_path).ok();

    let commit_oid = git2::Oid::from_str(&commit_hash)
        .map_err(|e| format!("Invalid commit hash: {}", e))?;
    let commit = repo
        .find_commit(commit_oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;

    let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;

    let relative_path = if Path::new(&path).is_absolute() {
        Path::new(&path)
            .strip_prefix(&notes_dir)
            .map_err(|e| format!("Failed to strip prefix: {}", e))?
            .to_string_lossy()
            .to_string()
    } else {
        path.clone()
    };

    let old_content = tree
        .get_path(Path::new(&relative_path))
        .ok()
        .and_then(|entry| entry.to_object(&repo).ok())
        .and_then(|obj| obj.as_blob().map(|b| String::from_utf8_lossy(b.content()).to_string()))
        .or_else(|| {
            let parent = commit.parent(0).ok()?;
            let parent_tree = parent.tree().ok()?;
            parent_tree
                .get_path(Path::new(&relative_path))
                .ok()
                .and_then(|entry| entry.to_object(&repo).ok())
                .and_then(|obj| {
                    obj.as_blob()
                        .map(|b| String::from_utf8_lossy(b.content()).to_string())
                })
        });

    let mut additions = 0u32;
    let mut deletions = 0u32;
    if let (Some(ref old), Some(ref new)) = (&old_content, &new_content) {
        for line in old.lines() {
            if !new.lines().any(|l| l == line) {
                deletions += 1;
            }
        }
        for line in new.lines() {
            if !old.lines().any(|l| l == line) {
                additions += 1;
            }
        }
    }

    Ok(GitFileDiff {
        path: relative_path,
        old_content,
        new_content,
        additions,
        deletions,
    })
}

#[tauri::command]
pub fn git_restore_file(
    state: State<'_, AppState>,
    path: String,
    commit_hash: String,
) -> Result<crate::commands::OperationResult, String> {
    let notes_dir = state.notes_dir.lock().unwrap().clone();
    let repo = get_repo(&notes_dir)?;

    let full_path = if Path::new(&path).is_absolute() {
        path.clone()
    } else {
        format!("{}/{}", notes_dir, path)
    };

    if !crate::commands::notes::is_path_within_notes_dir(&full_path, &notes_dir) {
        return Err("Path is outside notes directory".to_string());
    }

    let commit_oid = git2::Oid::from_str(&commit_hash)
        .map_err(|e| format!("Invalid commit hash: {}", e))?;
    let commit = repo
        .find_commit(commit_oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;

    let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;

    let relative_path = if Path::new(&path).is_absolute() {
        Path::new(&path)
            .strip_prefix(&notes_dir)
            .map_err(|e| format!("Failed to strip prefix: {}", e))?
            .to_string_lossy()
            .to_string()
    } else {
        path.clone()
    };

    let entry = tree
        .get_path(Path::new(&relative_path))
        .map_err(|e| format!("File not found in commit: {}", e))?;

    let blob = repo
        .find_blob(entry.id())
        .map_err(|e| format!("Failed to find blob: {}", e))?;

    let content = blob.content();
    std::fs::write(&full_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(crate::commands::OperationResult {
        success: true,
        error: None,
        new_path: None,
        path: Some(full_path),
    })
}