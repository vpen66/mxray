use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use url::Url;
use base64::Engine;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedNode {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub server: String,
    pub port: u16,
    pub raw_outbound: Value,
}

pub struct ConfigParser;

impl ConfigParser {
    /// Build stream settings from common transport parameters
    fn build_stream_settings(params: &HashMap<String, String>, default_net: &str) -> Value {
        let net = params.get("type").cloned().unwrap_or_else(|| default_net.into());
        let security = params.get("security").cloned().unwrap_or_else(|| "none".into());
        let mut ss = json!({ "network": net, "security": security });

        if security == "reality" {
            let mut reality = json!({
                "serverName": params.get("sni").cloned().unwrap_or_default(),
                "publicKey": params.get("pbk").cloned().unwrap_or_default(),
                "shortId": params.get("sid").cloned().unwrap_or_default(),
                "fingerprint": params.get("fp").cloned().unwrap_or_else(|| "chrome".into()),
            });
            if let Some(spx) = params.get("spx") {
                let decoded = urlencoding::decode(spx).unwrap_or_default().to_string();
                if !decoded.is_empty() {
                    reality["spiderX"] = json!(decoded);
                }
            }
            if let Some(pqv) = params.get("pqv") {
                reality["pqv"] = json!(pqv);
            }
            ss["realitySettings"] = reality;
        } else if security == "tls" {
            let mut tls = json!({
                "serverName": params.get("sni").cloned().unwrap_or_default(),
                "allowInsecure": false,
            });
            if let Some(fp) = params.get("fp") {
                tls["fingerprint"] = json!(fp);
            }
            if let Some(alpn) = params.get("alpn") {
                let alpn_list: Vec<&str> = alpn.split(',').collect();
                tls["alpn"] = json!(alpn_list);
            }
            ss["tlsSettings"] = tls;
        }

        // Transport-specific settings
        match net.as_str() {
            "ws" => {
                let mut ws = json!({});
                if let Some(path) = params.get("path") {
                    ws["path"] = json!(urlencoding::decode(path).unwrap_or_default().to_string());
                }
                if let Some(host) = params.get("host") {
                    ws["headers"] = json!({ "Host": host });
                }
                ss["wsSettings"] = ws;
            }
            "grpc" => {
                let mut grpc = json!({});
                if let Some(svc) = params.get("serviceName") {
                    grpc["serviceName"] = json!(svc);
                }
                if let Some(mode) = params.get("mode") {
                    grpc["multiMode"] = json!(mode == "multi");
                }
                ss["grpcSettings"] = grpc;
            }
            "tcp" => {
                if let Some(header_type) = params.get("headerType") {
                    if header_type == "http" {
                        let mut tcp = json!({ "header": { "type": "http" } });
                        if let Some(host) = params.get("host") {
                            tcp["header"]["request"] = json!({
                                "headers": { "Host": [host] }
                            });
                        }
                        if let Some(path) = params.get("path") {
                            tcp["header"]["request"]["path"] = json!([urlencoding::decode(path).unwrap_or_default().to_string()]);
                        }
                        ss["tcpSettings"] = tcp;
                    }
                }
            }
            "h2" | "http" => {
                let mut h2 = json!({});
                if let Some(host) = params.get("host") {
                    h2["host"] = json!([host]);
                }
                if let Some(path) = params.get("path") {
                    h2["path"] = json!(urlencoding::decode(path).unwrap_or_default().to_string());
                }
                ss["httpSettings"] = h2;
            }
            "quic" => {
                let mut quic = json!({});
                if let Some(qsec) = params.get("quicSecurity") {
                    quic["security"] = json!(qsec);
                }
                if let Some(key) = params.get("key") {
                    quic["key"] = json!(key);
                }
                if let Some(ht) = params.get("headerType") {
                    quic["header"] = json!({ "type": ht });
                }
                ss["quicSettings"] = quic;
            }
            _ => {}
        }

        ss
    }

