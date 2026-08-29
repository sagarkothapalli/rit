/* ============================================================
   Scope containment.

   The agent is an RTI intake desk, not a general assistant. The
   session already declares one tool and no search tool, so it has
   no path to the open web — but a model asked for the weather will
   happily invent one, or promise to "look it up for you later",
   and the citizen believes it.

   The system prompt forbids that. This file is the part that does
   not depend on the model complying: `detectOffTopic` recognises
   the shapes of a general-assistant errand, and the hook injects a
   system turn carrying the one permitted answer before the model
   has to improvise.

   Deliberately narrow. An RTI intake is full of words that look
   general — cost, tender, price paid, status checked online — and
   a false refusal is worse than a stray answer, so this matches
   only asks that never occur in a genuine intake. The nudge itself
   carries an escape hatch for the cases that slip through.
   ============================================================ */

/** Only the tail of the running transcript is a live question. */
const TAIL_WINDOW = 260;

const OFF_TOPIC_PATTERNS: RegExp[] = [
  // "Search the internet", "google it", "look it up online", "browse the web"
  /\b(?:search|google|look\s*(?:it|this|that)?\s*up|browse|surf)\b[^.?!]{0,32}\b(?:the\s+)?(?:internet|web|online|google|wikipedia)\b/i,
  /\b(?:internet|web|google)\s+(?:search|access)\b/i,
  /\b(?:google|bing)\s+(?:it|this|that|for\s+me)\b/i,
  /\b(?:do|can|could|will|are)\s+you\s+(?:have\s+|able\s+to\s+)?(?:access\s+(?:to\s+)?|connected\s+to\s+|search\s+)?(?:the\s+)?(?:internet|web|google)\b/i,
  // Errands a citizen assistance desk is never asked for
  /\b(?:weather|temperature\s+today|forecast|horoscope|joke|poem|shayari|recipe|lyrics|cricket\s+score|match\s+score|gold\s+rate|petrol\s+(?:price|rate)|share\s+price|stock\s+price|bitcoin|crypto)\b/i,
  /\bwrite\s+(?:me\s+)?(?:a|an|some)\s+(?:poem|essay|story|song|joke|code|program|script)\b/i,
  /\btranslate\s+(?:this|that|it|the\s+following)\b/i,
  /\bwh(?:at|o)\s+(?:is|are|was)\s+the\s+(?:capital|president|prime\s+minister|population|weather|distance|meaning)\b/i,
  /\bwhat(?:'s|\s+is)\s+\d+\s*(?:\+|-|\*|x|plus|minus|times|divided)/i,
  // Hindi / Urdu / Telugu / Tamil — the same errands, transliterated and native
  /\b(?:mausam|chutkula|shayari|internet\s+par\s+dekh)\b/i,
  /(मौसम|चुटकुला|शायरी|इंटरनेट\s*पर\s*(?:देखो|खोजो|search))/,
  /(వాతావరణం|జోక్|ఇంటర్నెట్\s*లో)/,
  /(வானிலை|நகைச்சுவை|இணையத்தில்\s*தேடு)/,
];

function tailOf(text: string): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length <= TAIL_WINDOW ? clean : clean.slice(-TAIL_WINDOW);
}

/**
 * True when the citizen has just asked for something outside the
 * RTI intake — a web lookup, general knowledge, or an errand any
 * chatbot would take.
 */
export function detectOffTopic(text: string): boolean {
  const tail = tailOf(text);
  if (tail.length < 2) return false;
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(tail));
}

/**
 * Injected the moment an off-topic ask is heard, so the refusal
 * comes from an instruction issued a second earlier rather than
 * from the model's general helpfulness.
 */
export const OFF_TOPIC_NUDGE =
  "(System note, not spoken by the citizen. They have just asked for something outside Right to Information —"
  + " a web or internet lookup, general knowledge, news, prices, weather, a calculation, a translation, or"
  + " something written for them. You cannot do any of that and you must not pretend otherwise. In their"
  + " language, say ONE short line to this effect: \"I can't help with that — I only take Right to Information"
  + " requests.\" Then immediately ask your next intake question, or repeat the one they have not answered."
  + " Do NOT answer the question even partly. Do NOT guess, estimate, or say what you think the answer might be."
  + " Do NOT say you will look it up, search for it, check the internet, find out, or come back to them later —"
  + " you have no internet and no way to find anything out. Do NOT offer to help with it in any other way."
  + " If their words were actually about their RTI matter, ignore this note and carry on with the intake.)";
