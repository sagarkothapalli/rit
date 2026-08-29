import { describe, expect, it } from "vitest";
import {
  detectHoldIntent,
  detectOfferedHandoff,
  detectProceedIntent,
  extractSpokenFields,
  guessLanguage,
  hasEnoughForHandoff,
  synthesizeHandoff,
} from "./proceed";

/* ============================================================
   The bug these tests exist for: the citizen said "yeah that's
   it, I don't need anything further, proceed" and the agent kept
   answering "I am drafting this request, do we need anything
   else?" — forever. The confirmation is now recognised in code,
   so it is tested in code.
   ============================================================ */

describe("detectProceedIntent", () => {
  const confirmations: Array<[string, string]> = [
    ["the reported phrasing", "Yeah, that's it. I don't need anything further. Proceed."],
    ["that's all", "no that's all, please go ahead"],
    ["nothing else", "nothing else, file it now"],
    ["done", "that is everything, I am done"],
    ["ready", "I'm ready, draft my application"],
    ["next step", "no more questions, next step please"],
    ["hindi roman", "ok bas, ho gaya, aage badho"],
    ["hindi roman negative", "kuch nahi chahiye, kar do"],
    ["hindi script", "अब बस, आगे बढ़िए"],
    ["telugu", "అంతే, ముందుకు వెళ్లండి"],
    ["telugu roman", "ante, chaalu, pampandi"],
    ["tamil", "அது போதும், அனுப்புங்கள்"],
    ["tamil roman", "pothum, seri mudinthathu"],
    ["kannada", "ಸಾಕು, ಮುಂದೆ ಸಾಗಿ"],
    ["malayalam", "മതി, തയ്യാറാക്കൂ"],
    ["marathi", "झालं, पुढे जा"],
    ["bengali", "হয়ে গেছে, এগিয়ে যান"],
    ["gujarati", "થઈ ગયું, આગળ વધો"],
    ["punjabi", "ਹੋ ਗਿਆ, ਭੇਜ ਦਿਓ"],
    ["odia", "ହୋଇଗଲା, ଆଗକୁ ବଢ଼ନ୍ତୁ"],
    ["urdu", "کچھ نہیں، آگے بڑھیں"],
    ["declining other information", "I don't want any kind of other information"],
    ["declining more records", "no I do not need more details, prepare my application"],
    ["everything known", "that's everything I know about it"],
    ["moving on", "let's move on"],
    ["a farewell", "okay, thank you, bye"],
    ["a bare goodbye", "goodbye"],
    ["hindi farewell", "theek hai, alvida"],
    ["telugu farewell", "సెలవు"],
  ];

  for (const [name, phrase] of confirmations) {
    it(`fires on ${name}`, () => {
      expect(detectProceedIntent(phrase)).toBe(true);
    });
  }

  /* Thanks is ambiguous mid-conversation and decisive at the end,
     so it is gated on how much has actually been said. */
  it("fires on every phrasing built around the word proceed", () => {
    for (const phrase of [
      "proceed",
      "please proceed",
      "proceed to the complaint",
      "proceed with the complaint that's it",
      "proceed to file it",
      "take me to the next step",
      "go to next",
      "file my complaint now",
    ]) {
      expect(detectProceedIntent(phrase), phrase).toBe(true);
    }
  });

  // The citizen is told to say "proceed" at the end, and the agent asks them
  // to confirm things in the middle. The two must not collide: a bare yes,
  // in any language, is an answer to a question, not the end of the intake.
  it("does not end the intake on a bare acknowledgement in any language", () => {
    for (const phrase of ["okay", "ok", "yes that is correct", "sare", "seri", "aytu", "ayithu", "ಆಯ್ತು"]) {
      expect(detectProceedIntent(phrase), phrase).toBe(false);
    }
  });

  it("treats thanks at the end of a full account as an ending", () => {
    const full =
      "The drain in Ward 12 Gajuwaka has been overflowing since January 2025 and nobody from the "
      + "corporation has come to clear it even after three complaints. Thank you.";
    expect(detectProceedIntent(full)).toBe(true);
  });

  it("does not end the intake on thanks spoken early on", () => {
    expect(detectProceedIntent("oh thank you for explaining that")).toBe(false);
  });

  it("does not mistake an opening namaste for a closing one", () => {
    expect(detectProceedIntent("namaste, I have a problem with my ward road")).toBe(false);
  });

  it("lets a hold override a farewell in the same breath", () => {
    expect(detectProceedIntent("bye — actually wait, one more thing")).toBe(false);
  });

  const nonConfirmations: Array<[string, string]> = [
    ["a plain complaint", "the road in my ward has been broken since 2024"],
    ["mid-explanation okay", "okay so let me explain the whole thing"],
    ["an explicit hold", "wait, one more thing I want to add"],
    ["proceed followed by a hold", "proceed after I tell you one more detail — actually hold on"],
    ["a retracted confirmation", "that's it? no, not yet"],
    ["asking to keep listening", "yes continue listening I have more"],
    ["dictating details", "my name is Ramesh and my mobile is 9876543210"],
    ["hindi hold", "ek minute, abhi nahi"],
    ["hindi script hold", "अभी नहीं, रुकिए"],
  ];

  for (const [name, phrase] of nonConfirmations) {
    it(`stays quiet on ${name}`, () => {
      expect(detectProceedIntent(phrase)).toBe(false);
    });
  }

  it("does not re-fire on a confirmation buried early in a long transcript", () => {
    const stale = `that's it proceed ${"the drainage in gajuwaka ward twelve overflowed again and nobody came ".repeat(6)}`;
    expect(detectProceedIntent(stale)).toBe(false);
  });
});

