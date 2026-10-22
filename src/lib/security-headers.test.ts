import { describe, expect, it } from "vitest";

import { CONTENT_SECURITY_POLICY, buildSecurityHeaders } from "./security-headers";

function headerMap(nodeEnv: string) {
  return new Map(buildSecurityHeaders(nodeEnv).map(({ key, value }) => [key, value]));
}

describe("buildSecurityHeaders", () => {
  it("sets the baseline hardening headers in every environment", () => {
    const headers = headerMap("development");

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.has("Content-Security-Policy")).toBe(false);
  });

  it("enforces the CSP in production", () => {
    const headers = headerMap("production");

    expect(headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
  });

  it("does not add an HSTS or CORS header", () => {
    const headers = headerMap("production");

    expect(headers.has("Strict-Transport-Security")).toBe(false);
    expect(headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
});
