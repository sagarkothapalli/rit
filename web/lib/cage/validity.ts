/* ============================================================
   Deterministic RTI Validity & Financial Assessment Engine.

   The RTI Act, 2005 covers requests for existing material records
   from public authorities (Central/State/local government bodies).

   It does NOT cover:
   - Random keyboard gibberish or spam
   - Video games (e.g. Assassin's Creed, Minecraft, GTA)
   - General assistant queries (weather, jokes, coding, recipes)
   - Crypto, stock trading, commercial sales spam
   - Pure private disputes with no public authority connection

   This engine screens every input deterministically before and
   alongside the model, ensuring non-RTI inputs are firmly refused
   and cannot advance to subsequent drafting steps.
   ============================================================ */

export interface FinancialAspects {
  detected: boolean;
  details_found: string[];
  missing_financial_info: string[];
  questions: string[];
  suggested_records: string[];
}

export interface ValidityAssessment {
  is_valid_rti: boolean;
  refusal_reason: string | null;
  category: string;
  summary: string;
  financial: FinancialAspects;
  follow_up_questions: string[];
  suggested_records: string[];
  safe_guidance: string;
  can_proceed: boolean;
}

/** Obvious repetitive gibberish, keyboard spam, or low-entropy garbage. */
function isGibberish(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 4) return false;

  // Single character repeated many times, e.g. "aaaaaaa", "xxxxxxxxx"
  if (/^(.)\1{4,}$/i.test(clean)) return true;

  // Keyboard rows and mashing sequences
  if (
    /\b(asdfghjkl|qwertyuiop|zxcvbnm|lkjhgfdsa|poiuytrewq|mnbvcxz|asdfasdf|qwerqwer|zxcvzxcv|123456789|0987654321)\b/i.test(
      clean
    )
  ) {
    return true;
  }

  // Token analysis: check for strings of 8+ consonants without vowels or nonsense words
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 1 && words.length <= 4) {
    const longConsonantClump = words.some((w) => w.length >= 7 && !/[aeiouy]/i.test(w));
    if (longConsonantClump) return true;
  }

  // Pure special characters or punctuation spam
  if (/^[^a-zA-Z0-9\u0900-\u0DFF]{4,}$/.test(clean)) return true;

  return false;
}

/** Non-RTI topics: gaming, entertainment, recipes, coding, crypto, weather, etc. */
interface OutOfScopePattern {
  test: RegExp;
  category: string;
  reason: string;
}

