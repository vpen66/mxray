pub mod config;
pub mod kernel;
pub mod sysproxy;

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

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_core_version,
            parse_subscription_link,
            fetch_subscription,
            kernel::detect_kernel,
            kernel::list_installed_kernels,
            kernel::fetch_remote_releases,
            kernel::install_kernel,
            kernel::get_geodata_info,
            kernel::update_geodata,
            kernel::start_kernel,
            kernel::stop_kernel,
            kernel::get_kernel_status,
            kernel::get_runtime_config_path,
            kernel::get_cli_command,
            sysproxy::set_system_proxy,
            sysproxy::get_system_proxy_status
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
            let _ = kernel::stop_kernel();
            let _ = sysproxy::set_system_proxy(false, Some(10809), Some(10808));
        }
        _ => {}
    });
}

