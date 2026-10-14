const dns = require('dns').promises;
const net = require('net');

/**
 * Checks whether an IP address belongs to private/internal/reserved ranges
 * to prevent SSRF vulnerabilities.
 */
function isPrivateOrReservedIp(ip) {
  if (!ip) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;

    // 0.0.0.0/8 - Current network
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 - Private
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 - Loopback
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 - Link-local / Cloud metadata (AWS/GCP/Azure: 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 - Private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 - Private
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 - Documentation
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
    // 224.0.0.0/4 - Multicast
    if (parts[0] >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // Unspecified
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
    // Unique local address fc00::/7
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link local fe80::/10
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // IPv4 mapped ::ffff:x.x.x.x
    if (lower.includes('::ffff:')) {
      const v4Part = lower.split('::ffff:')[1];
      if (v4Part && net.isIPv4(v4Part)) {
        return isPrivateOrReservedIp(v4Part);
      }
    }
    return false;
  }

  return true;
}

/**
 * Validates a target URL and its resolved IP against SSRF rules.
 * Resolves hostname using DNS to ensure destination is public.
 */
async function validateUrlForSsrf(rawUrl) {
  let parsed;
  try {
    let urlString = (rawUrl || '').trim();
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = `https://${urlString}`;
    }
    parsed = new URL(urlString);
  } catch (err) {
    return { safe: false, reason: 'Malformed URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { safe: false, reason: 'Missing hostname in URL' };
  }

  // Common blacklisted local hostnames
  const blockedHostnames = ['localhost', 'local', 'internal', '0.0.0.0', '127.0.0.1', 'metadata.google.internal'];
  if (blockedHostnames.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return { safe: false, reason: 'Access to local or internal hostnames is prohibited' };
  }

  // If already an IP address
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { safe: false, reason: 'Access to private or local IP ranges is blocked' };
    }
    return { safe: true, parsedUrl: parsed.toString(), hostname };
  }

  // Resolve DNS to verify all resolved IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, reason: 'Unable to resolve domain via DNS' };
    }

    for (const entry of addresses) {
      if (isPrivateOrReservedIp(entry.address)) {
        return { safe: false, reason: `Domain resolves to a blocked or internal IP (${entry.address})` };
      }
    }

    return { safe: true, parsedUrl: parsed.toString(), hostname, addresses };
  } catch (dnsErr) {
    return { safe: false, reason: `DNS lookup failed: ${dnsErr.message}` };
  }
}

/**
 * Safely fetches a webpage with SSRF prevention, redirect checks, size cap, and timeout.
 */
async function safeFetchUrl(targetUrl, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const maxBytes = options.maxBytes || 500 * 1024; // 500 KB limit to prevent memory exhaustion
  const maxRedirects = 3;

  let currentUrl = targetUrl;
  let redirectsFollowed = 0;

  while (redirectsFollowed <= maxRedirects) {
    const validation = await validateUrlForSsrf(currentUrl);
    if (!validation.safe) {
      return {
        success: false,
        error: validation.reason,
        finalUrl: currentUrl,
        statusCode: null
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Evently-Authenticity-Detector/1.0 (+https://evently.local)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'manual', // Manually validate every redirect step for SSRF
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle redirect
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          return { success: false, error: 'Redirect received without location header', statusCode: response.status, finalUrl: currentUrl };
        }
        const resolvedRedirect = new URL(locationHeader, currentUrl).toString();
        currentUrl = resolvedRedirect;
        redirectsFollowed++;
        continue;
      }

      // Check content-type
      const contentType = response.headers.get('content-type') || '';
      
      // Read body with limit
      const reader = response.body.getReader();
      const chunks = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          chunks.push(value);
          if (totalBytes >= maxBytes) {
            reader.cancel();
            break;
          }
        }
      }

      const combined = Buffer.concat(chunks.map(c => Buffer.from(c)));
      const htmlText = combined.toString('utf-8');

      return {
        success: response.ok,
        statusCode: response.status,
        finalUrl: currentUrl,
        contentType,
        body: htmlText,
        isHttps: currentUrl.startsWith('https://'),
        totalBytes
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { success: false, error: 'Request timed out while accessing website', finalUrl: currentUrl, statusCode: null };
      }
      return { success: false, error: err.message, finalUrl: currentUrl, statusCode: null };
    }
  }

  return { success: false, error: 'Too many redirects encountered', finalUrl: currentUrl, statusCode: null };
}

module.exports = {
  isPrivateOrReservedIp,
  validateUrlForSsrf,
  safeFetchUrl
};