const OUT_OF_SCOPE_PATTERNS: OutOfScopePattern[] = [
  {
    test: /\b(assassin'?s?\s*creed|assasin|assasins|minecraft|gta\s*[v\d]|grand\s*theft\s*auto|fortnite|roblox|call\s*of\s*duty|\bcod\b|pubg|free\s*fire|valorant|playstation|ps[45]|xbox|nintendo|gameplay|game\s*cheat|cheat\s*code|walkthrough|boss\s*fight|video\s*game|gaming\s*pc|fps\s*drop)\b/i,
    category: "Video Games & Gaming",
    reason:
      "This request is about video games or entertainment software. The RTI Act applies only to official government records and public authorities.",
  },
  {
    test: /\b(bitcoin|ethereum|crypto(currency)?|dogecoin|binance|forex\s*trading|stock\s*tips|buy\s*crypto|trading\s*bot|nft|airdrop|binance)\b/i,
    category: "Cryptocurrency & Trading",
    reason:
      "This request is about cryptocurrency, stock trading, or investment speculation. The RTI Act applies only to public authorities and government records.",
  },
  {
    test: /\b(recipe\s*for|how\s*to\s*cook|how\s*to\s*bake|ingredients\s*of|chicken\s*biryani|chocolate\s*cake|pizza\s*dough|tasty\s*food)\b/i,
    category: "Food & Cooking",
    reason:
      "Cooking recipes and food preparation are not official government records under the RTI Act, 2005.",
  },
  {
    test: /\b(write\s+(?:a|me\s+a)?\s*(?:python|javascript|java|c\+\+|react|html|css|sql)\s+(?:code|script|program|app)|fix\s+my\s+code|debug\s+this\s+function|leetcode|algorithm\s+to\s+sort)\b/i,
    category: "Coding & Software Programming",
    reason:
      "Software coding, programming scripts, and developer homework are outside the purview of the RTI Act.",
  },
  {
    test: /\b(weather\s+today|temperature\s+tomorrow|weather\s+forecast|daily\s+horoscope|rashi\s*fal|astrology\s*prediction|love\s*horoscope|tell\s+me\s+a\s+joke|tell\s+me\s+a\s+poem|write\s+a\s+shayari)\b/i,
    category: "General Assistant / Entertainment",
    reason:
      "Weather forecasts, horoscopes, jokes, and creative writing are general queries and cannot be filed under the RTI Act.",
  },
  {
    test: /\b(?:buy|sell|purchase|order|trade)\s+(?:(?:cheap|used|new|discounted|second\s*hand|for\s*sale)\s+)*(?:car|cars|vehicle|iphone|phone|laptop|shoes|clothes|tv|refrigerator|house|flat|property)\b|\b(?:discount\s*coupon|promo\s*code|amazon\s*deal|flipkart\s*sale)\b/i,
    category: "Commercial Sales & Shopping",
    reason:
      "Commercial shopping, e-commerce deals, and product buying/selling cannot be filed under the RTI Act.",
  },
  {
    test: /\b(my\s+(?:girlfriend|boyfriend|husband|wife|crush)\s+(?:broke\s+up|cheated|loves|hates|left\s+me)|dating\s+advice|how\s+to\s+impress|marital\s+argument)\b/i,
    category: "Private Relationships",
    reason:
      "Personal relationship issues with no connection to a public authority or official government record cannot be filed under RTI.",
  },
];

/** Financial indicators in RTI queries. */
const FINANCIAL_PATTERNS = [
  /\b(budget|fund|funds|allocation|expenditure|sanction(ed)?|crore|lakh|rupees|rs\.?|₹|paisa|पैसा|बजट|खर्च|धनराशि)\b/i,
  /\b(tender|contract|contractor|theka|ठेका|ठेकेदार|bid|bidding|estimate|sanction\s*order|measurement\s*book|\bmb\b|bill|payment|voucher)\b/i,
  /\b(bribe|corruption|kickback|scam|embezzlement|misappropriation|ghost\s*worker|cut\s*money|ghotala|घोटाला|रिश्वत|भ्रष्टाचार)\b/i,
  /\b(pension|gratuity|pf|provident\s*fund|epfo|arrear|salary\s*delay|bonus|allowance|gratuity)\b/i,
  /\b(subsidy|pm\s*kisan|pmay|dbt|scholarship|ration|welfare\s*fund|compensation|claim)\b/i,
  /\b(bank|sbi|loan|emi|interest|fixed\s*deposit|account\s*frozen|unauthorized\s*deduction)\b/i,
  /\b(bpl|below\s*poverty|antyodaya|fee\s*waiver|ration\s*card)\b/i,
];

/** Check if text touches public authority / government / RTI keywords. */
const RTI_POSITIVE_PATTERNS = [
  /\b(road|highway|nhai|pothole|flyover|bridge|drain|drainage|water\s*supply|pipeline|sewer|street\s*light|garbage|sanitation)\b/i,
  /\b(sarkari|government|ministry|department|corporation|municipal|nagar\s*nigam|panchayat|ward|collector|tehsil|rto|police|fir)\b/i,
  /\b(passport|visa|aadhaar|pan\s*card|itr|income\s*tax|gst|customs|railway|train|station|irctc|post\s*office)\b/i,
  /\b(exam|neet|jee|cuet|nta|upsc|ssc|cbse|university|college|school|admit\s*card|answer\s*key|omr|recruitment|vacancy)\b/i,
  /\b(hospital|aiims|phc|doctor|cghs|ayushman|medicine|bed\s*availability)\b/i,
  /\b(work\s*order|sanction|tender|contractor|inspection\s*report|file\s*noting|official\s*record|certified\s*cop(y|ies)|audit)\b/i,
  /\b(ration|pds|dealer|food\s*supply|encroachment|building\s*permission|illegal\s*construction|land\s*record|patta|mutation)\b/i,
  /(सड़क|हाईवे|नाला|पानी|बिजली|अस्पताल|स्कूल|राशन|पासपोर्ट|आधार|पेंशन|नगर\s*निगम|पंचायत|कलेक्टर|थाना|एफआईआर|भ्रष्टाचार|टेंडर)/,
  /(రోడ్డు|హైవే|మునిసిపల్|పంచాయతీ|ఆధార్|పాస్‌పోర్ట్|కార్పొరేషన్|పథకం|టెండర్)/,
  /(சாலை|நகராட்சி|பஞ்சாயத்து|ஆதார்|பாஸ்போர்ட்|அரசு|ரேஷன்)/,
];

/**
 * Deterministic validity and financial assessment for citizen input.
 */
export function screenValidity(transcript: string): ValidityAssessment {
  const clean = (transcript ?? "").replace(/\s+/g, " ").trim();

  // 1. Length & Gibberish check
  if (clean.length < 5) {
    return {
      is_valid_rti: false,
      refusal_reason:
        "The description is too short. Please provide details about the government department, project, or records you need.",
      category: "Insufficient Details",
      summary: clean,
      financial: {
        detected: false,
        details_found: [],
        missing_financial_info: [],
        questions: [],
        suggested_records: [],
      },
      follow_up_questions: [
        "Which government department, scheme, or public authority is this related to?",
        "What specific incident, work, or records do you want to inquire about?",
      ],
      suggested_records: [],
      safe_guidance:
        "Under the RTI Act, you can request existing official documents, work orders, budgets, inspection reports, or file notings from public authorities.",
      can_proceed: false,
    };
  }

  if (isGibberish(clean)) {
    return {
      is_valid_rti: false,
      refusal_reason:
        "This input cannot be filed under the Right to Information Act, 2005. The entered text appears to be random or meaningless characters. Please change the information to describe a genuine concern regarding official government records or public authorities.",
      category: "Unrelated / Gibberish",
      summary: clean,
      financial: {
        detected: false,
        details_found: [],
        missing_financial_info: [],
        questions: [],
        suggested_records: [],
      },
      follow_up_questions: [],
      suggested_records: [],
      safe_guidance:
        "Please enter a genuine issue such as broken roads, delayed passports, examination queries, or municipal budget expenditures.",
      can_proceed: false,
    };
  }

  // 2. Check out-of-scope patterns (gaming, crypto, recipes, coding, weather, etc.)
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test.test(clean)) {
      return {
        is_valid_rti: false,
        refusal_reason: `Cannot be filed under RTI Act, 2005: ${pattern.reason} This request cannot be proceeded with. Please change the information to describe a matter concerning official government records, public works, or public authorities.`,
        category: pattern.category,
        summary: clean,
        financial: {
          detected: false,
          details_found: [],
          missing_financial_info: [],
          questions: [],
          suggested_records: [],
        },
        follow_up_questions: [],
        suggested_records: [],
        safe_guidance:
          "The Right to Information Act (RTI) is used to obtain official government records, budgets, contracts, inspection reports, and official decisions from public authorities in India.",
        can_proceed: false,
      };
    }
  }

  // 3. Assess Financial Elements
  const financialHits: string[] = [];
  const financialQuestions: string[] = [];
  const financialSuggestedRecords: string[] = [];

  const hasFinancial = FINANCIAL_PATTERNS.some((p) => p.test(clean));

  if (hasFinancial) {
    if (/\b(budget|fund|sanction|crore|lakh|rupees|₹|बजट|खर्च)\b/i.test(clean)) {
      financialHits.push("Budget / Public Fund Expenditure");
      financialQuestions.push(
        "Which financial year(s) (e.g. 2023-24 or 2024-25) should the budget and expenditure records cover?"
      );
      financialSuggestedRecords.push(
        "Sanctioned budget vs. actual itemized expenditure statements",
        "Fund utilization certificates and audit reports"
      );
    }
    if (/\b(tender|contract|contractor|theka|ठेका|ठेकेदार|bid)\b/i.test(clean)) {
      financialHits.push("Tender & Contractor Payments");
      financialQuestions.push(
        "Do you know the tender reference number, contractor name, or work order date?"
      );
      financialSuggestedRecords.push(
        "Certified copy of the work order, contractor agreement, and sanctioned rates",
        "Contractor billing records, Measurement Book (MB) copies, and payment vouchers"
      );
    }
    if (/\b(pension|gratuity|pf|provident|salary|arrear|epfo)\b/i.test(clean)) {
      financialHits.push("Pensions / Provident Fund / Financial Entitlements");
      financialQuestions.push(
        "What is the account / PPO number or the date from which the payment/arrears are pending?"
      );
      financialSuggestedRecords.push(
        "Account ledger / calculation sheet showing computation of arrears/pension",
        "Official file notings recording the reason for delay in disbursement"
      );
    }
    if (/\b(bribe|corruption|scam|embezzlement|ghotala|भ्रष्टाचार)\b/i.test(clean)) {
      financialHits.push("Suspected Financial Irregularity / Corruption");
      financialQuestions.push(
        "Are there specific vouchers, bills, or officers whose approval records you wish to scrutinize?"
      );
      financialSuggestedRecords.push(
        "Internal audit reports and vigilance inquiry reports on this expenditure",
        "Copies of comparative rate statements and sanctioning officer approvals"
      );
    }
    if (/\b(bpl|poverty|fee\s*waiver)\b/i.test(clean)) {
      financialHits.push("Below Poverty Line (BPL) Fee Waiver");
      financialQuestions.push(
        "Do you have a valid BPL card or Antyodaya ration card to attach for ₹0 application fee?"
      );
    }
  }

  // 4. Missing specifics analysis
  const generalFollowUps: string[] = [];
  const generalSuggestedRecords: string[] = [];

  const hasPlace = /\b(in|at|near|from|colony|ward|sector|district|city|village|nagar)\b/i.test(clean);
  const hasDate = /\b(20\d{2}|month|year|since|during|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(clean);
  const hasDept = /\b(nhai|pwd|corporation|ministry|department|board|police|railway|passport|bank|epfo|uidai|aiims|school|university)\b/i.test(clean);

  if (!hasPlace) {
    generalFollowUps.push("What is the exact locality, road, ward number, or district for this matter?");
  }
  if (!hasDate) {
    generalFollowUps.push("Which time period (months or years) should the requested records cover?");
  }
  if (!hasDept) {
    generalFollowUps.push("Which public authority, municipality, or department handles this work?");
  }

  // 5. Positive RTI check
  const isPositiveRti = RTI_POSITIVE_PATTERNS.some((p) => p.test(clean));

  // If text contains positive RTI cues or has reasonable word length without triggering out-of-scope
  const isValid = isPositiveRti || clean.split(/\s+/).length >= 5;

  if (!isValid) {
    return {
      is_valid_rti: false,
      refusal_reason:
        "This request cannot be filed under the Right to Information Act, 2005. It does not appear to relate to any government department, public authority, or official public records. Please change the information to describe a matter concerning official government records, public works, or public authorities.",
      category: "Unrelated / Non-RTI Matter",
      summary: clean,
      financial: {
        detected: false,
        details_found: [],
        missing_financial_info: [],
        questions: [],
        suggested_records: [],
      },
      follow_up_questions: [
        "Which government department or public body are you seeking information from?",
        "What specific official documents, work orders, or records do you want to inspect?",
      ],
      suggested_records: [],
      safe_guidance:
        "Please provide a concern relating to government services, public funds, local administration, or official records.",
      can_proceed: false,
    };
  }

  // Construct combined follow-up questions
  const allFollowUps = [...financialQuestions, ...generalFollowUps].slice(0, 3);
  const allSuggestedRecords = [
    ...financialSuggestedRecords,
    "Certified copies of relevant file notings and official correspondence",
    "Inspection reports and quality verification records",
  ].slice(0, 5);

  return {
    is_valid_rti: true,
    refusal_reason: null,
    category: hasFinancial ? "Public Finance & Administration" : "Public Records & Governance",
    summary: clean.slice(0, 200),
    financial: {
      detected: hasFinancial,
      details_found: financialHits,
      missing_financial_info: hasFinancial && financialQuestions.length > 0 ? financialQuestions : [],
      questions: financialQuestions,
      suggested_records: financialSuggestedRecords,
    },
    follow_up_questions: allFollowUps,
    suggested_records: allSuggestedRecords,
    safe_guidance:
      "This is a valid matter for an RTI application. You can review the suggested questions and add relevant financial or location details to strengthen your request.",
    can_proceed: true,
  };
}
