use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use url::Url;
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
    /// Parse vless:// link into Xray outbound JSON
    pub fn parse_vless(link: &str) -> anyhow::Result<ParsedNode> {
        let url = Url::parse(link)?;
        let uuid = url.username();
        let host = url.host_str().unwrap_or("127.0.0.1");
        let port = url.port().unwrap_or(443);
        let name = url.fragment().map(|f| urlencoding::decode(f).unwrap_or_default().to_string()).unwrap_or_else(|| "VLESS Node".into());

        let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let security = params.get("security").cloned().unwrap_or_else(|| "none".into());
        let sni = params.get("sni").cloned().unwrap_or_default();
        let pbk = params.get("pbk").cloned().unwrap_or_default();
        let sid = params.get("sid").cloned().unwrap_or_default();
        let flow = params.get("flow").cloned().unwrap_or_default();
        let net = params.get("type").cloned().unwrap_or_else(|| "tcp".into());

        let mut stream_settings = json!({
            "network": net,
            "security": security,
        });

        if security == "reality" {
            stream_settings["realitySettings"] = json!({
                "serverName": sni,
                "publicKey": pbk,
                "shortId": sid,
                "fingerprint": params.get("fp").cloned().unwrap_or_else(|| "chrome".into()),
            });
        } else if security == "tls" {
            stream_settings["tlsSettings"] = json!({
                "serverName": sni,
                "allowInsecure": false,
            });
        }

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
