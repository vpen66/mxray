pub mod config;
#[cfg(unix)]
pub mod helper;
pub mod kernel;
pub mod sysproxy;

use std::net::ToSocketAddrs;
use tauri::Manager;

/// GUI 单实例锁文件句柄：持有期间 flock 独占锁一直有效，
/// 进程退出（含异常崩溃）后由系统自动释放
#[cfg(unix)]
static GUI_LOCK_FILE: std::sync::Mutex<Option<std::fs::File>> = std::sync::Mutex::new(None);

/// 尝试非阻塞获取 flock 独占锁
#[cfg(unix)]
fn try_flock(file: &std::fs::File) -> bool {
    use std::os::fd::AsRawFd;
    unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) == 0 }
}

/// 将当前进程 PID 写入锁文件，供后续实例判断持锁者是否存活
#[cfg(unix)]
fn write_lock_pid(file: &std::fs::File) {
    use std::io::Write;
    let _ = file.set_len(0);
    let mut f = file;
    let _ = f.write_all(std::process::id().to_string().as_bytes());
}

/// 打开 GUI 锁文件：O_CLOEXEC 确保托盘代理、Xray 内核等子进程
/// 不会继承该 fd，避免 GUI 退出后锁被继承者“代持”导致无法再启动
#[cfg(unix)]
fn open_gui_lock_file(path: &std::path::Path) -> Option<std::fs::File> {
    use std::os::unix::fs::OpenOptionsExt;
    std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .custom_flags(libc::O_CLOEXEC)
        .open(path)
        .ok()
}

/// 尝试获取 GUI 单实例锁。已有 GUI 存活时返回 false。
/// 相比 PID 文件探测，flock 不会因进程异常退出残留陈旧状态；
/// 锁文件中记录持锁者 PID，用于识别“锁仅被继承 fd 代持”的假占用
#[cfg(unix)]
fn acquire_gui_lock() -> bool {
    let Some(app_dir) = dirs_next_data_dir() else { return true; };
    let _ = std::fs::create_dir_all(&app_dir);
    let lock_path = app_dir.join("gui.lock");
    let Some(file) = open_gui_lock_file(&lock_path) else { return true; };
    if try_flock(&file) {
        write_lock_pid(&file);
        *GUI_LOCK_FILE.lock().unwrap() = Some(file);
        return true;
    }
    // 拿不到锁：检查锁文件中记录的持锁 GUI 是否仍存活。
    // 若已退出（或文件为空，如旧版本未写入 PID），说明锁只是被
    // 继承 fd 的子进程（旧版托盘代理/内核）代持——删除并重建锁文件
    // （新 inode），即可绕过陈旧占用重新获取
    let holder_alive = std::fs::read_to_string(&lock_path)
        .ok()
        .and_then(|c| c.trim().parse::<i32>().ok())
        .map(|pid| pid > 0 && pid_alive(pid))
        .unwrap_or(false);
    if holder_alive {
        return false;
    }
    let _ = std::fs::remove_file(&lock_path);
    let Some(file) = open_gui_lock_file(&lock_path) else { return true; };
    if try_flock(&file) {
        write_lock_pid(&file);
        *GUI_LOCK_FILE.lock().unwrap() = Some(file);
        true
    } else {
        false
    }
}

/// 锁文件目录与 app_data_dir 保持一致（在 Tauri AppHandle 可用前调用）
#[cfg(unix)]
fn dirs_next_data_dir() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(
        std::path::PathBuf::from(home)
            .join("Library/Application Support/net.mxray.app"),
    )
}

/// 解析当前可执行文件所属的 .app 包路径（开发模式下二进制不在包内时返回 None）
#[cfg(target_os = "macos")]
pub fn app_bundle_path() -> Option<std::path::PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let s = exe.to_str()?;
    let idx = s.find(".app/").map(|i| i + 4)?;
    Some(std::path::PathBuf::from(&s[..idx]))
}

