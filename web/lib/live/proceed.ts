import { classifyJurisdiction, type JurisdictionVerdict } from "@/lib/jurisdiction";
import { normalizeHandoff, type IntakeHandoff } from "./intakePrompt";

/* ============================================================
   Proceed intent — the deterministic escape from the intake loop.

   The handoff to step 3 used to depend entirely on the model
   choosing to call submit_intake. When a citizen said "yes that's
   it, proceed", the model would often answer "I am drafting your
   request, do you need anything else?" and keep the conversation
   alive forever. The citizen had already finished; the app just
   never heard about it.

   So the confirmation is now recognised in code, in every
   supported language. Recognition first nudges the model to hand
   off, and if it still will not, the app synthesises the handoff
   itself from the transcript and advances. The citizen edits
   everything downstream anyway, so a synthesised handoff is
   always better than a session that never ends.
   ============================================================ */

/** Only the end of the running transcript counts — it accumulates. */
const TAIL_WINDOW = 220;

/** Below this there is not enough of a concern to hand off at all. */
const MIN_HANDOFF_CHARS = 40;

/**
 * "Not yet" wins over any confirmation in the same breath, so
 * "proceed after one more thing" never ends the intake.
 */
const HOLD_PATTERNS: RegExp[] = [
  /\b(not|isn'?t|aren'?t)\s+(yet|done|finished|ready|all)\b/i,
  /\b(wait|hold on|hang on|one (?:more|second|minute)|a (?:second|minute)|just a (?:sec|second|minute))\b/i,
  /\b(i|we)\s+(?:also\s+)?(?:want|need|have|forgot)\s+to\s+(?:add|say|mention|tell|include)\b/i,
  /\b(one more thing|something else|another thing|add one more|change one thing)\b/i,
  /\b(no,?\s*(?:actually|wait|sorry)|sorry,?\s*(?:no|wait))\b/i,
  /\b(abhi nahi|ruko|ruk jao|ek minute|ek second|thoda ruko|nahi abhi)\b/i,
  /(अभी नहीं|रुको|रुकिए|एक मिनट|एक सेकंड)/,
  /(ఇంకా కాదు|ఆగండి|ఒక నిమిషం)/,
  /(இன்னும் இல்லை|காத்திருங்கள்|ஒரு நிமிடம்)/,
  /(ಇನ್ನೂ ಇಲ್ಲ|ಸ್ವಲ್ಪ ತಡೆಯಿರಿ)/,
  /(ഇനിയും ഇല്ല|കാത്തിരിക്കൂ)/,
  /(এখনও না|অপেক্ষা করুন)/,
  /(હજી નહીં|થોભો)/,
  /(ਹਾਲੇ ਨਹੀਂ|ਰੁਕੋ)/,
  /(ابھی نہیں|رکیں|ایک منٹ)/,
];

/**
 * Confirmations that mean "I am finished, take it from here".
 * Deliberately excludes a bare "continue" or "okay", which a
 * citizen says constantly mid-explanation.
 */
