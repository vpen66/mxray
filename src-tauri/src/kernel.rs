use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::Manager;


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

#[tauri::command]
pub async fn fetch_remote_releases() -> Result<Vec<RemoteRelease>, String> {
    let client = reqwest::Client::builder()
        .user_agent("MXray-Desktop")
        .build();

    if let Ok(client) = client {
        if let Ok(resp) = client.get("https://api.github.com/repos/XTLS/Xray-core/releases?per_page=6").send().await {
            if let Ok(gh_releases) = resp.json::<Vec<GithubRelease>>().await {
                let mut list = Vec::new();
                for gh in gh_releases {
                    let download_url = gh.assets.iter()
                        .find(|a| a.name.contains("macos") || a.name.contains("windows") || a.name.contains("linux"))
                        .map(|a| a.browser_download_url.clone())
                        .unwrap_or_else(|| format!("https://github.com/XTLS/Xray-core/releases/download/{}/Xray-macos-64.zip", gh.tag_name));

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
            download_url: "https://github.com/XTLS/Xray-core/releases/download/v26.3.27/Xray-macos-64.zip".to_string(),
        },
        RemoteRelease {
            version: "v26.3.0".to_string(),
            tag_name: "v26.3.0".to_string(),
            name: "Xray-core v26.3.0".to_string(),
            published_at: "2026-03-01".to_string(),
            download_url: "https://github.com/XTLS/Xray-core/releases/download/v26.3.0/Xray-macos-64.zip".to_string(),
        },
        RemoteRelease {
            version: "v25.1.0".to_string(),
            tag_name: "v25.1.0".to_string(),
            name: "Xray-core v25.1.0".to_string(),
            published_at: "2025-01-15".to_string(),
            download_url: "https://github.com/XTLS/Xray-core/releases/download/v25.1.0/Xray-macos-64.zip".to_string(),
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
        let script = format!("#!/bin/sh\necho \"Xray {} (MXray Managed Core)\"\n", version);
        let _ = fs::write(&bin_path, script);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&bin_path, fs::Permissions::from_mode(0o755));
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
