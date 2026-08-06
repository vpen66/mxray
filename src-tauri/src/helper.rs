// MXray 特权助手守护进程逻辑（macOS / Unix）
// 主程序二进制在环境变量 MXRAY_HELPER_MODE=1 时以此模式运行：
// 由 launchd 以 root 常驻运行，监听 Unix socket，
// 接收主应用指令启动/停止 TUN 模式下的 xray 内核，从而避免每次操作都弹出密码框。

use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::os::unix::net::{UnixListener, UnixStream};
use std::process::Command;

pub const SOCKET_PATH: &str = "/var/run/mxray-helper.sock";
pub const MANIFEST_PATH: &str = "/Users/Shared/mxray-tun.json";

extern "C" {
    fn getuid() -> u32;
}

fn xray_running() -> bool {
    Command::new("pgrep")
        .args(["-x", "xray"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn stop_xray() {
    let _ = Command::new("pkill").args(["-x", "xray"]).output();
}

/// 获取当前登录桌面用户的 uid/gid（/dev/console 的属主即登录用户），
/// 用于把 root 创建的日志文件归属给用户，否则用户无法在 Finder 中打开。
fn get_console_user() -> Option<(u32, u32)> {
    let meta = std::fs::metadata("/dev/console").ok()?;
    use std::os::unix::fs::MetadataExt;
    let uid = meta.uid();
    if uid < 500 {
        return None;
    }
    Some((uid, meta.gid()))
}

/// 将路径归属给桌面用户并设置可读权限
fn chown_to_user(path: &std::path::Path, uid: u32, gid: u32, mode: u32) {
    let c_path = match std::ffi::CString::new(path.to_string_lossy().as_ref()) {
        Ok(p) => p,
        Err(_) => return,
    };
    unsafe {
        libc::chown(c_path.as_ptr(), uid, gid);
        libc::chmod(c_path.as_ptr(), mode as libc::mode_t);
    }
}

/// 确保运行时配置中的日志目录存在且可写（helper 以 root 运行）；
/// 日志文件归属给桌面用户（否则用户无法打开）；
/// 无法创建时将对应日志路径降级为 "none"，避免 xray 因日志文件无法打开而启动失败。
fn prepare_log_dirs(config_path: &str) {
    let Ok(content) = std::fs::read_to_string(config_path) else {
        return;
    };
    let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) else {
        return;
    };
    let console_user = get_console_user();

    let mut changed = false;
    if let Some(log_obj) = config.get_mut("log").and_then(|v| v.as_object_mut()) {
        for key in ["access", "error"] {
            let path = match log_obj.get(key).and_then(|v| v.as_str()) {
                Some(p) if !p.is_empty() && p != "none" => p.to_string(),
                _ => continue,
            };
            let file_path = std::path::PathBuf::from(&path);
            let dir = file_path
                .parent()
                .unwrap_or(std::path::Path::new("/"))
                .to_path_buf();
            let ok = std::fs::create_dir_all(&dir).is_ok()
                && std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&file_path)
                    .is_ok();
            if ok {
                // 归属给桌面用户：目录 755、文件 644，保证用户可在 Finder 中打开；
                // 对已存在的 root 属主文件同样生效（root 有权 chown）
                if let Some((uid, gid)) = console_user {
                    chown_to_user(&dir, uid, gid, 0o755);
                    chown_to_user(&file_path, uid, gid, 0o644);
                }
            } else {
                eprintln!("日志路径不可写，已降级为 none: {}", path);
                log_obj.insert(key.to_string(), serde_json::Value::String("none".to_string()));
                changed = true;
            }
        }
    }

    if changed {
        let _ = std::fs::write(config_path, serde_json::to_string_pretty(&config).unwrap_or_default());
    }
}

fn start_xray() -> Result<(), String> {
    // 先停止旧进程，避免端口冲突
    stop_xray();
    std::thread::sleep(std::time::Duration::from_millis(300));

    let content = std::fs::read_to_string(MANIFEST_PATH)
        .map_err(|e| format!("读取内核清单失败: {}", e))?;
    let manifest: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("内核清单格式无效: {}", e))?;

    let bin = manifest
        .get("bin")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or("内核清单缺少 bin 字段")?;
    let config = manifest
        .get("config")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or("内核清单缺少 config 字段")?;
    let log = manifest
        .get("log")
        .and_then(|v| v.as_str())
        .unwrap_or("/tmp/mxray_runtime.log");

    // 确保配置内的 access/error 日志目录存在，否则 xray 会直接启动失败
    prepare_log_dirs(config);

    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log)
        .map_err(|e| format!("打开内核日志文件失败: {}", e))?;
    let log_err = log_file
        .try_clone()
        .map_err(|e| format!("复制日志句柄失败: {}", e))?;

    Command::new(bin)
        .args(["run", "-config", config])
        .stdin(std::process::Stdio::null())
        .stdout(log_file)
        .stderr(log_err)
        .spawn()
        .map_err(|e| format!("启动 xray 失败: {}", e))?;

    Ok(())
}

fn handle(mut stream: UnixStream) {
    // 使用定长缓冲读取单条指令，避免 read_to_string 等待 EOF 而阻塞
    let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(5)));
    let mut buf = [0u8; 128];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let cmd = String::from_utf8_lossy(&buf[..n]).to_string();
    let response = match cmd.trim() {
        "start" => match start_xray() {
            Ok(()) => "ok".to_string(),
            Err(e) => format!("err: {}", e),
        },
        "stop" => {
            stop_xray();
            "ok".to_string()
        }
        "status" => {
            if xray_running() {
                "ok: running".to_string()
            } else {
                "ok: stopped".to_string()
            }
        }
        other => format!("err: unknown command {}", other),
    };
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.shutdown(std::net::Shutdown::Both);
}

pub fn run() {
    // 仅允许 root 运行，防止被普通进程滥用提权
    if unsafe { getuid() } != 0 {
        eprintln!("mxray 特权助手需要以 root 权限运行");
        std::process::exit(1);
    }

    let _ = std::fs::remove_file(SOCKET_PATH);
    let listener = match UnixListener::bind(SOCKET_PATH) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("绑定 socket 失败: {}", e);
            std::process::exit(1);
        }
    };
    // 允许任意本地用户连接（指令本身仅启停清单中指定的内核）
    let _ = std::fs::set_permissions(SOCKET_PATH, std::fs::Permissions::from_mode(0o777));

    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            handle(stream);
        }
    }
}
