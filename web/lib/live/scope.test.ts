import { describe, expect, it } from "vitest";
import { detectOffTopic } from "./scope";

/* ============================================================
   The agent takes RTI requests and nothing else. The prompt asks
   for that; this covers the part that does not depend on the
   model complying — and, just as importantly, the RTI sentences
   that must NOT be mistaken for a general-assistant errand.
   ============================================================ */

describe("detectOffTopic", () => {
  it("catches web-lookup asks and capability probes", () => {
    for (const phrase of [
      "can you search the internet for me",
      "just google it and tell me",
      "look it up online please",
      "do you have access to the internet",
      "are you connected to the web",
    ]) {
      expect(detectOffTopic(phrase), phrase).toBe(true);
    }
  });

  it("catches general-assistant errands", () => {
    for (const phrase of [
      "what is the weather today in Hyderabad",
      "tell me a joke",
      "write me a poem about roads",
      "what is the gold rate right now",
      "what is 25 plus 30",
      "kal ka mausam kaisa hai",
      "मौसम कैसा है",
    ]) {
      expect(detectOffTopic(phrase), phrase).toBe(true);
    }
  });

  it("leaves genuine RTI intake speech alone", () => {
    for (const phrase of [
      "I want the price paid for the road contract in my ward",
      "what was the total cost of the tender",
      "I checked the status online on the passport website",
      "the work order and the sanction letter for 2025",
      "I want to know how much money was released for the drain work",
      "NHAI has not repaired the highway near my colony",
    ]) {
      expect(detectOffTopic(phrase), phrase).toBe(false);
    }
  });

  it("ignores an ask that has scrolled out of the live tail", () => {
    const stale = "tell me a joke. " + "then we talked about the ward road for a very long time. ".repeat(12);
    expect(detectOffTopic(stale)).toBe(false);
  });
});
