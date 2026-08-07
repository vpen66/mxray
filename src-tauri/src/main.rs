// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const TRAY_ID: &str = "main-tray";
const TRAY_AGENT_PID_FILE: &str = "tray_agent.pid";

/// 托盘代理进程真正退出的许可标记（仅菜单动作置位，
/// 用于区分“主窗口销毁”与“主动退出”，避免代理被意外终止）
static AGENT_EXIT_ALLOWED: AtomicBool = AtomicBool::new(false);

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn tray_agent_pid_path(app_handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app_handle
        .path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join(TRAY_AGENT_PID_FILE))
}

#[cfg(unix)]
fn pid_alive(pid: i32) -> bool {
    // 信号 0 仅探测进程存在性，不会实际发送信号
    unsafe { libc::kill(pid, 0) == 0 }
}

/// 读取存活中的 GUI 进程 PID（文件不存在或进程已退出时返回 None）
#[cfg(unix)]
fn running_gui_pid(app_handle: &tauri::AppHandle) -> Option<i32> {
    let path = app_handle
        .path()
        .app_data_dir()
        .ok()?
        .join(mxray::GUI_PID_FILE_NAME);
    let pid = std::fs::read_to_string(&path).ok()?.trim().parse::<i32>().ok()?;
    if pid > 0 && pid_alive(pid) {
        Some(pid)
    } else {
        None
    }
}

/// 将已运行的 GUI 窗口置为前台（避免重复拉起第二个实例）
#[cfg(target_os = "macos")]
fn activate_gui(pid: i32) {
    let script = format!(
        "tell application \"System Events\" to set frontmost of (first process whose unix id is {}) to true",
        pid
    );
    let _ = std::process::Command::new("osascript").arg("-e").arg(&script).output();
}

/// “显示主窗口”：GUI 存活则聚焦，否则脱离拉起新实例
#[cfg(unix)]
fn show_or_launch_gui(app_handle: &tauri::AppHandle) {
    if let Some(pid) = running_gui_pid(app_handle) {
        #[cfg(target_os = "macos")]
        activate_gui(pid);
        let _ = pid;
        return;
    }
    launch_gui_detached();
}

/// 脱离启动 GUI 主程序（托盘代理的“显示主窗口”动作）。
/// env -u 剥离 MXRAY_TRAY_MODE，防止拉起的 GUI 误入代理模式
#[cfg(unix)]
fn launch_gui_detached() {
    let Ok(exe) = std::env::current_exe() else { return; };
    let Some(exe_str) = exe.to_str() else { return; };
    let cmd = format!(
        "nohup env -u MXRAY_TRAY_MODE {} >/dev/null 2>&1 &",
        shell_quote(exe_str)
    );
    let _ = std::process::Command::new("sh").args(["-c", &cmd]).output();
}

/// 托盘代理模式：全程独占菜单栏图标（GUI 存活与退出期间均不消失）。
/// 左键 / “显示主窗口”→ 聚焦或拉起 GUI；
/// “完全退出”→ 停止 Xray 内核、关闭系统代理、终止 GUI 后退出。
/// 注意：本函数必须位于 bin crate —— macOS 上 generate_context! 会嵌入
/// _EMBED_INFO_PLIST 符号，同一 crate 内调用两次会导致符号重复编译错误
fn run_tray_agent() {
    let app = tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // 记录自身 PID 供去重与清理
            if let Some(pid_path) = tray_agent_pid_path(app.handle()) {
                let _ = std::fs::create_dir_all(
                    pid_path.parent().unwrap_or(std::path::Path::new(".")),
                );
                let _ = std::fs::write(&pid_path, std::process::id().to_string());
            }

            // 代理不需要主窗口：直接销毁，仅保留菜单栏图标
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.destroy();
            }

            let show_item = MenuItem::with_id(app, "agent_show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "agent_quit", "完全退出", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
                .tooltip("MXray")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "agent_show" => {
                        #[cfg(unix)]
                        show_or_launch_gui(app);
                    }
                    "agent_quit" => {
                        // 先停内核与系统代理，再终止可能存活的 GUI，最后退出代理
                        let _ = mxray::kernel::stop_kernel(app.clone());
                        let _ = mxray::sysproxy::set_system_proxy(app.clone(), false, None, None);
                        #[cfg(unix)]
                        if let Some(pid) = running_gui_pid(app) {
                            unsafe { libc::kill(pid, libc::SIGTERM); }
                        }
                        AGENT_EXIT_ALLOWED.store(true, Ordering::Relaxed);
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
                        #[cfg(unix)]
                        show_or_launch_gui(tray.app_handle());
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

            // 初始图标状态 + 后台轮询：代理与 GUI 是独立进程，
            // 需自行探测内核存活以保持图标亮/灰同步
            mxray::set_tray_kernel_state(app.handle(), mxray::kernel::xray_process_alive());
            let poll_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_state: Option<bool> = None;
                loop {
                    let alive = mxray::kernel::xray_process_alive();
                    if last_state != Some(alive) {
                        mxray::set_tray_kernel_state(&poll_handle, alive);
                        last_state = Some(alive);
                    }
                    std::thread::sleep(Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tray agent");

    app.run(|app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            show_or_launch_gui(app_handle);
        }
        tauri::RunEvent::ExitRequested { api, .. } => {
            // 主窗口销毁会触发退出请求，代理需常驻：仅菜单动作放行
            if !AGENT_EXIT_ALLOWED.load(Ordering::Relaxed) {
                api.prevent_exit();
            }
        }
        tauri::RunEvent::Exit => {
            // 退出时清理 PID 文件
            if let Some(pid_path) = tray_agent_pid_path(app_handle) {
                let _ = std::fs::remove_file(&pid_path);
            }
        }
        _ => {}
    });
}

fn main() {
    // 特权助手模式：由 launchd 以 MXRAY_HELPER_MODE=1 启动时，
    // 主程序以守护进程方式运行，不启动 GUI。
    #[cfg(unix)]
    if std::env::var_os("MXRAY_HELPER_MODE").is_some() {
        mxray::helper::run();
        return;
    }

    // 托盘代理模式：GUI 关闭后由本进程接管菜单栏图标，
    // 不创建窗口，仅提供“显示主窗口 / 完全退出”入口
    if std::env::var_os("MXRAY_TRAY_MODE").is_some() {
        run_tray_agent();
        return;
    }

    mxray::run();
}
