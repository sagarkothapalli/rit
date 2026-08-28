import { describe, expect, it } from "vitest";
import {
  classifyJurisdiction,
  jurisdictionSummary,
  spokenCentralConfirmation,
  spokenJurisdictionFlag,
} from "./jurisdiction";

/* ============================================================
   Jurisdiction triage.

   The case that drove this file: a citizen says "NHAI has not
   repaired the road in my colony". Every civic word in that
   sentence — road, colony, potholes — points at a municipal
   corporation, and the classifier used to add them all up and
   out-vote the one word that actually settles the question.

   So the table is tiered. Naming the records holder ("NHAI",
   "GVMC", "central government") is an authority-tier statement
   and outranks any number of subject words on the other side.
   ============================================================ */

describe("a named Central authority outranks civic subject words", () => {
  const centralWithCivicNoise = [
    "NHAI road in my colony has potholes and the drainage is bad",
    "I want to complain against NHAI. The national highway near my village road is full of potholes and the ward office does not help.",
    "The road in my locality is a national highway maintained by NHAI but the potholes are never repaired and my colony road is damaged too",
    "National Highway Authority of India has not repaired the highway, my area street light is also off",
    "EPFO has not settled my provident fund claim and my area municipal office did nothing either",
    "The post office near my colony road lost my speed post parcel",
    "My passport is delayed and my colony drain is overflowing as well",
  ];

  for (const text of centralWithCivicNoise) {
    it(`stays Central: "${text.slice(0, 52)}…"`, () => {
      const verdict = classifyJurisdiction(text);
      expect(verdict.level).toBe("central");
      expect(verdict.namedAuthority).toBe(true);
      expect(verdict.outsideCentralPortal).toBe(false);
    });
  }

  it("names NHAI as the records holder, not a municipal wing", () => {
    const verdict = classifyJurisdiction("NHAI has not repaired the road in my colony for two years");
    expect(verdict.recommendedBody).toContain("National Highways Authority of India");
    expect(verdict.filingChannel).toContain("rtionline.gov.in");
  });

  it("records the civic words it heard so the agent can explain itself", () => {
    const verdict = classifyJurisdiction("NHAI highway work, and the drainage in my colony is blocked");
    expect(verdict.alsoMentioned).toBeTruthy();
    expect(verdict.reasons.join(" ")).toMatch(/not a municipal or State matter/i);
  });

  it("says nothing about municipal work when there was no civic word", () => {
    const verdict = classifyJurisdiction("I want NHAI toll plaza collection records for 2025");
    expect(verdict.level).toBe("central");
    expect(verdict.alsoMentioned).toBeNull();
  });
});

describe("the citizen naming the level directly is believed", () => {
  it("takes 'this is a central government matter' as Central", () => {
    const verdict = classifyJurisdiction(
      "This is a central government complaint about the National Highway Authority of India",
    );
    expect(verdict.level).toBe("central");
    expect(verdict.namedAuthority).toBe(true);
  });

  it("takes 'state government' as State", () => {
    const verdict = classifyJurisdiction("This is a state government matter, the collector office ignored me");
    expect(verdict.level).toBe("state");
    expect(verdict.outsideCentralPortal).toBe(true);
  });

  it("does not read 'primary health centre' as the Centre", () => {
    const verdict = classifyJurisdiction("The primary health centre in my village has had no doctor since 2025");
    expect(verdict.level).toBe("state");
  });
});

describe("Central authorities the classifier must recognise", () => {
  const central: Array<[string, string]> = [
    ["UPSC civil services exam evaluation records", "UPSC"],
    ["CBI investigation file on the case", "Home Affairs"],
    ["LIC policy maturity payment records", "Finance"],
    ["NTPC power plant land acquisition records", "PSU"],
    ["Kendriya Vidyalaya admission records", "Education"],
    ["Airports Authority land records", "Civil Aviation"],
    ["BSNL tower installation clearance", "Telecommunications"],
    ["national highway NH 16 widening work orders", "National Highways"],
  ];

  for (const [text, expectedBody] of central) {
    it(`classifies "${text.slice(0, 40)}…" as Central`, () => {
      const verdict = classifyJurisdiction(text);
      expect(verdict.level).toBe("central");
      expect(verdict.recommendedBody ?? "").toContain(expectedBody);
    });
  }
});

describe("State and local-body matters are unchanged", () => {
  const stateMatters = [
    "my street light is not working in my colony",
    "The drain in Ward 12 Gajuwaka Visakhapatnam has been overflowing since 2025",
    "GVMC has not repaired my colony road",
    "the road in my area is not maintained well",
    "property tax bill is wrong for my house in Hyderabad",
    "the RTO office refused my driving licence renewal",
    "Mumbai Pune expressway toll collection records for 2025",
  ];

  for (const text of stateMatters) {
    it(`flags as State: "${text.slice(0, 48)}…"`, () => {
      const verdict = classifyJurisdiction(text);
      expect(verdict.level).toBe("state");
      expect(verdict.outsideCentralPortal).toBe(true);
    });
  }

  it("names the city's corporation for a ward matter", () => {
    const verdict = classifyJurisdiction("The drain in Gajuwaka, Visakhapatnam has been overflowing");
    expect(verdict.localBody?.short).toBe("GVMC");
    expect(verdict.stateName).toBe("Andhra Pradesh");
  });

  it("does not blame a city corporation for a State department's file", () => {
    const verdict = classifyJurisdiction("The sub registrar office in Visakhapatnam refused my encumbrance certificate");
    expect(verdict.level).toBe("state");
    expect(verdict.localBody).toBeNull();
    expect(verdict.recommendedBody).toContain("Registration");
  });

  it("keeps a centrally sponsored scheme with the executing State agency", () => {
    const verdict = classifyJurisdiction("MGNREGA wages in my village panchayat were never paid for 2025");
    expect(verdict.level).toBe("state");
    expect(verdict.sharedScheme).toBe(true);
    expect(verdict.reasons.join(" ")).toMatch(/centrally funded/i);
  });
});

describe("nothing recognisable is never guessed", () => {
  it("stays unclear on a greeting", () => {
    expect(classifyJurisdiction("hello, I need some help please").level).toBe("unclear");
  });

  it("stays unclear on empty input", () => {
    expect(classifyJurisdiction("").level).toBe("unclear");
    expect(classifyJurisdiction("   ").confidence).toBe(0);
  });
});

describe("spoken lines", () => {
  it("flags a State matter aloud, naming the body", () => {
    const verdict = classifyJurisdiction("The drain in Gajuwaka Visakhapatnam is overflowing");
    const line = spokenJurisdictionFlag(verdict);
    expect(line).toMatch(/State matter/);
    expect(line).toContain("GVMC");
  });

  it("says nothing for a Central matter", () => {
    expect(spokenJurisdictionFlag(classifyJurisdiction("my passport is delayed"))).toBe("");
  });

  it("confirms a named Central authority instead of flagging it", () => {
    const verdict = classifyJurisdiction("NHAI has not repaired the road in my colony");
    const line = spokenCentralConfirmation(verdict);
    expect(line).toMatch(/Central government matter/);
    expect(line).toContain("National Highways Authority of India");
  });

  it("has no Central confirmation to make when nobody was named", () => {
    expect(spokenCentralConfirmation(classifyJurisdiction("the road in my area is broken"))).toBe("");
  });

  it("drops the hedge from the summary once the authority is named", () => {
    const named = jurisdictionSummary(classifyJurisdiction("NHAI toll plaza records"));
    expect(named).not.toMatch(/likely/);
    expect(named).toContain("National Highways Authority of India");
  });
});
