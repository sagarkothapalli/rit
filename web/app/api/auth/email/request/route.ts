import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import {
  DEFAULT_BYPASS_CODE,
  emailFingerprint,
  exposeCodeToClient,
  issueCode,
  otpBypassEnabled,
} from "@/lib/email-verification.server";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().email().max(254) });

/**
 * Issues a verification code for an email address.
 *
 * Rate limited per IP on top of the per-address cooldown in the store, so
 * this cannot be used to send unwanted mail to a third party in volume.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "otp-request"), 6, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });

  const result = await issueCode(parsed.data.email);
  if (!result.ok) {
    return NextResponse.json(
      { error: "COOLDOWN", retryAfter: result.retryAfterSec },
      { status: 429 },
    );
  }

  console.info(`[praja-rti] verification code issued for ${emailFingerprint(parsed.data.email)}`);

  const delivered = result.delivery.channel === "email";
  const showDemoBypass = otpBypassEnabled() && exposeCodeToClient();
  const actualCode = result.delivery.channel === "console" ? result.delivery.code : undefined;
  const devCode = showDemoBypass ? DEFAULT_BYPASS_CODE : process.env.NODE_ENV === "production" ? undefined : actualCode;

  return NextResponse.json({
    ok: true,
    expiresIn: result.expiresInSec,
    delivery: delivered ? "email" : "console",
    devCode,
    notice: delivered
      ? "A six digit code has been emailed to you. It expires in ten minutes."
      : showDemoBypass
        ? "Demo verification is on. Use the labelled demo code. This is not available in production."
        : undefined,
    demoBypass: showDemoBypass || undefined,
  });
}
