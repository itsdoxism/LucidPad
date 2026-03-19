use rfd::FileDialog;
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex,
};
use tauri::webview::DownloadEvent;
use tauri::{Emitter, WebviewWindowBuilder};

fn payload_str(payload: &Option<Value>, key: &str) -> String {
    payload
        .as_ref()
        .and_then(|p| p.get(key))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string()
}

fn decode_utf16(buffer: &[u8], big_endian: bool) -> String {
    let mut values = Vec::with_capacity(buffer.len() / 2);
    let mut i = 0usize;
    while i + 1 < buffer.len() {
        let pair = [buffer[i], buffer[i + 1]];
        let value = if big_endian {
            u16::from_be_bytes(pair)
        } else {
            u16::from_le_bytes(pair)
        };
        values.push(value);
        i += 2;
    }
    String::from_utf16_lossy(&values)
}

fn decode_buffer(buffer: &[u8]) -> (String, String) {
    if buffer.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return (
            "UTF-8".to_string(),
            String::from_utf8_lossy(&buffer[3..]).to_string(),
        );
    }
    if buffer.starts_with(&[0xFF, 0xFE]) {
        return ("UTF-16LE".to_string(), decode_utf16(&buffer[2..], false));
    }
    if buffer.starts_with(&[0xFE, 0xFF]) {
        return ("UTF-16BE".to_string(), decode_utf16(&buffer[2..], true));
    }
    (
        "UTF-8".to_string(),
        String::from_utf8_lossy(buffer).to_string(),
    )
}

fn resolve_export_default_path(file_name: &str, folder: &str) -> PathBuf {
    let trimmed = folder.trim();
    if trimmed.is_empty() {
        return PathBuf::from(file_name);
    }

    let resolved = PathBuf::from(trimmed);
    if fs::create_dir_all(&resolved).is_ok() && resolved.is_dir() {
        return resolved.join(file_name);
    }
    PathBuf::from(file_name)
}

fn open_file_dialog() -> Option<PathBuf> {
    FileDialog::new()
        .set_title("Open File")
        .add_filter("Text", &["txt", "md", "html"])
        .add_filter("All Files", &["*"])
        .pick_file()
}

fn save_file_dialog(title: &str, suggested_name: &str, preferred_ext: &str) -> Option<PathBuf> {
    let mut dialog = FileDialog::new().set_title(title);
    if !suggested_name.trim().is_empty() {
        dialog = dialog.set_file_name(suggested_name);
    }

    dialog = match preferred_ext {
        "md" => dialog
            .add_filter("Markdown", &["md"])
            .add_filter("Text", &["txt"])
            .add_filter("All Files", &["*"]),
        "txt" => dialog
            .add_filter("Text", &["txt"])
            .add_filter("Markdown", &["md"])
            .add_filter("All Files", &["*"]),
        _ => dialog
            .add_filter("Text", &["txt"])
            .add_filter("Markdown", &["md"])
            .add_filter("All Files", &["*"]),
    };

    dialog.save_file()
}

fn save_export_dialog(
    title: &str,
    default_path: &Path,
    filter_name: &str,
    ext: &[&str],
) -> Option<PathBuf> {
    let mut dialog = FileDialog::new()
        .set_title(title)
        .add_filter(filter_name, ext);
    if let Some(parent) = default_path.parent() {
        dialog = dialog.set_directory(parent);
    }
    if let Some(name) = default_path.file_name().and_then(|n| n.to_str()) {
        dialog = dialog.set_file_name(name);
    }
    dialog.save_file()
}

fn wrap_plain_text_lines(content: &str, max_chars: usize) -> Vec<String> {
    let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
    let mut lines = Vec::new();

    for raw in normalized.split('\n') {
        if raw.is_empty() {
            lines.push(String::new());
            continue;
        }

        let chars: Vec<char> = raw.chars().collect();
        if chars.len() <= max_chars {
            lines.push(raw.to_string());
            continue;
        }

        let mut start = 0usize;
        while start < chars.len() {
            let end = (start + max_chars).min(chars.len());
            let chunk: String = chars[start..end].iter().collect();
            lines.push(chunk);
            start = end;
        }
    }

    if lines.is_empty() {
        lines.push(String::new());
    }

    lines
}

fn export_text_as_pdf(file_path: &Path, content: &str) -> Result<(), String> {
    use printpdf::{BuiltinFont, Mm, PdfDocument};
    use std::fs::File;
    use std::io::BufWriter;

    let (doc, mut page, mut layer) =
        PdfDocument::new("LucidPad Export", Mm(210.0), Mm(297.0), "Layer 1");
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|error| format!("Failed to prepare PDF font: {error}"))?;
    let mut y = 287.0f64;
    let line_height = 5.5f64;

    for line in wrap_plain_text_lines(content, 110) {
        if y < 15.0 {
            let (next_page, next_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer");
            page = next_page;
            layer = next_layer;
            y = 287.0;
        }
        let current = doc.get_page(page).get_layer(layer);
        current.use_text(line, 11.0, Mm(10.0), Mm(y), &font);
        y -= line_height;
    }

    let file = File::create(file_path).map_err(|error| format!("Failed to create PDF: {error}"))?;
    doc.save(&mut BufWriter::new(file))
        .map_err(|error| format!("Failed to write PDF: {error}"))
}

