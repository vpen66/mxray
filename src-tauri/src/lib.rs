pub mod config;
#[cfg(unix)]
pub mod helper;
pub mod kernel;
pub mod sysproxy;

#[tauri::command]
fn get_core_version() -> String {
    let info = kernel::detect_bundled_kernel_version_pub();
    info.version
}

#[tauri::command]
fn parse_subscription_link(link: String) -> Result<String, String> {
    config::parser::ConfigParser::parse_share_link(&link)
        .map(|node| serde_json::to_string(&node).unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn parse_subscription_content(content: String) -> Result<String, String> {
    config::parser::ConfigParser::parse_subscription_content(&content)
        .map(|nodes| serde_json::to_string(&nodes).unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_subscription(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .user_agent("v2rayN/6.39 mxray/1.0.0")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("HTTP 请求失败: {}", e))?;

    let text = resp.text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    Ok(text)
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::AppleScript, None))
        .invoke_handler(tauri::generate_handler![
            get_core_version,
            parse_subscription_link,
            parse_subscription_content,
            fetch_subscription,
            kernel::detect_kernel,
            kernel::list_installed_kernels,
            kernel::fetch_remote_releases,
            kernel::install_kernel,
            kernel::start_kernel,
            kernel::stop_kernel,
            kernel::get_kernel_status,
            kernel::get_runtime_config_path,
            kernel::get_cli_command,
            kernel::test_node_latency,
            kernel::generate_vless_encryption,
            kernel::generate_uuid,
            sysproxy::set_system_proxy,
            sysproxy::get_system_proxy_status,
            write_text_file,
            read_text_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
            let _ = kernel::stop_kernel();
            let _ = sysproxy::set_system_proxy(_app_handle.clone(), false, None, None);
        }
        _ => {}
    });
}