const PROCEED_PATTERNS: RegExp[] = [
  // English
  /\bthat'?s (?:it|all|everything|enough)\b/i,
  /\bthat is (?:it|all|everything|enough)\b/i,
  /\b(?:i|we) (?:don'?t|do not) need anything (?:further|else|more)\b/i,
  /\bnothing (?:else|further|more)\b/i,
  /\bno(?:thing)? more (?:questions|details|information)\b/i,
  /\b(?:please\s+)?(?:proceed|go ahead|carry on|move on|next step)\b/i,
  /\b(?:you can|lets?|let us|let'?s) (?:proceed|continue|go ahead|carry on)\b/i,
  /\b(?:i'?m|im|i am|we'?re|we are|all|its|it'?s) done\b/i,
  /\b(?:file|submit|send|prepare|draft|make|write) it (?:now|please)?\b/i,
  /\b(?:prepare|draft|write|make) (?:the|my) (?:application|request|draft|rti)\b/i,
  /\b(?:i'?m|im|i am|we are|we'?re) ready\b/i,
  /\bgo for it\b/i,
  // Hindi / Urdu (roman + script)
  /\bbas\b/i,
  /\b(?:ho gaya|hogaya|ho gayi|khatam|khatm|bas itna|itna hi|kaafi hai|kafi hai)\b/i,
  /\b(?:aage badho|aage badhiye|aage badhen|shuru karo|shuru kijiye|kar do|kar dijiye|bhej do|bana do|banao)\b/i,
  /\bkuch (?:nahi|nahin|aur nahi|aur nahin)\b/i,
  /(बस|हो गया|हो गयी|ख़त्म|खत्म|आगे बढ़ो|आगे बढ़िए|कर दो|कर दीजिए|भेज दो|बना दो|इतना ही|काफ़ी है|काफी है)/,
  /(کچھ نہیں|ہو گیا|آگے بڑھیں|بھیج دیں|بنا دیں|بس)/,
  // Telugu
  /\b(?:ante|antey|chaalu|chalu|sare|saripoyindi|ayipoyindi|pampandi)\b/i,
  /(అంతే|ఇక చాలు|చాలు|అయిపోయింది|సరిపోయింది|పంపండి|ముందుకు వెళ్లండి|తయారు చేయండి)/,
  // Tamil
  /\b(?:pothum|podhum|seri|mudinthathu|mudinchu)\b/i,
  /(அது போதும்|போதும்|சரி முடிந்தது|முடிந்தது|அனுப்புங்கள்|தயார் செய்யுங்கள்)/,
  // Kannada
  /\b(?:saaku|saku|aytu|ayithu|mugithu)\b/i,
  /(ಸಾಕು|ಆಯ್ತು|ಆಯಿತು|ಮುಗಿಯಿತು|ಕಳುಹಿಸಿ|ಮುಂದೆ ಸಾಗಿ)/,
  // Malayalam
  /\b(?:mathi|mathiyaayi|kazhinju)\b/i,
  /(മതി|കഴിഞ്ഞു|അയച്ചോളൂ|തയ്യാറാക്കൂ)/,
  // Marathi
  /\b(?:zhala|jhala|zaala|purna zhala|pudhe ja)\b/i,
  /(झालं|झाले|पुरे|पुढे जा|पाठवा|तयार करा)/,
  // Bengali
  /\b(?:hoye geche|hoyeche|sesh|ar kichu na)\b/i,
  /(হয়ে গেছে|হয়েছে|শেষ|আর কিছু না|পাঠিয়ে দিন|এগিয়ে যান)/,
  // Gujarati
  /\b(?:thai gayu|bas etlu)\b/i,
  /(થઈ ગયું|બસ|પૂરું|મોકલી દો|આગળ વધો)/,
  // Punjabi
  /\b(?:ho gya|ho giya|bas ehi)\b/i,
  /(ਹੋ ਗਿਆ|ਬੱਸ|ਭੇਜ ਦਿਓ|ਅੱਗੇ ਵਧੋ)/,
  // Odia
  /(ହୋଇଗଲା|ବସ୍|ପଠାଇ ଦିଅନ୍ତୁ|ଆଗକୁ ବଢ଼ନ୍ତୁ)/,
];

function tailOf(text: string): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length <= TAIL_WINDOW ? clean : clean.slice(-TAIL_WINDOW);
}

/**
 * True when the citizen has just said they are finished. Reads
 * only the tail of the transcript so a confirmation spoken five
 * minutes ago cannot keep re-firing.
 */
export function detectProceedIntent(transcript: string): boolean {
  const tail = tailOf(transcript);
  if (tail.length < 2) return false;
  if (HOLD_PATTERNS.some((pattern) => pattern.test(tail))) return false;
  return PROCEED_PATTERNS.some((pattern) => pattern.test(tail));
}

/**
 * True when the citizen has asked to hold on. Used to cancel a
 * confirmation already in flight: "that's it — wait, one more
 * thing" must not still end the intake.
 */
export function detectHoldIntent(text: string): boolean {
  const tail = tailOf(text);
  return tail.length >= 2 && HOLD_PATTERNS.some((pattern) => pattern.test(tail));
}

/** Enough of a concern captured that the downstream gates can work. */
export function hasEnoughForHandoff(transcript: string): boolean {
  return (transcript ?? "").trim().length >= MIN_HANDOFF_CHARS;
}

/* ---------- language ---------- */

const SCRIPTS: Array<{ test: RegExp; lang: string }> = [
  { test: /[\u0C00-\u0C7F]/, lang: "te-IN" },
  { test: /[\u0B80-\u0BFF]/, lang: "ta-IN" },
  { test: /[\u0980-\u09FF]/, lang: "bn-IN" },
  { test: /[\u0A80-\u0AFF]/, lang: "gu-IN" },
  { test: /[\u0C80-\u0CFF]/, lang: "kn-IN" },
  { test: /[\u0D00-\u0D7F]/, lang: "ml-IN" },
  { test: /[\u0A00-\u0A7F]/, lang: "pa-IN" },
  { test: /[\u0B00-\u0B7F]/, lang: "or-IN" },
  { test: /[\u0600-\u06FF]/, lang: "ur-IN" },
];

/** Marathi and Hindi share Devanagari — these markers separate them. */
const MARATHI_MARKERS = /(आहे|नाही|मला|तुम्ही|झालं|काय झालं|करायचं|पाहिजे)/;

/**
 * Best-effort language guess for the forced path only. When the
 * model hands off normally it reports the language itself.
 */
export function guessLanguage(transcript: string): string {
  const text = transcript ?? "";
  for (const { test, lang } of SCRIPTS) {
    if (test.test(text)) return lang;
  }
  if (/[\u0900-\u097F]/.test(text)) return MARATHI_MARKERS.test(text) ? "mr-IN" : "hi-IN";
  return "en-IN";
}

/* ---------- conservative field extraction ---------- */

/**
 * Spelled-out numbers arrive as "5 3 0 0 2 6". Collapse runs of
 * six or more single digits only, so two separate numbers spoken
 * back to back are never fused into one.
 */
function collapseSpelledDigits(text: string): string {
  return text.replace(/\d(?:[\s,-]\d){5,}/g, (run) => run.replace(/[\s,-]/g, ""));
}

const PROVIDERS =
  "gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|proton|protonmail|icloud|zoho";

/**
 * Dictated addresses: "ramesh dot k at gmail dot com". The local
 * part may only be joined by a spoken separator, never by a bare
 * space, so preceding words ("my email is …") are not swallowed.
 */
const SPOKEN_EMAIL = new RegExp(
  "([a-z0-9]"
  + "(?:[a-z0-9._%+-]|\\s*(?:\\.|\\bdot\\b)\\s*|\\s*(?:_|\\bunderscore\\b)\\s*|\\s*(?:-|\\bdash\\b|\\bhyphen\\b)\\s*)*?)"
  + `\\s*(?:@|\\bat\\b)\\s*(${PROVIDERS})\\s*(?:\\.|\\bdot\\b)\\s*(co\\s*(?:\\.|\\bdot\\b)\\s*in|com|in|org|net|co)\\b`,
  "i",
);

/** Turn the spoken separators in a local part back into characters. */
function tightenLocalPart(local: string): string {
  return local
    .replace(/\s*\bdot\b\s*/gi, ".")
    .replace(/\s*\b(?:underscore)\b\s*/gi, "_")
    .replace(/\s*\b(?:dash|hyphen)\b\s*/gi, "-")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** "co dot in" → "co.in". */
function tightenTld(tld: string): string {
  return tld.replace(/\s*\bdot\b\s*/gi, ".").replace(/\s+/g, "").toLowerCase();
}

/**
 * A name spelled out letter by letter ("r k sharma at gmail dot
 * com") would otherwise yield "sharma@gmail.com" — a plausible but
 * wrong address. When the local part carries no spoken separator
 * and is preceded by initials, the address is left out instead.
 */
function looksSpelledOut(before: string): boolean {
  return /(?:^|\s)[a-z](?:\s+[a-z])*\s*$/i.test(before.slice(-12));
}

export interface SpokenFields {
  mobile: string | null;
  pincode: string | null;
  email: string | null;
}

/**
 * Pulls only the values a regex can be sure about: a ten-digit
 * Indian mobile, a six-digit PIN, and an email. Names and
 * addresses are never guessed — the citizen types those in the
 * details step, where they are validated.
 */
export function extractSpokenFields(transcript: string): SpokenFields {
  const text = collapseSpelledDigits((transcript ?? "").replace(/\s+/g, " "));

  const mobileMatch = text.match(/(?<!\d)([6-9]\d{9})(?!\d)/);
  const mobile = mobileMatch?.[1] ?? null;

  // Mask the mobile before looking for a PIN so its first six
  // digits cannot be read as a PIN code.
  const withoutMobile = mobile ? text.replace(mobile, " ") : text;
  const pinMatch = withoutMobile.match(/(?<!\d)([1-9]\d{5})(?!\d)/);

  const literal = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const spoken = literal ? null : text.match(SPOKEN_EMAIL);
  let email: string | null = literal ? literal[0].toLowerCase() : null;
  if (!email && spoken?.index !== undefined) {
    const local = tightenLocalPart(spoken[1]);
    const dictated = /\b(?:dot|underscore|dash|hyphen)\b|[._%+-]/i.test(spoken[1]);
    if (local.length >= 3 && (dictated || !looksSpelledOut(text.slice(0, spoken.index)))) {
      const provider = spoken[2].toLowerCase() === "googlemail" ? "gmail" : spoken[2].toLowerCase();
      email = `${local}@${provider}.${tightenTld(spoken[3])}`;
    }
  }

  return { mobile, pincode: pinMatch?.[1] ?? null, email };
}

/* ---------- synthesised handoff ---------- */

/** Trim to a whole word, for the one-line summary. */
function clip(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${space > limit * 0.6 ? cut.slice(0, space) : cut}…`;
}

/**
 * Builds the handoff the model refused to produce. Everything
 * here is derived from what the citizen actually said or from the
 * deterministic jurisdiction classifier — nothing is invented.
 */
export function synthesizeHandoff(transcript: string, verdict?: JurisdictionVerdict): IntakeHandoff {
  const text = (transcript ?? "").trim();
  const decided = verdict ?? classifyJurisdiction(text);
  const fields = extractSpokenFields(text);
  return normalizeHandoff({
    detected_lang: guessLanguage(text),
    summary: clip(text, 240),
    jurisdiction: decided.level,
    state_name: decided.stateName,
    jurisdiction_note: decided.reasons.join(" ") || null,
    place: decided.localBody?.city ?? null,
    authority_hint: decided.localBody?.name ?? decided.recommendedBody,
    pincode: fields.pincode,
    mobile: fields.mobile,
    email: fields.email,
  });
}