    /// Parse vless:// link into Xray outbound JSON
    pub fn parse_vless(link: &str) -> anyhow::Result<ParsedNode> {
        let url = Url::parse(link)?;
        let uuid = url.username();
        let host = url.host_str().unwrap_or("127.0.0.1");
        let port = url.port().unwrap_or(443);
        let name = url.fragment().map(|f| urlencoding::decode(f).unwrap_or_default().to_string()).unwrap_or_else(|| "VLESS Node".into());

        let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let flow = params.get("flow").cloned().unwrap_or_default();

        let stream_settings = Self::build_stream_settings(&params, "tcp");

        let mut user_obj = json!({
            "id": uuid,
            "encryption": "none",
        });
        if !flow.is_empty() {
            user_obj["flow"] = json!(flow);
        }

        let outbound = json!({
            "tag": "proxy",
            "protocol": "vless",
            "settings": {
                "vnext": [{
                    "address": host,
                    "port": port,
                    "users": [user_obj]
                }]
            },
            "streamSettings": stream_settings
        });

        Ok(ParsedNode {
            id: format!("node-{}", uuid),
            name,
            protocol: "vless".into(),
            server: host.into(),
            port,
            raw_outbound: outbound,
        })
    }

    /// Parse vmess:// link (base64-encoded JSON)
    pub fn parse_vmess(link: &str) -> anyhow::Result<ParsedNode> {
        let b64 = link.trim_start_matches("vmess://");
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(b64))
            .map_err(|e| anyhow::anyhow!("VMess base64 解码失败: {}", e))?;
        let json_str = String::from_utf8(decoded)?;
        let v: Value = serde_json::from_str(&json_str)?;

        let host = v["add"].as_str().unwrap_or("127.0.0.1");
        let port = v["port"].as_str().and_then(|s| s.parse().ok()).or_else(|| v["port"].as_u64().map(|p| p as u16)).unwrap_or(443);
        let uuid = v["id"].as_str().unwrap_or("");
        let name = v["ps"].as_str().unwrap_or("VMess Node").to_string();
        let aid = v["aid"].as_str().and_then(|s| s.parse().ok()).or_else(|| v["aid"].as_u64().map(|a| a as u64)).unwrap_or(0);
        let security = v["scy"].as_str().unwrap_or("auto");
        let net = v["net"].as_str().unwrap_or("tcp");
        let tls = v["tls"].as_str().unwrap_or("");
        let sni = v["sni"].as_str().unwrap_or("");
        let host_header = v["host"].as_str().unwrap_or("");
        let path = v["path"].as_str().unwrap_or("");
        let flow = v["flow"].as_str().unwrap_or("");
        let fp = v["fp"].as_str().unwrap_or("");
        let alpn = v["alpn"].as_str().unwrap_or("");

        let mut params: HashMap<String, String> = HashMap::new();
        params.insert("type".into(), net.into());
        if tls == "tls" { params.insert("security".into(), "tls".into()); }
        if !sni.is_empty() { params.insert("sni".into(), sni.into()); }
        if !fp.is_empty() { params.insert("fp".into(), fp.into()); }
        if !alpn.is_empty() { params.insert("alpn".into(), alpn.into()); }
        if !host_header.is_empty() { params.insert("host".into(), host_header.into()); }
        if !path.is_empty() { params.insert("path".into(), path.into()); }

        let stream_settings = Self::build_stream_settings(&params, net);

        let mut user_obj = json!({
            "id": uuid,
            "alterId": aid,
            "security": security,
        });
        if !flow.is_empty() {
            user_obj["flow"] = json!(flow);
        }

        let outbound = json!({
            "tag": "proxy",
            "protocol": "vmess",
            "settings": {
                "vnext": [{
                    "address": host,
                    "port": port,
                    "users": [user_obj]
                }]
            },
            "streamSettings": stream_settings
        });