#[tauri::command]
fn lp_action(name: String, payload: Option<Value>) -> Value {
    match name.as_str() {
        "git:branch" => {
            let repo_path = payload_str(&payload, "repoPath");
            let mut cmd = Command::new("git");
            cmd.arg("rev-parse").arg("--abbrev-ref").arg("HEAD");
            if !repo_path.trim().is_empty() {
                cmd.current_dir(repo_path.trim());
            }
            let branch = cmd
                .output()
                .ok()
                .filter(|output| output.status.success())
                .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
                .unwrap_or_default();
            json!({ "branch": branch })
        }
        "file:open" => {
            let Some(path) = open_file_dialog() else {
                return json!({ "canceled": true });
            };
            match fs::read(&path) {
                Ok(buffer) => {
                    let (encoding, content) = decode_buffer(&buffer);
                    json!({
                      "canceled": false,
                      "filePath": path.to_string_lossy().to_string(),
                      "content": content,
                      "encoding": encoding
                    })
                }
                Err(error) => {
                    json!({ "canceled": false, "error": format!("Open failed: {error}") })
                }
            }
        }
        "file:openPath" => {
            let file_path = payload_str(&payload, "filePath");
            if file_path.trim().is_empty() {
                return json!({ "canceled": true });
            }
            let path = PathBuf::from(file_path);
            match fs::read(&path) {
                Ok(buffer) => {
                    let (encoding, content) = decode_buffer(&buffer);
                    json!({
                      "canceled": false,
                      "filePath": path.to_string_lossy().to_string(),
                      "content": content,
                      "encoding": encoding
                    })
                }
                Err(error) => {
                    json!({ "canceled": false, "error": format!("Open failed: {error}") })
                }
            }
        }
        "file:save" | "file:saveAs" => {
            let content = payload_str(&payload, "content");
            let mut file_path = payload_str(&payload, "filePath");
            let suggested_name = payload_str(&payload, "suggestedName");
            let preferred_ext = payload_str(&payload, "preferredExt");

            if file_path.trim().is_empty() || name == "file:saveAs" {
                let title = if name == "file:saveAs" {
                    "Save As"
                } else {
                    "Save File"
                };
                let default_name = if suggested_name.trim().is_empty() {
                    "LucidPad.txt"
                } else {
                    suggested_name.as_str()
                };
                let Some(path) = save_file_dialog(title, default_name, preferred_ext.as_str())
                else {
                    return json!({ "canceled": true });
                };
                file_path = path.to_string_lossy().to_string();
            }

            let mut path = PathBuf::from(file_path);
            if !preferred_ext.trim().is_empty() {
                let has_expected_ext = path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext.eq_ignore_ascii_case(preferred_ext.as_str()))
                    .unwrap_or(false);
                if !has_expected_ext {
                    path.set_extension(preferred_ext.as_str());
                }
            }

            match fs::write(&path, content.as_bytes()) {
                Ok(_) => json!({
                  "canceled": false,
                  "filePath": path.to_string_lossy().to_string()
                }),
                Err(error) => {
                    json!({ "canceled": false, "error": format!("Save failed: {error}") })
                }
            }
        }
        "file:autoSave" => {
            let content = payload_str(&payload, "content");
            let file_path = payload_str(&payload, "filePath");
            if file_path.trim().is_empty() {
                return json!({ "canceled": true });
            }
            match fs::write(file_path.as_str(), content.as_bytes()) {
                Ok(_) => json!({
                  "canceled": false,
                  "filePath": file_path
                }),
                Err(error) => {
                    json!({ "canceled": false, "error": format!("Auto-save failed: {error}") })
                }
            }
        }
        "file:exists" => {
            let file_path = payload_str(&payload, "filePath");
            if file_path.trim().is_empty() {
                return json!({ "exists": false });
            }
            json!({ "exists": Path::new(file_path.as_str()).exists() })
        }
        "file:exportPdf" => {
            let folder = payload_str(&payload, "defaultFolder");
            let content = payload_str(&payload, "content");
            let default_path = resolve_export_default_path("LucidPad.pdf", folder.as_str());
            let Some(mut file_path) =
                save_export_dialog("Export PDF", default_path.as_path(), "PDF", &["pdf"])
            else {
                return json!({ "canceled": true });
            };
            let has_pdf_ext = file_path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("pdf"))
                .unwrap_or(false);
            if !has_pdf_ext {
                file_path.set_extension("pdf");
            }
            match export_text_as_pdf(file_path.as_path(), content.as_str()) {
                Ok(_) => json!({
                  "canceled": false,
                  "filePath": file_path.to_string_lossy().to_string()
                }),
                Err(error) => json!({ "canceled": false, "error": error }),
            }
        }
        "file:exportTxt" | "file:exportHtml" => {
            let folder = payload_str(&payload, "defaultFolder");
            let content = payload_str(&payload, "content");
            let (title, name, filter_name, ext): (&str, &str, &str, &[&str]) =
                if name == "file:exportTxt" {
                    ("Export TXT", "LucidPad.txt", "Text", &["txt"])
                } else {
                    ("Export HTML", "LucidPad.html", "HTML", &["html"])
                };
            let default_path = resolve_export_default_path(name, folder.as_str());
            let Some(file_path) =
                save_export_dialog(title, default_path.as_path(), filter_name, ext)
            else {
                return json!({ "canceled": true });
            };
            match fs::write(&file_path, content.as_bytes()) {
                Ok(_) => json!({
                  "canceled": false,
                  "filePath": file_path.to_string_lossy().to_string()
                }),
                Err(error) => {
                    json!({ "canceled": false, "error": format!("Export failed: {error}") })
                }
            }
        }
        _ => json!({ "canceled": false }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![lp_action])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Some(main_window_config) = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .cloned()
            {
                let download_counter = Arc::new(AtomicU64::new(1));
                let pending_downloads: Arc<
                    Mutex<HashMap<String, VecDeque<(String, String, String)>>>,
                > = Arc::new(Mutex::new(HashMap::new()));

                let pending_downloads_for_handler = pending_downloads.clone();
                let download_counter_for_handler = download_counter.clone();

                WebviewWindowBuilder::from_config(app, &main_window_config)?
                    .on_download(move |webview, event| {
                        match event {
                            DownloadEvent::Requested { url, destination } => {
                                let id = format!(
                                    "dl-{}",
                                    download_counter_for_handler.fetch_add(1, Ordering::Relaxed)
                                );
                                let filename = destination
                                    .file_name()
                                    .and_then(|name| name.to_str())
                                    .unwrap_or("Download")
                                    .to_string();
                                let file_path = destination.to_string_lossy().to_string();
                                let url_key = url.to_string();

                                if let Ok(mut pending) = pending_downloads_for_handler.lock() {
                                    pending.entry(url_key).or_default().push_back((
                                        id.clone(),
                                        filename.clone(),
                                        file_path.clone(),
                                    ));
                                }

                                let _ = webview.emit(
                                    "download:started",
                                    json!({
                                      "id": id,
                                      "filename": filename,
                                      "totalBytes": 0
                                    }),
                                );
                                let _ = webview.emit(
                                    "download:progress",
                                    json!({
                                      "id": id,
                                      "receivedBytes": 0,
                                      "totalBytes": 0,
                                      "progress": 0.0,
                                      "speed": 0.0
                                    }),
                                );
                            }
                            DownloadEvent::Finished { url, path, success } => {
                                let url_key = url.to_string();
                                let mut fallback = (
                                    format!(
                                        "dl-{}",
                                        download_counter_for_handler
                                            .fetch_add(1, Ordering::Relaxed)
                                    ),
                                    "Download".to_string(),
                                    String::new(),
                                );

                                if let Ok(mut pending) = pending_downloads_for_handler.lock() {
                                    let mut remove_url_entry = false;
                                    if let Some(queue) = pending.get_mut(&url_key) {
                                        if let Some(entry) = queue.pop_front() {
                                            fallback = entry;
                                        }
                                        remove_url_entry = queue.is_empty();
                                    }
                                    if remove_url_entry {
                                        pending.remove(&url_key);
                                    }
                                }

                                let id = fallback.0;
                                let filename = fallback.1;
                                let resolved_path = path
                                    .as_ref()
                                    .map(|value| value.to_string_lossy().to_string())
                                    .filter(|value| !value.trim().is_empty())
                                    .unwrap_or(fallback.2);

                                if success {
                                    let total_bytes = if resolved_path.is_empty() {
                                        0
                                    } else {
                                        fs::metadata(resolved_path.as_str())
                                            .map(|metadata| metadata.len())
                                            .unwrap_or(0)
                                    };

                                    let _ = webview.emit(
                                        "download:progress",
                                        json!({
                                          "id": id,
                                          "receivedBytes": total_bytes,
                                          "totalBytes": total_bytes,
                                          "progress": if total_bytes > 0 { 1.0 } else { 0.0 },
                                          "speed": 0.0
                                        }),
                                    );
                                    let _ = webview.emit(
                                        "download:done",
                                        json!({
                                          "id": id,
                                          "filename": filename,
                                          "filePath": resolved_path
                                        }),
                                    );
                                } else {
                                    let _ = webview.emit(
                                        "download:error",
                                        json!({
                                          "id": id,
                                          "message": "Download failed."
                                        }),
                                    );
                                }
                            }
                            _ => {}
                        }
                        true
                    })
                    .build()?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
