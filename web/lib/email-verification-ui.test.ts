import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmailVerification from "@/components/EmailVerification";
import { DEMO_CODE, DEMO_EMAIL } from "./application-records";

/* Lives in lib/ (and builds its element without JSX) only because vitest is
   configured to collect lib/**\/*.test.ts. */
const html = renderToStaticMarkup(
  createElement(EmailVerification, {
    email: DEMO_EMAIL,
    onEmailChange: () => {},
    onVerified: () => {},
  })
);

describe("email verification panel", () => {
  it("shows the citizen the code instead of making them guess it", () => {
    expect(html).toContain(DEMO_CODE);
    expect(html).toContain("four zeros");
    expect(html).toContain("no email is sent anywhere");
  });

  it("starts on the demo address", () => {
    expect(html).toContain(DEMO_EMAIL);
  });

  it("no longer advertises a second code", () => {
    expect(html).not.toContain("4000");
  });
});