        Ok(ParsedNode {
            id: format!("node-{}", uuid),
            name,
            protocol: "vmess".into(),
            server: host.into(),
            port,
            raw_outbound: outbound,
        })
    }

    /// Parse trojan:// link
    pub fn parse_trojan(link: &str) -> anyhow::Result<ParsedNode> {
        let url = Url::parse(link)?;
        let password = urlencoding::decode(url.username()).unwrap_or_default().to_string();
        let host = url.host_str().unwrap_or("127.0.0.1");
        let port = url.port().unwrap_or(443);
        let name = url.fragment().map(|f| urlencoding::decode(f).unwrap_or_default().to_string()).unwrap_or_else(|| "Trojan Node".into());

        let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let stream_settings = Self::build_stream_settings(&params, "tcp");

        let outbound = json!({
            "tag": "proxy",
            "protocol": "trojan",
            "settings": {
                "servers": [{
                    "address": host,
                    "port": port,
                    "password": password,
                }]
            },
            "streamSettings": stream_settings
        });

        Ok(ParsedNode {
            id: format!("node-trojan-{}-{}", host, port),
            name,
            protocol: "trojan".into(),
            server: host.into(),
            port,
            raw_outbound: outbound,
        })
    }

    /// Parse ss:// link (SIP002 format)
    pub fn parse_shadowsocks(link: &str) -> anyhow::Result<ParsedNode> {
        let without_scheme = link.trim_start_matches("ss://");
        // SIP002: ss://base64(method:password)@host:port#name
        let (userinfo_b64, rest) = without_scheme.split_once('@')
            .ok_or_else(|| anyhow::anyhow!("SS 链接格式无效"))?;

        // Split fragment
        let (host_port_str, name) = if let Some(idx) = rest.find('#') {
            (&rest[..idx], urlencoding::decode(&rest[idx + 1..]).unwrap_or_default().to_string())
        } else {
            (rest, "SS Node".to_string())
        };

        // Decode userinfo
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(userinfo_b64)
            .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(userinfo_b64))
            .map_err(|e| anyhow::anyhow!("SS base64 解码失败: {}", e))?;
        let userinfo = String::from_utf8(decoded)?;
        let (method, password) = userinfo.split_once(':')
            .ok_or_else(|| anyhow::anyhow!("SS 用户信息格式无效"))?;

        // Parse host:port (may have query params)
        let host_port_clean = host_port_str.split('?').next().unwrap_or(host_port_str);
        let (host, port) = if let Some(idx) = host_port_clean.rfind(':') {
            let h = &host_port_clean[..idx];
            let p = host_port_clean[idx + 1..].parse::<u16>().unwrap_or(443);
            (h, p)
        } else {
            (host_port_clean, 443u16)
        };

        let outbound = json!({
            "tag": "proxy",
            "protocol": "shadowsocks",
            "settings": {
                "servers": [{
                    "address": host,
                    "port": port,
                    "method": method,
                    "password": password,
                }]
            }
        });

        Ok(ParsedNode {
            id: format!("node-ss-{}-{}", host, port),
            name,
            protocol: "shadowsocks".into(),
            server: host.into(),
            port,
            raw_outbound: outbound,
        })
    }

    /// Parse hysteria2:// or hy2:// link
    pub fn parse_hysteria2(link: &str) -> anyhow::Result<ParsedNode> {
        let normalized = link
            .replacen("hysteria2://", "https://", 1)
            .replacen("hy2://", "https://", 1);
        let url = Url::parse(&normalized)?;
        let password = urlencoding::decode(url.username()).unwrap_or_default().to_string();
        let host = url.host_str().unwrap_or("127.0.0.1");
        let port = url.port().unwrap_or(443);
        let name = url.fragment().map(|f| urlencoding::decode(f).unwrap_or_default().to_string()).unwrap_or_else(|| "Hysteria2 Node".into());

        let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let sni = params.get("sni").cloned().unwrap_or_default();
        let insecure = params.get("insecure").cloned().unwrap_or_default() == "1";

        let outbound = json!({
            "tag": "proxy",
            "protocol": "hysteria2",
            "settings": {
                "address": host,
                "port": port,
                "password": password,
            },
            "streamSettings": {
                "network": "tcp",
                "security": "tls",
                "tlsSettings": {
                    "serverName": sni,
                    "allowInsecure": insecure,
                }
            }
        });

        Ok(ParsedNode {
            id: format!("node-hy2-{}-{}", host, port),
            name,
            protocol: "hysteria2".into(),
            server: host.into(),
            port,
            raw_outbound: outbound,
        })
    }

    /// Parse a single share link (auto-detect protocol)
    pub fn parse_share_link(link: &str) -> anyhow::Result<ParsedNode> {
        let trimmed = link.trim();
        if trimmed.starts_with("vless://") {
            Self::parse_vless(trimmed)
        } else if trimmed.starts_with("vmess://") {
            Self::parse_vmess(trimmed)
        } else if trimmed.starts_with("trojan://") {
            Self::parse_trojan(trimmed)
        } else if trimmed.starts_with("ss://") {
            Self::parse_shadowsocks(trimmed)
        } else if trimmed.starts_with("hysteria2://") || trimmed.starts_with("hy2://") {
            Self::parse_hysteria2(trimmed)
        } else {
            anyhow::bail!("不支持的协议链接: {}", trimmed.chars().take(20).collect::<String>())
        }
    }

    /// Parse subscription content (base64-encoded multi-line share links)
    pub fn parse_subscription_content(content: &str) -> anyhow::Result<Vec<ParsedNode>> {
        let trimmed = content.trim();

        // Try base64 decode first (standard subscription format)
        let decoded_text = if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(trimmed) {
            if let Ok(text) = String::from_utf8(decoded_bytes) {
                text
            } else {
                trimmed.to_string()
            }
        } else if let Ok(decoded_bytes) = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(trimmed) {
            if let Ok(text) = String::from_utf8(decoded_bytes) {
                text
            } else {
                trimmed.to_string()
            }
        } else {
            trimmed.to_string()
        };

        let mut nodes = Vec::new();
        let mut errors = Vec::new();

        for line in decoded_text.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') || line.starts_with("//") {
                continue;
            }
            match Self::parse_share_link(line) {
                Ok(node) => nodes.push(node),
                Err(e) => errors.push(format!("解析失败: {}", e)),
            }
        }

        if nodes.is_empty() && !errors.is_empty() {
            anyhow::bail!("订阅内容解析失败:\n{}", errors.join("\n"));
        }

        Ok(nodes)
    }

    /// Convert Clash YAML proxies section to Xray outbounds
    pub fn parse_clash_yaml(yaml_content: &str) -> anyhow::Result<Vec<ParsedNode>> {
        let docs: Value = serde_yaml::from_str(yaml_content)?;
        let mut nodes = Vec::new();

        if let Some(proxies) = docs.get("proxies").and_then(|p| p.as_array()) {
            for (idx, proxy) in proxies.iter().enumerate() {
                if let (Some(name), Some(ptype), Some(server), Some(port)) = (
                    proxy.get("name").and_then(|v| v.as_str()),
                    proxy.get("type").and_then(|v| v.as_str()),
                    proxy.get("server").and_then(|v| v.as_str()),
                    proxy.get("port").and_then(|v| v.as_u64()),
                ) {
                    let outbound = json!({
                        "tag": format!("proxy-{}", idx),
                        "protocol": ptype.to_lowercase(),
                        "settings": {
                            "address": server,
                            "port": port,
                        }
                    });

                    nodes.push(ParsedNode {
                        id: format!("clash-node-{}", idx),
                        name: name.to_string(),
                        protocol: ptype.to_lowercase(),
                        server: server.to_string(),
                        port: port as u16,
                        raw_outbound: outbound,
                    });
                }
            }
        }

        Ok(nodes)
    }
}
