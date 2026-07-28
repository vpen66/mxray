use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemProxyStatus {
    pub enabled: bool,
    pub http_port: u16,
    pub socks_port: u16,
    pub host: String,
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
    enable: bool,
    http_port: Option<u16>,
    socks_port: Option<u16>,
) -> Result<(), String> {
    let h_port = http_port.unwrap_or(10809);
    let s_port = socks_port.unwrap_or(10808);
    let host = "127.0.0.1";

    #[cfg(target_os = "macos")]
    {
        let services = get_active_macos_network_services();
        let state_str = if enable { "on" } else { "off" };

        for service in services {
            if enable {
                // Set HTTP proxy
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

                // Set SOCKS proxy
                let _ = Command::new("networksetup")
                    .args(["-setsocksfirewallproxy", &service, host, &s_port.to_string()])
                    .output();
                let _ = Command::new("networksetup")
                    .args(["-setsocksfirewallproxystate", &service, "on"])
                    .output();
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

    #[cfg(not(target_os = "macos"))]
    {
        // Placeholder for non-macOS platforms
        let _ = (enable, h_port, s_port, host);
        Ok(())
    }
}

#[tauri::command]
pub fn get_system_proxy_status() -> Result<SystemProxyStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let services = get_active_macos_network_services();
        for service in services {
            if let Ok(out) = Command::new("networksetup")
                .args(["-getwebproxy", &service])
                .output()
            {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let is_enabled = stdout.lines().any(|l| l.contains("Enabled: Yes"));
                if is_enabled {
                    return Ok(SystemProxyStatus {
                        enabled: true,
                        http_port: 10809,
                        socks_port: 10808,
                        host: "127.0.0.1".to_string(),
                    });
                }
            }
        }
        Ok(SystemProxyStatus {
            enabled: false,
            http_port: 10809,
            socks_port: 10808,
            host: "127.0.0.1".to_string(),
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(SystemProxyStatus {
            enabled: false,
            http_port: 10809,
            socks_port: 10808,
            host: "127.0.0.1".to_string(),
        })
    }
}
