import { create } from 'zustand';

interface ConfigStore {
  customJson: string;
  jsonPatch: string;
  socksPort: number;
  httpPort: number;
  dnsStrategy: string;
  enableFakeDns: boolean;
  sniffingEnabled: boolean;
  setCustomJson: (json: string) => void;
  setJsonPatch: (patch: string) => void;
  updatePorts: (socks: number, http: number) => void;
  setDnsStrategy: (strategy: string) => void;
  toggleFakeDns: () => void;
  toggleSniffing: () => void;
}

const DEFAULT_CUSTOM_JSON = `{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "tag": "socks-in",
      "port": 10808,
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "http-in",
      "port": 10809,
      "protocol": "http",
      "settings": {
        "allowTransparent": false
      }
    }
  ],
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
  }
}`;

const DEFAULT_JSON_PATCH = `[
  {
    "op": "add",
    "path": "/policy",
    "value": {
      "levels": {
        "0": {
          "handshake": 4,
          "connIdle": 300,
          "uplinkOnly": 2,
          "downlinkOnly": 5,
          "statsUserUplink": false,
          "statsUserDownlink": false
        }
      },
      "system": {
        "statsInboundUplink": true,
        "statsInboundDownlink": true
      }
    }
  }
]`;

export const useConfigStore = create<ConfigStore>((set) => ({
  customJson: DEFAULT_CUSTOM_JSON,
  jsonPatch: DEFAULT_JSON_PATCH,
  socksPort: 10808,
  httpPort: 10809,
  dnsStrategy: 'IPIfNonMatch',
  enableFakeDns: true,
  sniffingEnabled: true,

  setCustomJson: (json) => set({ customJson: json }),
  setJsonPatch: (patch) => set({ jsonPatch: patch }),
  updatePorts: (socks, http) => set({ socksPort: socks, httpPort: http }),
  setDnsStrategy: (strategy) => set({ dnsStrategy: strategy }),
  toggleFakeDns: () => set((state) => ({ enableFakeDns: !state.enableFakeDns })),
  toggleSniffing: () => set((state) => ({ sniffingEnabled: !state.sniffingEnabled })),
}));
