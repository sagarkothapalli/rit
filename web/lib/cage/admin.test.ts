import { beforeEach, describe, expect, it } from "vitest";
import { cookieOk, mintSession, verifyPin } from "./admin";
import { clientKey } from "./ratelimit";
import { csrfFailure } from "@/lib/security/csrf";

function req(headers: Record<string, string>, method = "POST"): Request {
  return new Request("https://praja.example/api/x", { method, headers });
}

describe("admin session", () => {
  beforeEach(() => {
    process.env.ADMIN_PIN = "13571357";
    process.env.ADMIN_SESSION_SECRET = "s".repeat(48);
  });

  it("accepts only the configured PIN", () => {
    expect(verifyPin("13571357")).toBe(true);
    expect(verifyPin(" 1357 1357 ")).toBe(true);
    expect(verifyPin("13571358")).toBe(false);
    expect(verifyPin("1357")).toBe(false); // shorter guess must not throw or pass
  });

  it("fails closed when no PIN is configured", () => {
    process.env.ADMIN_PIN = "";
    expect(verifyPin("")).toBe(false);
    expect(verifyPin("13571357")).toBe(false);
    expect(cookieOk("anything")).toBe(false);
  });

  it("mints unguessable cookies that are not derived from the PIN", () => {
    const a = mintSession()!;
    const b = mintSession()!;
    expect(a).not.toEqual(b);
    expect(a).not.toContain("13571357");
    expect(cookieOk(a)).toBe(true);
  });

  it("rejects tampered, truncated and expired cookies", () => {
    const token = mintSession()!;
    const [exp, nonce, mac] = token.split(".");
    expect(cookieOk(`${exp}.${nonce}.${"0".repeat(mac.length)}`)).toBe(false);
    expect(cookieOk(`${Date.now() + 9e9}.${nonce}.${mac}`)).toBe(false); // extended expiry
    expect(cookieOk(`${exp}.${nonce}`)).toBe(false);
    expect(cookieOk(`${Date.now() - 1000}.${nonce}.${mac}`)).toBe(false);
  });

  it("does not honour a cookie signed with a different secret", () => {
    const token = mintSession()!;
    process.env.ADMIN_SESSION_SECRET = "rotated".repeat(8);
    expect(cookieOk(token)).toBe(false);
  });
});

describe("rate limit identity", () => {
  it("ignores a client-supplied x-forwarded-for prefix", () => {
    // Client forges "1.1.1.1"; the proxy appends the real address after it.
    const forged = clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }), "r");
    const plain = clientKey(req({ "x-forwarded-for": "203.0.113.9" }), "r");
    expect(forged).toBe(plain);
  });

  it("prefers x-real-ip", () => {
    expect(clientKey(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }), "r")).toBe(
      "r:203.0.113.9"
    );
  });
});

describe("csrf", () => {
  const same = { "sec-fetch-site": "same-origin" };
  it("allows same-origin browser writes", () => {
    expect(csrfFailure(req(same))).toBeNull();
    expect(csrfFailure(req({ origin: "https://praja.example", host: "praja.example" }))).toBeNull();
  });

  it("refuses cross-site and header-less writes", () => {
    expect(csrfFailure(req({ origin: "https://evil.example", host: "praja.example" }))).not.toBeNull();
    expect(csrfFailure(req({}))).not.toBeNull(); // no sec-fetch-site, no origin, no referer
  });

  it("leaves reads alone", () => {
    expect(csrfFailure(req({}, "GET"))).toBeNull();
  });
});
