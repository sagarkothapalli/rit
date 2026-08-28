import { describe, expect, it } from "vitest";
import { createSessionMemory } from "./sessionMemory";

/* ============================================================
   Session memory.

   Two behaviours are being pinned down here.

   1. Within one request, the agent remembers. The facts the
      citizen gave and the questions the agent already asked are
      both in the briefing, so the agent can be told not to ask
      twice and not to restart the intake half way through.

   2. Across requests, it remembers nothing. Every call to
      createSessionMemory() returns a blank memory, and nothing
      in this module touches sessionStorage, localStorage, or the
      network — the memory lives and dies with the request.
   ============================================================ */

describe("facts established by the citizen", () => {
  it("keeps the concern once there is enough of it", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("hi");
    expect(memory.facts().concern).toBeNull();
    memory.noteCitizen("the drain in my colony has been overflowing for months and nobody comes");
    expect(memory.facts().concern).toContain("drain");
  });

  it("picks up a ward, a period, and an office as they are spoken", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The drain in Ward 12 has been overflowing since 2024 until 2025.");
    memory.noteCitizen("I complained at the ward office twice.");
    const facts = memory.facts();
    expect(facts.place).toBe("Ward 12");
    expect(facts.period).toBe("2024–2025");
    expect(facts.office).toBe("the ward office");
  });

  it("falls back to the city when no ward was named", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The garbage in Visakhapatnam is never collected from my street.");
    expect(memory.facts().place).toBe("Visakhapatnam");
  });

  it("keeps the particulars a regex can be sure of", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("My mobile is 9876543210, pin code 530026, email ramesh@gmail.com");
    const facts = memory.facts();
    expect(facts.mobile).toBe("9876543210");
    expect(facts.pincode).toBe("530026");
    expect(facts.email).toBe("ramesh@gmail.com");
  });

  it("never lets a later mention overwrite an established fact", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The problem is in Ward 12 of my colony.");
    memory.noteCitizen("My friend lives in Ward 40 but that is not the issue.");
    expect(memory.facts().place).toBe("Ward 12");
  });

  it("invents nothing from a greeting", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("hello, are you there?");
    const facts = memory.facts();
    expect(facts.place).toBeNull();
    expect(facts.period).toBeNull();
    expect(facts.office).toBeNull();
    expect(facts.mobile).toBeNull();
  });
});

describe("the agent's own questions are remembered", () => {
  it("collects questions and forbids repeats in the briefing", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("My colony drain has been overflowing since 2025 and nobody has come to fix it.");
    memory.noteAgent("Which road or ward is this in?");
    const briefing = memory.briefing() ?? "";
    expect(briefing).toContain("Which road or ward is this in?");
    expect(briefing).toMatch(/do NOT ask any of them/i);
  });

  it("does not count a statement as a question", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The street light on my lane has been dead for a year now, please help.");
    memory.noteAgent("I will prepare your application now.");
    expect(memory.briefing() ?? "").not.toContain("I will prepare");
  });

  it("keeps one copy of a question seen across two transcript chunks", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The drain in my colony overflows every monsoon and the ward ignores it.");
    memory.noteAgent("Which months should the records");
    memory.noteAgent("cover?");
    const briefing = memory.briefing() ?? "";
    const occurrences = briefing.split("Which months should the records cover?").length - 1;
    expect(occurrences).toBe(1);
  });

  it("recognises a question in a non-Latin script", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("మా ఏరియాలో రోడ్డు బాగా లేదు, రెండు సంవత్సరాల నుండి ఇదే పరిస్థితి ఉంది.");
    memory.noteAgent("ఏ వార్డు లో ఉంది?");
    expect(memory.briefing() ?? "").toContain("ఏ వార్డు లో ఉంది?");
  });
});

describe("the briefing", () => {
  it("says nothing when nothing is established", () => {
    expect(createSessionMemory().briefing()).toBeNull();
  });

  it("states a settled Central jurisdiction and names the holder", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("NHAI has not repaired the national highway near my colony since 2024.");
    const briefing = memory.briefing() ?? "";
    expect(briefing).toContain("CENTRAL");
    expect(briefing).toContain("National Highways Authority of India");
  });

  it("states a settled State jurisdiction", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The drain in Gajuwaka, Visakhapatnam has been overflowing since 2025.");
    expect(memory.briefing() ?? "").toContain("STATE");
  });

  it("tells the agent not to raise the jurisdiction twice once it has", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The drain in Gajuwaka, Visakhapatnam has been overflowing since 2025.");
    memory.markJurisdictionSpoken();
    expect(memory.briefing() ?? "").toMatch(/already told the citizen/i);
  });

  it("orders the agent to continue rather than restart", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("My colony street light has been out for eight months and nobody responds.");
    const briefing = memory.briefing() ?? "";
    expect(briefing).toMatch(/do not restart the intake/i);
    expect(briefing).toMatch(/let the citizen finish speaking/i);
  });

  it("goes stale only when something changed", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("The drain in Ward 12 has been overflowing since 2025 and nobody comes to clear it.");
    expect(memory.briefingIsStale()).toBe(true);
    memory.queue("memory", memory.briefing() ?? "");
    memory.drain();
    expect(memory.briefingIsStale()).toBe(false);
    memory.noteAgent("Which months should the records cover?");
    expect(memory.briefingIsStale()).toBe(true);
  });
});

describe("notes go out as one turn, in priority order", () => {
  it("coalesces every queued note into a single string", () => {
    const memory = createSessionMemory();
    memory.queue("proceed", "PROCEED");
    memory.queue("identity", "IDENTITY");
    memory.queue("jurisdiction", "JURISDICTION");
    const drained = memory.drain() ?? "";
    expect(drained.indexOf("IDENTITY")).toBeLessThan(drained.indexOf("JURISDICTION"));
    expect(drained.indexOf("JURISDICTION")).toBeLessThan(drained.indexOf("PROCEED"));
    expect(memory.pending()).toBe(false);
  });

  it("collapses a repeated queue of the same kind", () => {
    const memory = createSessionMemory();
    memory.queue("jurisdiction", "first");
    memory.queue("jurisdiction", "second");
    expect(memory.drain()).toBe("second");
  });

  it("drains to null when nothing is queued", () => {
    expect(createSessionMemory().drain()).toBeNull();
  });

  it("lets a note be cancelled before it is sent", () => {
    const memory = createSessionMemory();
    memory.queue("proceed", "PROCEED");
    memory.cancel("proceed");
    expect(memory.pending()).toBe(false);
  });
});

describe("silence tracking", () => {
  it("treats fresh speech as zero silence", () => {
    const memory = createSessionMemory();
    memory.noteCitizen("the road is broken");
    expect(memory.silenceMs()).toBeLessThan(50);
  });
});

describe("nothing survives the request", () => {
  it("starts blank every time", () => {
    const first = createSessionMemory();
    first.noteCitizen("NHAI has not repaired the highway near Ward 12 since 2024.");
    first.noteAgent("Which ward is this?");
    expect(first.briefing()).not.toBeNull();

    const second = createSessionMemory();
    expect(second.briefing()).toBeNull();
    expect(second.transcript()).toBe("");
    expect(second.facts().place).toBeNull();
    expect(second.verdict()).toBeNull();
    expect(second.jurisdictionSpoken()).toBe(false);
  });
});
