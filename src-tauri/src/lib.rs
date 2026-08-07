pub mod config;
#[cfg(unix)]
pub mod helper;
pub mod kernel;
pub mod sysproxy;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const TRAY_ID: &str = "main-tray";
static APP_EXIT_ALLOWED: AtomicBool = AtomicBool::new(false);

/// 显示已有的主窗口；如果主窗口已被销毁，则动态重新创建并显示
fn show_or_create_main_window(app_handle: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);

    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    } else {
        let builder = tauri::WebviewWindowBuilder::new(
            app_handle,
            "main",
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("MXray")
        .inner_size(1150.0, 780.0)
        .min_inner_size(960.0, 640.0)
        .resizable(true);

        if let Ok(window) = builder.build() {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// 根据内核运行状态切换菜单栏托盘图标：
/// 运行中为正常不透明图标，已停止为降低透明度的置灰图标
pub fn set_tray_kernel_state(app_handle: &tauri::AppHandle, running: bool) {
    let Some(tray) = app_handle.tray_by_id(TRAY_ID) else { return; };
    let Some(base) = app_handle.default_window_icon().cloned() else { return; };
    let image = if running {
        base
    } else {
        let mut rgba = base.rgba().to_vec();
        for px in rgba.chunks_exact_mut(4) {
            px[3] = ((px[3] as u32) * 85 / 255) as u8;
        }
        tauri::image::Image::new_owned(rgba, base.width(), base.height())
    };
    let _ = tray.set_icon(Some(image));
}

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
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Regular);

            // 从磁盘恢复配置到内存
            if let Ok(app_dir) = app.path().app_data_dir() {
                kernel::init_keep_alive_pref(&app_dir);
            }

            // 初始化托盘菜单
            let show_item = MenuItem::with_id(app, "tray_show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "tray_quit", "完全退出", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
                .tooltip("MXray")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "tray_show" => {
                        show_or_create_main_window(app);
                    }
                    "tray_quit" => {
                        let _ = kernel::stop_kernel(app.clone());
                        let _ = sysproxy::set_system_proxy(app.clone(), false, None, None);
                        APP_EXIT_ALLOWED.store(true, Ordering::Relaxed);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_or_create_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
                #[cfg(target_os = "macos")]
                {
                    tray_builder = tray_builder.icon_as_template(true);
                }
            }
            tray_builder.build(app)?;

            // 定时检测内核运行状态，更新托盘图标（亮/灰）
            set_tray_kernel_state(app.handle(), kernel::xray_process_alive());
            let poll_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_state: Option<bool> = None;
                loop {
                    let alive = kernel::xray_process_alive();
                    if last_state != Some(alive) {
                        set_tray_kernel_state(&poll_handle, alive);
                        last_state = Some(alive);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            // 接管已在后台运行的内核：附着运行时日志
            if kernel::xray_process_alive() {
                kernel::attach_runtime_log_tail(app.handle().clone());
            }

            Ok(())
        })
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
            kernel::set_keep_kernel_alive,
            kernel::get_keep_kernel_alive,
            kernel::get_recent_runtime_logs,
            sysproxy::set_system_proxy,
            sysproxy::get_system_proxy_status,
            write_text_file,
            read_text_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            show_or_create_main_window(app_handle);
        }
        tauri::RunEvent::ExitRequested { api, .. } => {
            if !APP_EXIT_ALLOWED.load(Ordering::Relaxed) {
                api.prevent_exit();
                #[cfg(target_os = "macos")]
                let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
        }
        tauri::RunEvent::Exit => {
            let _ = kernel::stop_kernel(app_handle.clone());
            let _ = sysproxy::set_system_proxy(app_handle.clone(), false, None, None);
        }
        _ => {}
    });
}
