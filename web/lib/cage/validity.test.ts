import { describe, expect, it } from "vitest";
import { screenValidity } from "./validity";
import { notesFallback, assessFallback, chatFallback } from "./schemas";

describe("Deterministic RTI Validity & Financial Assessment", () => {
  describe("screenValidity - Non-RTI and Out-of-scope inputs", () => {
    it("catches video game and gaming cheat inquiries", () => {
      const gamingInputs = [
        "assassins creed cheats and walkthrough",
        "how to beat the boss in assassins creed valhalla",
        "give me cheat codes for gta v",
        "minecraft diamond crafting recipe and seeds",
        "roblox free robux glitch and cheats",
        "fortnite vbucks codes",
        "pubg sensitivity settings for mobile",
        "valorant aimbot download",
      ];
      for (const input of gamingInputs) {
        const res = screenValidity(input);
        expect(res.is_valid_rti, `Failed for input: ${input}`).toBe(false);
        expect(res.can_proceed).toBe(false);
        expect(res.refusal_reason).toContain("Cannot be filed under RTI Act");
      }
    });

    it("catches keyboard mash and gibberish", () => {
      const gibberishInputs = [
        "asdfghjkl",
        "qwertyuiopasdfghjkl",
        "aaaaaaaaaaa",
        "zzzzzzzzzzzz",
        "1234567890",
        "bcdfghjklmnpqrstvwxyz",
      ];
      for (const input of gibberishInputs) {
        const res = screenValidity(input);
        expect(res.is_valid_rti, `Failed for gibberish: ${input}`).toBe(false);
        expect(res.can_proceed).toBe(false);
      }
    });

    it("catches cryptocurrency, recipes, weather, and coding prompts", () => {
      const outOfScope = [
        "buy bitcoin now and trade crypto",
        "how to cook chicken biryani recipe",
        "what is the weather today in Delhi",
        "write python code to sort an array",
        "my girlfriend broke up with me dating advice",
        "buy cheap used car on sale",
      ];
      for (const input of outOfScope) {
        const res = screenValidity(input);
        expect(res.is_valid_rti, `Failed for out-of-scope: ${input}`).toBe(false);
        expect(res.can_proceed).toBe(false);
      }
    });
  });

  describe("screenValidity - Genuine RTI Concerns & Financial Detection", () => {
    it("allows valid road and infrastructure complaints with financial detection", () => {
      const input =
        "The road in Ward 12 was sanctioned for 50 lakhs budget but never repaired. Contractor left it incomplete.";
      const res = screenValidity(input);
      expect(res.is_valid_rti).toBe(true);
      expect(res.can_proceed).toBe(true);
      expect(res.refusal_reason).toBeNull();
      expect(res.financial.detected).toBe(true);
      expect(res.financial.questions.length).toBeGreaterThan(0);
      expect(res.financial.suggested_records.length).toBeGreaterThan(0);
    });

    it("allows passport and government document delay requests", () => {
      const input = "My passport application was submitted 3 months ago at Regional Passport Office and is delayed.";
      const res = screenValidity(input);
      expect(res.is_valid_rti).toBe(true);
      expect(res.can_proceed).toBe(true);
    });

    it("allows pension and welfare entitlement issues", () => {
      const input = "My father retired from Railways and his pension gratuity arrears have not been released for 6 months.";
      const res = screenValidity(input);
      expect(res.is_valid_rti).toBe(true);
      expect(res.financial.detected).toBe(true);
    });
  });

  describe("notesFallback & chatFallback integration", () => {
    it("notesFallback refuses invalid input and returns valid_for_rti: false", () => {
      const notes = notesFallback("assasins creed cheat codes for playstation");
      expect(notes.valid_for_rti).toBe(false);
      expect(notes.records_sought).toEqual([]);
      expect(notes.refusal_reason).toContain("Cannot be filed under RTI Act");
    });

    it("notesFallback produces records for genuine input", () => {
      const notes = notesFallback("NHAI highway pothole repair work order and inspection reports");
      expect(notes.valid_for_rti).toBe(true);
      expect(notes.records_sought.length).toBeGreaterThanOrEqual(3);
    });

    it("assessFallback correctly mirrors screenValidity", () => {
      const invalid = assessFallback("buy bitcoin forex trading");
      expect(invalid.is_valid_rti).toBe(false);
      expect(invalid.can_proceed).toBe(false);

      const valid = assessFallback("Municipal drainage work budget and contractor tender copy in Sector 4");
      expect(valid.is_valid_rti).toBe(true);
      expect(valid.can_proceed).toBe(true);
    });

    it("chatFallback cuts conversation on invalid input", () => {
      const res = chatFallback([{ role: "user", content: "assasins creed video game" }]);
      expect(res.is_valid_rti).toBe(false);
      expect(res.can_proceed).toBe(false);
      expect(res.reply).toContain("Cannot be filed under RTI Act");
    });
  });
});
