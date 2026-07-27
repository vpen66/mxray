pub mod config;
pub mod kernel;

#[tauri::command]
fn get_core_version() -> String {
    "Xray-core v26.3.27 (MXray)".into()
}

#[tauri::command]
fn parse_subscription_link(link: String) -> Result<String, String> {
    if link.starts_with("vless://") {
        config::parser::ConfigParser::parse_vless(&link)
            .map(|node| serde_json::to_string(&node).unwrap_or_default())
            .map_err(|e| e.to_string())
    } else {
        Err("Unsupported protocol link".into())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_core_version,
            parse_subscription_link,
            kernel::detect_kernel,
            kernel::list_installed_kernels,
            kernel::fetch_remote_releases,
            kernel::install_kernel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

