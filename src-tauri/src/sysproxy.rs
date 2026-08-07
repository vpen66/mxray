use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemProxyStatus {
    pub enabled: bool,
    pub http_port: u16,
    pub socks_port: u16,
    pub host: String,
}

fn get_saved_ports_from_runtime_config(app_handle: &tauri::AppHandle) -> (u16, u16) {
    let mut http_port = 0;
    let mut socks_port = 0;
    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let config_path = app_dir.join("runtime_config.json");
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(inbounds) = json.get("inbounds").and_then(|v| v.as_array()) {
                    for ib in inbounds {
                        let tag = ib.get("tag").and_then(|v| v.as_str()).unwrap_or_default();
                        let protocol = ib.get("protocol").and_then(|v| v.as_str()).unwrap_or_default();
                        let port = ib.get("port").and_then(|v| v.as_u64()).unwrap_or(0) as u16;

                        if (tag == "http-in" || protocol == "http") && port > 0 {
                            http_port = port;
                        }
                        if (tag == "socks-in" || protocol == "socks") && port > 0 {
                            socks_port = port;
                        }
                    }
                }
            }
        }
    }
    (http_port, socks_port)
}

#[cfg(target_os = "macos")]
fn get_active_macos_network_services() -> Vec<String> {
    let output = Command::new("networksetup")
        .arg("-listallnetworkservices")
        .output();

    let mut services = Vec::new();
    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            let trimmed = line.trim();
            // Skip header line or disabled services starting with *
            if trimmed.is_empty() 
                || trimmed.contains("An asterisk") 
                || trimmed.starts_with('*') 
            {
                continue;
            }
            services.push(trimmed.to_string());
        }
    }

    if services.is_empty() {
        // Fallback default network service names on macOS
        services.push("Wi-Fi".to_string());
        services.push("Ethernet".to_string());
    }

    services
}

