export type SecurityHeader = { key: string; value: string };

/**
 * Production CSP. Next.js prerenders inline bootstrap scripts, and the UI uses
 * React style attributes for progress widths, so inline script/style must stay
 * allowed. A nonce-based policy would require dynamic rendering via a Proxy.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
].join("; ");

/**
 * Header values are served by `next.config.ts`. CSP is production-only because
 * the dev server needs eval and a WebSocket for hot reload.
 */
export function buildSecurityHeaders(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];

  if (nodeEnv === "production") {
    headers.push({ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY });
  }

  return headers;
}
