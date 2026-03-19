use std::fs;
use std::path::Path;

fn track_path(path: &Path) {
    println!("cargo:rerun-if-changed={}", path.display());
}

fn track_dir_recursive(path: &Path) {
    track_path(path);
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                track_dir_recursive(&entry_path);
            } else {
                track_path(&entry_path);
            }
        }
    }
}

fn main() {
    track_path(Path::new("tauri.conf.json"));
    track_dir_recursive(Path::new("icons"));
    tauri_build::build()
}
