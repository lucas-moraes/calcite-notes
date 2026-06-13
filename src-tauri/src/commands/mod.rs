use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub fn strip_frontmatter(content: &str) -> String {
    let re = regex::Regex::new(r"(?ms)^---\n.*?\n---\n*").unwrap();
    re.replace(content, "").to_string()
}

pub fn parse_frontmatter_full(content: &str) -> HashMap<String, String> {
    use regex::Regex;
    let mut props = HashMap::new();
    let frontmatter_re = Regex::new(r"(?ms)^---\n([\s\S]*?)\n---").unwrap();

    if let Some(caps) = frontmatter_re.captures(content) {
        let block = &caps[1];
        for line in block.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }
            if let Some(pos) = line.find(':') {
                let key = line[..pos].trim().to_string();
                let mut val = line[pos + 1..].trim().to_string();
                if val.starts_with('[') && val.ends_with(']') {
                    let inner = &val[1..val.len() - 1];
                    let joined: Vec<&str> = inner
                        .split(',')
                        .map(|s| s.trim().trim_matches('\'').trim_matches('"'))
                        .filter(|s| !s.is_empty())
                        .collect();
                    val = joined.join(",");
                }
                if !key.is_empty() {
                    props.insert(key, val);
                }
            }
        }
    }
    props
}

pub fn parse_tags(props: &HashMap<String, String>) -> Vec<String> {
    props.get("tags")
        .map(|v| {
            v.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub tags: Vec<String>,
    pub properties: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNote {
    pub id: String,
    pub name: String,
    pub content: String,
    pub created_at: Option<u64>,
    pub updated_at: Option<u64>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileReadResult {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub tags: Vec<String>,
    pub properties: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub success: bool,
    pub error: Option<String>,
    pub new_path: Option<String>,
    pub path: Option<String>,
}

pub mod notes;
pub mod config;
pub mod filesystem;
pub mod git;