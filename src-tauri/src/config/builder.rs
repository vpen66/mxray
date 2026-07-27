use serde_json::{json, Value};

pub struct ConfigBuilder {
    socks_port: u16,
    http_port: u16,
    enable_tun: bool,
    active_outbound: Value,
}

impl ConfigBuilder {
    pub fn new(socks_port: u16, http_port: u16, enable_tun: bool, active_outbound: Value) -> Self {
        Self {
            socks_port,
            http_port,
            enable_tun,
            active_outbound,
        }
    }

    pub fn build(&self) -> Value {
        let mut inbounds = vec![
            json!({
                "tag": "socks-in",
                "port": self.socks_port,
                "listen": "127.0.0.1",
                "protocol": "socks",
                "settings": {
                    "auth": "noauth",
                    "udp": true
                },
                "sniffing": {
                    "enabled": true,
                    "destOverride": ["http", "tls", "quic"]
                }
            }),
            json!({
                "tag": "http-in",
                "port": self.http_port,
                "listen": "127.0.0.1",
                "protocol": "http"
            }),
        ];

        if self.enable_tun {
            inbounds.push(json!({
                "tag": "tun-in",
                "protocol": "dokodemo-door",
                "settings": {
                    "network": "tcp,udp",
                    "followRedirect": true
                },
                "streamSettings": {
                    "sockopt": {
                        "tproxy": "tproxy"
                    }
                },
                "sniffing": {
                    "enabled": true,
                    "destOverride": ["http", "tls", "quic", "fakedns"]
                }
            }));
        }

        let mut outbounds = vec![self.active_outbound.clone()];
        outbounds.push(json!({
            "tag": "direct",
            "protocol": "freedom",
            "settings": {}
        }));
        outbounds.push(json!({
            "tag": "block",
            "protocol": "blackhole",
            "settings": {
                "response": {
                    "type": "http"
                }
            }
        }));

        json!({
            "log": {
                "loglevel": "warning"
            },
            "inbounds": inbounds,
            "outbounds": outbounds,
            "routing": {
                "domainStrategy": "IPIfNonMatch",
                "rules": [
                    {
                        "type": "field",
                        "outboundTag": "direct",
                        "domain": ["geosite:cn", "geosite:private"]
                    },
                    {
                        "type": "field",
                        "outboundTag": "direct",
                        "ip": ["geoip:cn", "geoip:private"]
                    },
                    {
                        "type": "field",
                        "outboundTag": "block",
                        "domain": ["geosite:category-ads-all"]
                    }
                ]
            },
            "dns": {
                "servers": [
                    "https://1.1.1.1/dns-query",
                    "223.5.5.5",
                    "localhost"
                ]
            }
        })
    }
}
