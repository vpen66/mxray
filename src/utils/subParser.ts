import type { ProxyNode } from '../types';
import { invoke } from '@tauri-apps/api/core';

/**
 * Base64 decode helper supporting standard and URL-safe base64, plus UTF-8 decoding
 */
export function safeBase64Decode(str: string): string {
  try {
    let cleanStr = str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (cleanStr.length % 4 !== 0) {
      cleanStr += '=';
    }
    const decoded = atob(cleanStr);
    try {
      return decodeURIComponent(
        decoded
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return decoded;
    }
  } catch {
    return str;
  }
}

/**
 * Parse a single VLESS / VMess / Trojan / Hysteria2 / Shadowsocks URL into ProxyNode
 */
export function parseNodeUrl(rawUrl: string): ProxyNode | null {
  const urlStr = rawUrl.trim();
  if (!urlStr) return null;

  const id = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    if (urlStr.startsWith('vless://')) {
      // Format: vless://uuid@host:port?param1=val1#remark
      const hashIndex = urlStr.indexOf('#');
      let mainPart = urlStr;
      let remark = 'VLESS 节点';

      if (hashIndex !== -1) {
        mainPart = urlStr.substring(0, hashIndex);
        try {
          remark = decodeURIComponent(urlStr.substring(hashIndex + 1)) || remark;
        } catch {
          remark = urlStr.substring(hashIndex + 1) || remark;
        }
      }

      const body = mainPart.replace('vless://', '');
      const [userHostPort, queryStr] = body.split('?');
      const atIndex = userHostPort.lastIndexOf('@');
      if (atIndex === -1) return null;

      const uuid = userHostPort.substring(0, atIndex);
      const hostPort = userHostPort.substring(atIndex + 1);

      const lastColon = hostPort.lastIndexOf(':');
      if (lastColon === -1) return null;

      const server = hostPort.substring(0, lastColon);
      const port = parseInt(hostPort.substring(lastColon + 1), 10);
      if (isNaN(port)) return null;

      const params = new URLSearchParams(queryStr || '');
      const security = (params.get('security') as 'none' | 'tls' | 'reality') || (params.get('tls') ? 'tls' : 'none');
      const network = (params.get('type') || params.get('network') || 'tcp') as 'tcp' | 'ws' | 'grpc' | 'h2';

      return {
        id,
        name: remark,
        protocol: 'vless',
        server,
        port,
        uuid,
        security,
        sni: params.get('sni') || params.get('host') || undefined,
        flow: params.get('flow') || undefined,
        fingerprint: params.get('fp') || undefined,
        publicKey: params.get('pbk') || undefined,
        shortId: params.get('sid') || undefined,
        network,
        path: params.get('path') || undefined,
        serviceName: params.get('serviceName') || params.get('service_name') || undefined,
        rawUrl: urlStr,
        delay: 0,
      };
    }

    if (urlStr.startsWith('vmess://')) {
      const b64 = urlStr.replace('vmess://', '');
      const decodedJson = safeBase64Decode(b64);
      const obj = JSON.parse(decodedJson);

      return {
        id,
        name: obj.ps || 'VMess 节点',
        protocol: 'vmess',
        server: obj.add,
        port: parseInt(obj.port, 10),
        uuid: obj.id,
        security: obj.tls === 'tls' ? 'tls' : 'none',
        sni: obj.sni || obj.host || undefined,
        network: obj.net || 'tcp',
        path: obj.path || undefined,
        rawUrl: urlStr,
        delay: 0,
      };
    }

    if (urlStr.startsWith('trojan://')) {
      const hashIndex = urlStr.indexOf('#');
      let mainPart = urlStr;
      let remark = 'Trojan 节点';

      if (hashIndex !== -1) {
        mainPart = urlStr.substring(0, hashIndex);
        try {
          remark = decodeURIComponent(urlStr.substring(hashIndex + 1)) || remark;
        } catch {
          remark = urlStr.substring(hashIndex + 1) || remark;
        }
      }

      const body = mainPart.replace('trojan://', '');
      const [userHostPort, queryStr] = body.split('?');
      const atIndex = userHostPort.lastIndexOf('@');
      if (atIndex === -1) return null;

      const password = userHostPort.substring(0, atIndex);
      const hostPort = userHostPort.substring(atIndex + 1);
      const lastColon = hostPort.lastIndexOf(':');
      if (lastColon === -1) return null;

      const server = hostPort.substring(0, lastColon);
      const port = parseInt(hostPort.substring(lastColon + 1), 10);
      const params = new URLSearchParams(queryStr || '');

      return {
        id,
        name: remark,
        protocol: 'trojan',
        server,
        port,
        password,
        security: 'tls',
        sni: params.get('sni') || params.get('peer') || undefined,
        network: (params.get('type') || 'tcp') as 'tcp' | 'ws' | 'grpc' | 'h2',
        path: params.get('path') || undefined,
        rawUrl: urlStr,
        delay: 0,
      };
    }

    if (urlStr.startsWith('hysteria2://') || urlStr.startsWith('hy2://')) {
      const hashIndex = urlStr.indexOf('#');
      let mainPart = urlStr;
      let remark = 'Hysteria2 节点';

      if (hashIndex !== -1) {
        mainPart = urlStr.substring(0, hashIndex);
        try {
          remark = decodeURIComponent(urlStr.substring(hashIndex + 1)) || remark;
        } catch {
          remark = urlStr.substring(hashIndex + 1) || remark;
        }
      }

      const prefix = urlStr.startsWith('hysteria2://') ? 'hysteria2://' : 'hy2://';
      const body = mainPart.replace(prefix, '');
      const [userHostPort, queryStr] = body.split('?');
      const atIndex = userHostPort.lastIndexOf('@');
      if (atIndex === -1) return null;

      const password = userHostPort.substring(0, atIndex);
      const hostPort = userHostPort.substring(atIndex + 1);
      const lastColon = hostPort.lastIndexOf(':');
      if (lastColon === -1) return null;

      const server = hostPort.substring(0, lastColon);
      const port = parseInt(hostPort.substring(lastColon + 1), 10);
      const params = new URLSearchParams(queryStr || '');

      return {
        id,
        name: remark,
        protocol: 'hysteria2',
        server,
        port,
        password,
        sni: params.get('sni') || undefined,
        rawUrl: urlStr,
        delay: 0,
      };
    }
  } catch (err) {
    console.error('Failed to parse node URL:', err);
  }

  return null;
}