/// 通过 LaunchServices 激活应用：已运行则前置并显示窗口，未运行则由系统启动。
/// 相比直接 spawn 二进制或 osascript，可避免产生第二个进程实例
#[cfg(target_os = "macos")]
pub fn activate_or_open_app() -> bool {
    if let Some(bundle) = app_bundle_path() {
        std::process::Command::new("open")
            .arg(&bundle)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    } else {
        false
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
        // 停止态：将图标整体不透明度降至约三分之一，呈现置灰效果
        // 注意：必须提升到 u32 运算，否则 debug 构建下 u8 乘法会溢出 panic
        let mut rgba = base.rgba().to_vec();
        for px in rgba.chunks_exact_mut(4) {
            px[3] = ((px[3] as u32) * 85 / 255) as u8;
        }
        tauri::image::Image::new_owned(rgba, base.width(), base.height())
    };
    let _ = tray.set_icon(Some(image));
}

const TRAY_ID: &str = "main-tray";
const TRAY_AGENT_PID_FILE: &str = "tray_agent.pid";
pub const GUI_PID_FILE_NAME: &str = "gui.pid";

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

/// 脱离启动托盘代理进程（GUI 启动时确保其在运行）：
/// 托盘图标由代理全程独占持有，GUI 退出时图标不消失不闪烁
#[cfg(unix)]
fn spawn_tray_agent(app_handle: &tauri::AppHandle) {
    let Ok(exe) = std::env::current_exe() else { return; };
    let Some(exe_str) = exe.to_str() else { return; };

    // 已有存活代理时不重复启动
    if let Some(pid_path) = tray_agent_pid_path(app_handle) {
        if let Ok(content) = std::fs::read_to_string(&pid_path) {
            if let Ok(pid) = content.trim().parse::<i32>() {
                if pid > 0 && pid_alive(pid) {
                    return;
                }
            }
        }
        // PID 文件缺失：清理可能残留的旧版本代理进程（旧二进制会自建托盘，
        // 与新代理并存会出现重复图标），再重新拉起。
        // 按进程名枚举同名进程，逐个校验 MXRAY_TRAY_MODE 环境变量，
        // 避免误杀 GUI 自身与特权 helper
        let exe_name = exe.file_name().and_then(|n| n.to_str()).unwrap_or("mxray");
        let self_pid = std::process::id() as i32;
        let gui_pid = app_handle
            .path()
            .app_data_dir()
            .ok()
            .and_then(|dir| std::fs::read_to_string(dir.join(GUI_PID_FILE_NAME)).ok())
            .and_then(|c| c.trim().parse::<i32>().ok());
        if let Ok(out) = std::process::Command::new("pgrep")
            .args(["-x", exe_name])
            .output()
        {
            for token in String::from_utf8_lossy(&out.stdout).split_whitespace() {
                if let Ok(pid) = token.parse::<i32>() {
                    if pid == self_pid || Some(pid) == gui_pid {
                        continue;
                    }
                    // macOS 的 ps eww 会输出进程环境变量
                    if let Ok(ps) = std::process::Command::new("ps")
                        .args(["eww", "-p", token])
                        .output()
                    {
                        if String::from_utf8_lossy(&ps.stdout).contains("MXRAY_TRAY_MODE=") {
                            unsafe { libc::kill(pid, libc::SIGTERM); }
                        }
                    }
                }
            }
        }
    }

    // 前置变量赋值使代理进程进入 MXRAY_TRAY_MODE；GUI 自身环境不含该变量，无需 env -u
    let cmd = format!(
        "MXRAY_TRAY_MODE=1 nohup {} >/dev/null 2>&1 &",
        shell_quote(exe_str)
    );
    let _ = std::process::Command::new("sh").args(["-c", &cmd]).output();
}

