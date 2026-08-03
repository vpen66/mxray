// MXray 特权助手守护进程（macOS）
// 以 root 身份由 launchd 常驻运行，监听 Unix socket，
// 接收主应用指令启动/停止 TUN 模式下的 xray 内核，从而避免每次操作都弹出密码框。

#[cfg(unix)]
mod unix_impl {
    use std::fs::OpenOptions;
    use std::io::{Read, Write};
    use std::os::unix::fs::PermissionsExt;
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::process::Command;

    const SOCKET_PATH: &str = "/var/run/mxray-helper.sock";
    const MANIFEST_PATH: &str = "/Users/Shared/mxray-tun.json";

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
            .stdout(log_file)
            .stderr(log_err)
            .spawn()
            .map_err(|e| format!("启动 xray 失败: {}", e))?;

        Ok(())
    }

    fn handle(mut stream: UnixStream) {
        let mut cmd = String::new();
        if stream.read_to_string(&mut cmd).is_err() {
            return;
        }
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
            eprintln!("mxray-helper 需要以 root 权限运行");
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
}

fn main() {
    #[cfg(unix)]
    unix_impl::run();
    #[cfg(not(unix))]
    eprintln!("mxray-helper 仅支持 Unix 平台");
}