/**
 * Parses raw text or Base64 decoded text into an array of ProxyNodes
 */
export function parseSubscriptionContent(rawContent: string): ProxyNode[] {
  let content = rawContent.trim();
  if (!content) return [];

  // If content does not start with protocol scheme, try Base64 decoding
  if (
    !content.startsWith('vless://') &&
    !content.startsWith('vmess://') &&
    !content.startsWith('trojan://') &&
    !content.startsWith('hy2://') &&
    !content.startsWith('hysteria2://') &&
    !content.startsWith('ss://')
  ) {
    const decoded = safeBase64Decode(content);
    if (decoded && decoded !== content) {
      content = decoded;
    }
  }

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nodes: ProxyNode[] = [];

  for (const line of lines) {
    const parsed = parseNodeUrl(line);
    if (parsed) {
      nodes.push(parsed);
    }
  }

  return nodes;
}

/**
 * Fetch remote subscription URL content and parse into ProxyNodes
 */
export async function fetchAndParseSubscriptionUrl(url: string): Promise<ProxyNode[]> {
  const cleanUrl = url.trim();

  // If user pasted a node link directly into URL field
  if (
    cleanUrl.startsWith('vless://') ||
    cleanUrl.startsWith('vmess://') ||
    cleanUrl.startsWith('trojan://') ||
    cleanUrl.startsWith('hy2://') ||
    cleanUrl.startsWith('hysteria2://')
  ) {
    return parseSubscriptionContent(cleanUrl);
  }

  let text = '';

  // 1. Try Tauri Rust backend command if running in Tauri App environment
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      text = await invoke<string>('fetch_subscription', { url: cleanUrl });
    } catch (err: any) {
      console.warn('Tauri invoke fetch_subscription failed:', err);
    }
  }

  // 2. Fallback to browser fetch if text is still empty
  if (!text) {
    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'v2rayN/6.39 mxray/1.0.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      text = await response.text();
    } catch (err: any) {
      const isSslOrCors = err?.message?.includes('Load failed') || err?.name === 'TypeError' || err?.message?.includes('Failed to fetch');
      if (isSslOrCors) {
        throw new Error(
          `浏览器阻止了对 IP/无安全证书地址的直连 (${err.message})。在桌面客户端中运行可自动忽略证书，或请在【节点分享码】标签中直接粘贴 vless:// 代码。`
        );
      }
      throw err;
    }
  }

  return parseSubscriptionContent(text);
}