/// 终止托盘代理进程（内核未运行时完全退出，不留托盘驻留）
#[cfg(unix)]
fn kill_tray_agent(app_handle: &tauri::AppHandle) {
    if let Some(pid_path) = tray_agent_pid_path(app_handle) {
        if let Ok(content) = std::fs::read_to_string(&pid_path) {
            if let Ok(pid) = content.trim().parse::<i32>() {
                if pid > 0 && pid_alive(pid) {
                    unsafe { libc::kill(pid, libc::SIGTERM); }
                }
            }
        }
        let _ = std::fs::remove_file(&pid_path);
    }
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
    // GUI 单实例保护：无论从 Dock、托盘还是命令行重复拉起，
    // 一律激活已在运行的实例，绝不产生第二个 GUI 进程
    #[cfg(unix)]
    if !acquire_gui_lock() {
        #[cfg(target_os = "macos")]
        {
            activate_or_open_app();
        }
        std::process::exit(0);
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::AppleScript, None))
        .setup(|app| {
            // dev 模式：前端页面由 vite 开发服务器提供。关闭窗口会使
            // pnpm tauri dev 会话连同 vite 一起终止，此后托盘再拉起 GUI
            // 将白屏——启动时探测服务可达性，不可达则提示并退出
            if let Some(tauri::utils::config::FrontendDist::Url(url)) =
                &app.config().build.frontend_dist
            {
                let reachable = url.host_str().map(|host| {
                    let port = url.port_or_known_default().unwrap_or(80);
                    format!("{}:{}", host, port)
                        .to_socket_addrs()
                        .ok()
                        .and_then(|mut addrs| addrs.next())
                        .and_then(|addr| {
                            std::net::TcpStream::connect_timeout(
                                &addr,
                                std::time::Duration::from_secs(2),
                            )
                            .ok()
                        })
                        .is_some()
                });
                if !reachable.unwrap_or(false) {
                    use tauri_plugin_dialog::DialogExt;
                    app.dialog()
                        .message(
                            "无法连接前端开发服务器，界面将无法渲染。\
                             关闭窗口后 pnpm tauri dev 会话会随之终止，\
                             请重新执行 pnpm tauri dev，\
                             或使用 pnpm tauri build 打包后测试托盘流程。",
                        )
                        .title("MXray 开发模式")
                        .blocking_show();
                    std::process::exit(1);
                }
            }

            // 从磁盘恢复“退出时保持内核后台运行”开关到内存，并写入 GUI PID
            if let Ok(app_dir) = app.path().app_data_dir() {
                kernel::init_keep_alive_pref(&app_dir);
                let _ = std::fs::create_dir_all(&app_dir);
                let _ = std::fs::write(
                    app_dir.join(GUI_PID_FILE_NAME),
                    std::process::id().to_string(),
                );
            }

            // 托盘图标由托盘代理进程全程独占持有：GUI 启动时确保代理在运行，
            // 关闭窗口（GUI 退出）时图标不会消失或闪烁
            #[cfg(unix)]
            spawn_tray_agent(app.handle());

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Regular);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            // 接管已在后台运行的内核（保活模式残留）：附着运行时日志，
            // 否则本进程未启动过内核，日志页将无任何输出
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

    app.run(|_app_handle, event| {
        // Dock 图标点击（应用已在运行）：恢复并聚焦主窗口，而非新开窗口
        // Reopen 变体仅在 macOS 上存在，其他平台条件编译跳过
        #[cfg(target_os = "macos")]
        if matches!(event, tauri::RunEvent::Reopen { .. }) {
            if let Some(window) = _app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }
        // 退出时清理 GUI PID 文件（托盘代理据此判断是否需要拉起新 GUI）
        if matches!(event, tauri::RunEvent::Exit) {
            if let Ok(app_dir) = _app_handle.path().app_data_dir() {
                let _ = std::fs::remove_file(app_dir.join(GUI_PID_FILE_NAME));
            }
        }
        if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
            // 内核未运行时：完全退出（包括托盘代理），不保留任何后台进程
            if !kernel::xray_process_alive() {
                let _ = kernel::stop_kernel(_app_handle.clone());
                let _ = sysproxy::set_system_proxy(_app_handle.clone(), false, None, None);
                #[cfg(unix)]
                kill_tray_agent(_app_handle);
                return;
            }
            // 保活开关开启时：不停止内核、不关闭系统代理，
            // Xray 以脱离/托管进程形态继续后台运行（macOS 为 nohup 脱离启动或
            // 特权 helper 托管，Windows 子进程随主程序退出后继续存活）
            if kernel::keep_kernel_alive_on_exit() {
                return;
            }
            let _ = kernel::stop_kernel(_app_handle.clone());
            let _ = sysproxy::set_system_proxy(_app_handle.clone(), false, None, None);
        }
    });
}