#[tauri::command]
pub fn set_system_proxy(
    app_handle: tauri::AppHandle,
    enable: bool,
    http_port: Option<u16>,
    socks_port: Option<u16>,
) -> Result<(), String> {
    let (saved_http, saved_socks) = get_saved_ports_from_runtime_config(&app_handle);
    let h_port = match http_port {
        Some(p) if p > 0 => p,
        _ => if saved_http > 0 { saved_http } else { 7891 },
    };
    let s_port = match socks_port {
        Some(p) if p > 0 => p,
        _ => if saved_socks > 0 { saved_socks } else { 7890 },
    };
    let host = "127.0.0.1";

    #[cfg(target_os = "macos")]
    {
        let services = get_active_macos_network_services();
        let state_str = if enable { "on" } else { "off" };

        for service in services {
            if enable {
                // Set HTTP proxy
                if h_port > 0 {
                    let _ = Command::new("networksetup")
                        .args(["-setwebproxy", &service, host, &h_port.to_string()])
                        .output();
                    let _ = Command::new("networksetup")
                        .args(["-setwebproxystate", &service, "on"])
                        .output();

                    // Set HTTPS proxy
                    let _ = Command::new("networksetup")
                        .args(["-setsecurewebproxy", &service, host, &h_port.to_string()])
                        .output();
                    let _ = Command::new("networksetup")
                        .args(["-setsecurewebproxystate", &service, "on"])
                        .output();
                }

                // Set SOCKS proxy
                if s_port > 0 {
                    let _ = Command::new("networksetup")
                        .args(["-setsocksfirewallproxy", &service, host, &s_port.to_string()])
                        .output();
                    let _ = Command::new("networksetup")
                        .args(["-setsocksfirewallproxystate", &service, "on"])
                        .output();
                }
            } else {
                // Turn off proxies
                let _ = Command::new("networksetup")
                    .args(["-setwebproxystate", &service, state_str])
                    .output();
                let _ = Command::new("networksetup")
                    .args(["-setsecurewebproxystate", &service, state_str])
                    .output();
                let _ = Command::new("networksetup")
                    .args(["-setsocksfirewallproxystate", &service, state_str])
                    .output();
            }
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let reg_path = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings";
        if enable {
            let proxy_server = if s_port > 0 {
                format!("http={}:{};https={}:{};socks={}:{}", host, h_port, host, h_port, host, s_port)
            } else {
                format!("{}:{}", host, h_port)
            };
            let bypass = "<local>;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*";

            let _ = Command::new("reg")
                .args(["add", reg_path, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "1", "/f"])
                .output();
            let _ = Command::new("reg")
                .args(["add", reg_path, "/v", "ProxyServer", "/t", "REG_SZ", "/d", &proxy_server, "/f"])
                .output();
            let _ = Command::new("reg")
                .args(["add", reg_path, "/v", "ProxyOverride", "/t", "REG_SZ", "/d", bypass, "/f"])
                .output();
        } else {
            let _ = Command::new("reg")
                .args(["add", reg_path, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "0", "/f"])
                .output();
        }

        // Broadcast InternetSetOption via PowerShell to refresh system proxy immediately
        let ps_code = r#"$sig = '[DllImport("wininet.dll", SetLastError = true, CharSet = CharSet.Auto)] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);'; $type = Add-Type -MemberDefinition $sig -Name "WinInetProxy" -Namespace "Win32" -PassThru; $type::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0); $type::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0);"#;
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_code])
            .output();

        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        if enable {
            let _ = Command::new("gsettings")
                .args(["set", "org.gnome.system.proxy", "mode", "manual"])
                .output();
            if h_port > 0 {
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.http", "host", host])
                    .output();
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.http", "port", &h_port.to_string()])
                    .output();
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.https", "host", host])
                    .output();
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.https", "port", &h_port.to_string()])
                    .output();
            }
            if s_port > 0 {
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.socks", "host", host])
                    .output();
                let _ = Command::new("gsettings")
                    .args(["set", "org.gnome.system.proxy.socks", "port", &s_port.to_string()])
                    .output();
            }

            let _ = Command::new("kwriteconfig5")
                .args(["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "1"])
                .output();
            let _ = Command::new("kwriteconfig6")
                .args(["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "1"])
                .output();
        } else {
            let _ = Command::new("gsettings")
                .args(["set", "org.gnome.system.proxy", "mode", "none"])
                .output();

            let _ = Command::new("kwriteconfig5")
                .args(["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "0"])
                .output();
            let _ = Command::new("kwriteconfig6")
                .args(["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "0"])
                .output();
        }
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = (enable, h_port, s_port, host);
        Ok(())
    }
}

#[tauri::command]
pub fn get_system_proxy_status(app_handle: tauri::AppHandle) -> Result<SystemProxyStatus, String> {
    // 仅 macOS 分支需要读取运行时配置保存的端口，其他平台显式忽略
    #[cfg(not(target_os = "macos"))]
    let _ = &app_handle;
    #[cfg(target_os = "macos")]
    {
        let (saved_http, saved_socks) = get_saved_ports_from_runtime_config(&app_handle);
        let services = get_active_macos_network_services();
        for service in services {
            if let Ok(out) = Command::new("networksetup")
                .args(["-getwebproxy", &service])
                .output()
            {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let is_enabled = stdout.lines().any(|l| l.contains("Enabled: Yes"));
                if is_enabled {
                    let mut http_port = 0;
                    if let Some(line) = stdout.lines().find(|l| l.contains("Port:")) {
                        if let Some(port_str) = line.split(':').nth(1) {
                            if let Ok(p) = port_str.trim().parse::<u16>() {
                                http_port = p;
                            }
                        }
                    }

                    let mut socks_port = 0;
                    if let Ok(socks_out) = Command::new("networksetup")
                        .args(["-getsocksfirewallproxy", &service])
                        .output()
                    {
                        let socks_stdout = String::from_utf8_lossy(&socks_out.stdout);
                        if let Some(line) = socks_stdout.lines().find(|l| l.contains("Port:")) {
                            if let Some(port_str) = line.split(':').nth(1) {
                                if let Ok(p) = port_str.trim().parse::<u16>() {
                                    socks_port = p;
                                }
                            }
                        }
                    }

                    return Ok(SystemProxyStatus {
                        enabled: true,
                        http_port,
                        socks_port,
                        host: "127.0.0.1".to_string(),
                    });
                }
            }
        }
        Ok(SystemProxyStatus {
            enabled: false,
            http_port: saved_http,
            socks_port: saved_socks,
            host: "127.0.0.1".to_string(),
        })
    }

    #[cfg(target_os = "windows")]
    {
        let reg_path = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings";
        let mut enabled = false;
        let mut http_port = 0;
        let mut socks_port = 0;

        if let Ok(out) = Command::new("reg")
            .args(["query", reg_path, "/v", "ProxyEnable"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if stdout.contains("0x1") {
                enabled = true;
            }
        }

        if let Ok(out) = Command::new("reg")
            .args(["query", reg_path, "/v", "ProxyServer"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for part in stdout.split(';') {
                let item = part.trim();
                if item.contains("http=") {
                    if let Some(pos) = item.rfind(':') {
                        let port_str: String = item[pos + 1..].chars().take_while(|c| c.is_ascii_digit()).collect();
                        if let Ok(p) = port_str.parse::<u16>() { http_port = p; }
                    }
                } else if item.contains("socks=") {
                    if let Some(pos) = item.rfind(':') {
                        let port_str: String = item[pos + 1..].chars().take_while(|c| c.is_ascii_digit()).collect();
                        if let Ok(p) = port_str.parse::<u16>() { socks_port = p; }
                    }
                } else if item.contains(':') && http_port == 0 {
                    if let Some(pos) = item.rfind(':') {
                        let port_str: String = item[pos + 1..].chars().take_while(|c| c.is_ascii_digit()).collect();
                        if let Ok(p) = port_str.parse::<u16>() { http_port = p; }
                    }
                }
            }
        }

        Ok(SystemProxyStatus {
            enabled,
            http_port,
            socks_port,
            host: "127.0.0.1".to_string(),
        })
    }

    #[cfg(target_os = "linux")]
    {
        let mut enabled = false;
        let mut http_port = 0;
        let mut socks_port = 0;

        if let Ok(out) = Command::new("gsettings")
            .args(["get", "org.gnome.system.proxy", "mode"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if stdout.contains("manual") {
                enabled = true;
            }
        }

        if let Ok(out) = Command::new("gsettings")
            .args(["get", "org.gnome.system.proxy.http", "port"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let port_clean: String = stdout.chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(p) = port_clean.parse::<u16>() {
                if p > 0 { http_port = p; }
            }
        }

        if let Ok(out) = Command::new("gsettings")
            .args(["get", "org.gnome.system.proxy.socks", "port"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let port_clean: String = stdout.chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(p) = port_clean.parse::<u16>() {
                if p > 0 { socks_port = p; }
            }
        }

        Ok(SystemProxyStatus {
            enabled,
            http_port,
            socks_port,
            host: "127.0.0.1".to_string(),
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Ok(SystemProxyStatus {
            enabled: false,
            http_port: 0,
            socks_port: 0,
            host: "127.0.0.1".to_string(),
        })
    }
}