describe("detectOfferedHandoff", () => {
  const offer = "I have everything I need. Shall I prepare your application now?";
  const question = "Should we mark you as literate on the form?";

  it("takes a yes to an offer as the citizen proceeding", () => {
    for (const said of ["yes", "yes please", "okay", "proceed", "go ahead", "haan", "avunu", "సరే", "ஆம்"]) {
      expect(detectOfferedHandoff(offer, said), said).toBe(true);
    }
  });

  it("leaves a yes that merely answers an intake question alone", () => {
    for (const said of ["yes", "okay", "sare", "seri", "correct", "हां"]) {
      expect(detectOfferedHandoff(question, said), said).toBe(false);
    }
  });

  it("lets a hold override a yes in the same breath", () => {
    expect(detectOfferedHandoff(offer, "yes, wait, one more thing")).toBe(false);
  });
});

describe("detectHoldIntent", () => {
  it("recognises a request to wait", () => {
    expect(detectHoldIntent("wait, one more thing")).toBe(true);
    expect(detectHoldIntent("अभी नहीं")).toBe(true);
  });

  it("does not treat an ordinary sentence as a hold", () => {
    expect(detectHoldIntent("the street light near my house is dead")).toBe(false);
  });
});

describe("hasEnoughForHandoff", () => {
  it("rejects a confirmation with no concern behind it", () => {
    expect(hasEnoughForHandoff("proceed")).toBe(false);
  });

  it("accepts a described concern", () => {
    expect(
      hasEnoughForHandoff("The drain in Ward 12 Gajuwaka has been overflowing since January 2025."),
    ).toBe(true);
  });
});

describe("extractSpokenFields", () => {
  it("collapses a spelled-out mobile number", () => {
    expect(extractSpokenFields("my number is 9 8 7 6 5 4 3 2 1 0").mobile).toBe("9876543210");
  });

  it("reads a PIN code without mistaking the mobile for one", () => {
    const fields = extractSpokenFields("mobile 9876543210 and pin code 5 3 0 0 2 6");
    expect(fields.mobile).toBe("9876543210");
    expect(fields.pincode).toBe("530026");
  });

  it("reconstructs a dictated email", () => {
    expect(extractSpokenFields("my email is ramesh dot kumar at gmail dot com").email)
      .toBe("ramesh.kumar@gmail.com");
  });

  it("handles a spoken co dot in domain", () => {
    expect(extractSpokenFields("priya underscore 92 at yahoo dot co dot in").email)
      .toBe("priya_92@yahoo.co.in");
  });

  it("takes a literal address as written", () => {
    expect(extractSpokenFields("write to ramesh.kumar@gmail.com").email).toBe("ramesh.kumar@gmail.com");
  });

  it("omits an address spelled out letter by letter rather than guessing one", () => {
    expect(extractSpokenFields("it is r k sharma at outlook dot com").email).toBeNull();
  });

  it("returns nulls when nothing was dictated", () => {
    expect(extractSpokenFields("the road is broken")).toEqual({
      mobile: null,
      pincode: null,
      email: null,
    });
  });
});

describe("guessLanguage", () => {
  it("identifies scripts", () => {
    expect(guessLanguage("విశాఖపట్నం లో రోడ్డు")).toBe("te-IN");
    expect(guessLanguage("சாலை உடைந்துவிட்டது")).toBe("ta-IN");
    expect(guessLanguage("রাস্তা ভাঙা")).toBe("bn-IN");
  });

  it("separates Marathi from Hindi inside Devanagari", () => {
    expect(guessLanguage("रस्ता खराब आहे मला माहिती पाहिजे")).toBe("mr-IN");
    expect(guessLanguage("सड़क टूटी है")).toBe("hi-IN");
  });

  it("falls back to English", () => {
    expect(guessLanguage("the road is broken")).toBe("en-IN");
  });
});

describe("synthesizeHandoff", () => {
  const transcript =
    "The drain in Ward 12 Gajuwaka Visakhapatnam has been overflowing since 2025. "
    + "My mobile is 9876543210. That's it, proceed.";

  it("produces a handoff the workspace can advance on", () => {
    const handoff = synthesizeHandoff(transcript);
    expect(handoff.summary.length).toBeGreaterThan(0);
    expect(handoff.detected_lang).toBe("en-IN");
  });

  it("carries the deterministic jurisdiction verdict", () => {
    const handoff = synthesizeHandoff(transcript);
    expect(handoff.jurisdiction).toBe("state");
    expect(handoff.state_name).toBe("Andhra Pradesh");
    expect(handoff.authority_hint).toContain("GVMC");
  });

  it("keeps only the particulars actually spoken", () => {
    const handoff = synthesizeHandoff(transcript);
    expect(handoff.applicant.mobile).toBe("9876543210");
    expect(handoff.applicant.name).toBeNull();
    expect(handoff.applicant.address).toBeNull();
  });

  it("never invents a name or an address from a bare confirmation", () => {
    const handoff = synthesizeHandoff("My passport application has been pending for four months. Proceed.");
    expect(handoff.applicant.name).toBeNull();
    expect(handoff.applicant.email).toBeNull();
    expect(handoff.jurisdiction).toBe("central");
  });
});
