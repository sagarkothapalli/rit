/* ============================================================
   Jurisdiction triage — central vs. State/local-body.

   RTI Online (rtionline.gov.in) accepts applications ONLY for
   Central public authorities. A citizen complaining about their
   ward road, drainage, water supply, or property tax is asking a
   Municipal Corporation — the Central portal cannot take it and
   filing there wastes the 30-day clock.

   This module is deterministic on purpose. The voice agent is
   asked to flag these cases too, but the flag must not depend on
   the model noticing: every path through the app calls
   classifyJurisdiction() and gets the same verdict.
   ============================================================ */

export type JurisdictionLevel = "central" | "state" | "unclear";

export interface LocalBody {
  /** Retrieval id. Kept outside the Central directory count. */
  pa_code: string;
  /** Official name of the records holder. */
  name: string;
  /** Short form used when speaking to the citizen. */
  short: string;
  /** City name as it should be shown or spoken. */
  city: string;
  /** State or UT that governs this body. */
  state: string;
  /** Spoken forms that identify the city/area, lowercase. */
  aliases: string[];
  /** Extra retrieval keywords. */
  keywords?: string[];
}

/**
 * Urban local bodies we can name confidently. This list is a
 * convenience, not a completeness claim: an unmatched city still
 * gets flagged as a State matter, just with a generic body name.
 */
export const LOCAL_BODIES: LocalBody[] = [
  {
    pa_code: "STATE-GVMC",
    name: "Greater Visakhapatnam Municipal Corporation (GVMC)",
    short: "GVMC",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    aliases: [
      "gvmc", "visakhapatnam", "vishakhapatnam", "vizag", "visakha", "viskhapatnam",
      "waltair", "gajuwaka", "madhurawada", "mushidiwada", "chinna mushidiwada",
      "pendurthi", "anakapalli road", "seethammadhara", "mvp colony", "dwaraka nagar",
      "విశాఖపట్నం", "విశాఖ",
    ],
  },
  {
    pa_code: "STATE-GHMC",
    name: "Greater Hyderabad Municipal Corporation (GHMC)",
    short: "GHMC",
    city: "Hyderabad",
    state: "Telangana",
    aliases: ["ghmc", "hyderabad", "secunderabad", "kukatpally", "gachibowli", "hitec city", "హైదరాబాద్"],
  },
  {
    pa_code: "STATE-MCGM",
    name: "Municipal Corporation of Greater Mumbai (BMC / MCGM)",
    short: "BMC",
    city: "Mumbai",
    state: "Maharashtra",
    aliases: ["bmc", "mcgm", "brihanmumbai", "greater mumbai", "mumbai", "andheri", "borivali", "dadar", "मुंबई"],
  },
  {
    pa_code: "STATE-PMC",
    name: "Pune Municipal Corporation (PMC)",
    short: "PMC",
    city: "Pune",
    state: "Maharashtra",
    aliases: ["pune municipal", "pmc pune", "kothrud", "kothrud pune", "hadapsar", "पुणे महानगरपालिका"],
  },
  {
    pa_code: "STATE-BBMP",
    name: "Bruhat Bengaluru Mahanagara Palike (BBMP)",
    short: "BBMP",
    city: "Bengaluru",
    state: "Karnataka",
    aliases: ["bbmp", "bengaluru", "bangalore", "whitefield", "koramangala", "indiranagar", "ಬೆಂಗಳೂರು"],
  },
  {
    pa_code: "STATE-GCC",
    name: "Greater Chennai Corporation (GCC)",
    short: "Chennai Corporation",
    city: "Chennai",
    state: "Tamil Nadu",
    aliases: ["greater chennai", "chennai corporation", "chennai", "madras", "adyar", "velachery", "சென்னை"],
  },
  {
    pa_code: "STATE-MCD",
    name: "Municipal Corporation of Delhi (MCD)",
    short: "MCD",
    city: "Delhi",
    state: "Delhi",
    aliases: ["mcd", "municipal corporation of delhi", "sdmc", "ndmc delhi", "rohini", "dwarka delhi", "delhi nagar nigam"],
  },
  {
    pa_code: "STATE-KMC",
    name: "Kolkata Municipal Corporation (KMC)",
    short: "KMC",
    city: "Kolkata",
    state: "West Bengal",
    aliases: ["kmc", "kolkata municipal", "kolkata", "calcutta", "salt lake", "কলকাতা"],
  },
  {
    pa_code: "STATE-AMC",
    name: "Ahmedabad Municipal Corporation (AMC)",
    short: "AMC",
    city: "Ahmedabad",
    state: "Gujarat",
    aliases: ["amc ahmedabad", "ahmedabad municipal", "ahmedabad", "amdavad", "અમદાવાદ"],
  },
  {
    pa_code: "STATE-GHMC-VJA",
    name: "Vijayawada Municipal Corporation (VMC)",
    short: "VMC",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    aliases: ["vmc vijayawada", "vijayawada municipal", "vijayawada", "bezawada", "విజయవాడ"],
  },
  {
    pa_code: "STATE-JMC",
    name: "Jaipur Municipal Corporation",
    short: "Jaipur Nagar Nigam",
    city: "Jaipur",
    state: "Rajasthan",
    aliases: ["jaipur nagar nigam", "jaipur municipal", "jaipur", "जयपुर"],
  },
  {
    pa_code: "STATE-LMC",
    name: "Lucknow Municipal Corporation (Lucknow Nagar Nigam)",
    short: "Lucknow Nagar Nigam",
    city: "Lucknow",
    state: "Uttar Pradesh",
    aliases: ["lucknow nagar nigam", "lucknow municipal", "lucknow", "लखनऊ"],
  },
];

/** States and UTs, for naming the government when no city matched. */
const STATES: Array<{ name: string; aliases: string[] }> = [
  { name: "Andhra Pradesh", aliases: ["andhra pradesh", "andhra", "ఆంధ్ర"] },
  { name: "Telangana", aliases: ["telangana", "తెలంగాణ"] },
  { name: "Maharashtra", aliases: ["maharashtra", "महाराष्ट्र"] },
  { name: "Karnataka", aliases: ["karnataka", "ಕರ್ನಾಟಕ"] },
  { name: "Tamil Nadu", aliases: ["tamil nadu", "tamilnadu", "தமிழ்நாடு"] },
  { name: "Kerala", aliases: ["kerala", "കേരള"] },
  { name: "Delhi", aliases: ["delhi", "दिल्ली"] },
  { name: "Uttar Pradesh", aliases: ["uttar pradesh", "यूपी", "उत्तर प्रदेश"] },
  { name: "Bihar", aliases: ["bihar", "बिहार"] },
  { name: "West Bengal", aliases: ["west bengal", "পশ্চিমবঙ্গ"] },
  { name: "Gujarat", aliases: ["gujarat", "ગુજરાત"] },
  { name: "Rajasthan", aliases: ["rajasthan", "राजस्थान"] },
  { name: "Madhya Pradesh", aliases: ["madhya pradesh", "मध्य प्रदेश"] },
  { name: "Punjab", aliases: ["punjab", "ਪੰਜਾਬ"] },
  { name: "Haryana", aliases: ["haryana", "हरियाणा"] },
  { name: "Odisha", aliases: ["odisha", "orissa", "ଓଡ଼ିଶା"] },
  { name: "Assam", aliases: ["assam", "অসম"] },
  { name: "Jharkhand", aliases: ["jharkhand", "झारखंड"] },
  { name: "Chhattisgarh", aliases: ["chhattisgarh", "छत्तीसगढ़"] },
  { name: "Uttarakhand", aliases: ["uttarakhand", "उत्तराखंड"] },
  { name: "Himachal Pradesh", aliases: ["himachal", "हिमाचल"] },
  { name: "Goa", aliases: ["goa"] },
  { name: "Jammu & Kashmir", aliases: ["jammu", "kashmir"] },
];

/* ---------------- Subject signals ---------------- */

interface Signal {
  test: RegExp;
  /** What the citizen is actually complaining about, in plain words. */
  subject: string;
  /** Weight. Named bodies and unmistakable subjects score higher. */
  weight: number;
  /** Department that typically holds these records at the State level. */
  department?: string;
  /**
   * True when the records sit with a State-level department or corporation
   * rather than with the city's municipal body. A State highway or a land
   * record is not a municipal matter even though a city was named.
   */
  stateLevel?: boolean;
}

/**
 * Subjects that belong to a State government or a local body.
 * Ward-level civic work is the overwhelming real-world case.
 */
const STATE_SIGNALS: Signal[] = [
  // --- Named local bodies and State departments (unmistakable) ---
  { test: /\b(gvmc|ghmc|bbmp|bmc|mcgm|mcd|kmc|pmc|amc|vmc|nagar nigam|nagar palika|nagar panchayat|mahanagar palika|municipal corporation|municipal council|municipality|महानगरपालिका|नगर निगम|నగర పాలక|corporation office|ward office|ward member|ward councillor|corporator)\b/i, subject: "municipal / urban local body work", weight: 6, department: "Municipal Corporation (Engineering / Works wing)" },
  { test: /\b(gram panchayat|panchayat|zilla parishad|zp office|mandal parishad|sarpanch|पंचायत|పంచాయతీ|block development|bdo office)\b/i, subject: "panchayat / rural local body work", weight: 6, department: "Panchayat Raj / Rural Development", stateLevel: true },
  { test: /\b(state pwd|\bpwd\b|public works department|r&b department|roads and buildings|state highway|mdr road|major district road)\b/i, subject: "State PWD / R&B road work", weight: 5, department: "Public Works Department (State)", stateLevel: true },
  /**
   * Expressways and their tolls, when no national highway is named. These are
   * State road-development corporation assets (MSRDC, UPEIDA, APRDC), never a
   * city corporation's — so the city's municipal body must not be suggested.
   */
  { test: /\b(expressway|express way|toll (?:collection|revenue|booth|gate)|toll (?:is|charges|rate)|ring road|outer ring road|bypass road)\b/i, subject: "expressway / State road corridor", weight: 5, department: "State Road Development Corporation / State PWD", stateLevel: true },
  { test: /\b(district collector|collectorate|collector office|tehsil|tahsil|taluk office|mandal revenue|mro office|patwari|talathi|village revenue|sdm office|sub divisional magistrate)\b/i, subject: "revenue / district administration", weight: 5, department: "District Revenue Administration", stateLevel: true },
  { test: /\b(discom|electricity board|state electricity|apepdcl|apspdcl|tsspdcl|bescom|mseb|msedcl|tneb|bses|torrent power|bijli vibhag|बिजली विभाग|transformer|power cut|load shedding)\b/i, subject: "electricity distribution", weight: 5, department: "State Electricity Distribution Company (DISCOM)", stateLevel: true },
  { test: /\b(jal board|water board|jal nigam|water supply department|hmwssb|djb|bwssb|metro water|nalla|piped water|tap water|bore ?well|handpump|हैंडपंप)\b/i, subject: "water supply", weight: 5, department: "State Water Supply / Sewerage Board", stateLevel: true },
  { test: /\b(state police|police station|thana|sho|dsp office|commissioner of police|fir|एफआईआर|पुलिस स्टेशन|traffic police)\b/i, subject: "State police matter", weight: 4, department: "State Police (District / Commissionerate)", stateLevel: true },
  { test: /\b(state transport|rtc\b|apsrtc|tsrtc|msrtc|ksrtc|tnstc|city bus|state bus|rto office|regional transport office|driving licence|driving license|learner licence|vehicle registration|roadways)\b/i, subject: "State transport / RTO", weight: 4, department: "State Transport Department / RTC", stateLevel: true },
  { test: /\b(state university|state board exam|intermediate board|ssc board|hsc board|state education department|government school|zilla parishad school|anganwadi|mid day meal|midday meal)\b/i, subject: "State education", weight: 4, department: "State Education Department", stateLevel: true },
  { test: /\b(district hospital|area hospital|primary health cent|phc\b|chc\b|government hospital|state health department|asha worker|108 ambulance)\b/i, subject: "State health facility", weight: 4, department: "State Health & Family Welfare Department", stateLevel: true },
  { test: /\b(land record|pattadar|patta|mutation|encumbrance certificate|sub ?registrar|registrar office|registry office|survey number|bhoomi|dharani|7\/12 extract|record of rights)\b/i, subject: "land records / registration", weight: 5, department: "Revenue / Registration & Stamps Department", stateLevel: true },
  { test: /\b(ration card|fair price shop|pds shop|civil supplies|white ration|antyodaya|राशन कार्ड|రేషన్)\b/i, subject: "PDS / civil supplies", weight: 4, department: "Civil Supplies Department (State)", stateLevel: true },
  { test: /\b(building permission|layout approval|occupancy certificate|town planning|tp scheme|unauthorised construction|unauthorized construction|encroachment|illegal construction)\b/i, subject: "building permission / town planning", weight: 5, department: "Town Planning wing, Municipal Corporation" },
  { test: /\b(property tax|house tax|water tax|vacant land tax|trade licence fee|संपत्ति कर|ఆస్తి పన్ను)\b/i, subject: "property / municipal tax", weight: 5, department: "Revenue wing, Municipal Corporation" },

  // --- Ward-level civic subjects (the common case) ---
  { test: /\b(drainage|drain|sewer|sewage|nala|nalah|manhole|open drain|storm water|गंदा पानी|नाली|కాలువ)\b/i, subject: "drainage / sewerage", weight: 4, department: "Municipal Engineering wing" },
  { test: /\b(garbage|solid waste|trash|dumping|dump yard|swachh|safai|sanitation|sweeper|कचरा|सफाई|చెత్త)\b/i, subject: "sanitation / solid waste", weight: 4, department: "Public Health / Sanitation wing" },
  { test: /\b(street ?light|streetlight|lamp post|light pole|स्ट्रीट लाइट|వీధి దీపా)\b/i, subject: "street lighting", weight: 4, department: "Electrical wing, Municipal Corporation" },
  { test: /\b(footpath|pavement|sidewalk|divider|speed breaker|colony road|ward road|internal road|inner road|link road|village road|cc road|bt road|gully|galli|मोहल्ले की सड़क|कॉलोनी की सड़क)\b/i, subject: "local road work", weight: 4, department: "Municipal Engineering wing" },
  { test: /\b(park maintenance|playground|community hall|burial ground|graveyard|crematorium|public toilet|stray dog|street dog|mosquito|fogging|water logging|waterlogging)\b/i, subject: "civic amenity", weight: 3, department: "Municipal Corporation" },

  /**
   * Neighbourhood framing. "The road in my area is not maintained" is
   * almost always a local body road. A Central signal still outranks
   * this, so "NH-16 near my area" is unaffected.
   */
  {
    test: /\b(?:my|our|hamare|humare|mere|maa|mana|our\s+own)\s+(?:area|locality|colony|street|road|lane|ward|village|mohalla|basti|nagar|layout|society|apartment\s+road)\b|\b(?:in|at)\s+my\s+(?:area|locality|colony|village|ward)\b|\b(?:mere|hamare)\s+(?:ilaake|इलाके|क्षेत्र)\b|\bमेरे\s+इलाके\b|\bమా\s+ఏరియా\b/i,
    subject: "neighbourhood civic work",
    weight: 3,
    department: "Municipal Corporation / local body",
  },
  {
    test: /\b(road|roads|sadak|सड़क|सडक|రోడ్డు|street|lane)\b[\s\S]{0,60}\b(not (?:being )?(?:well )?maintain|poorly maintain|badly maintain|repair|repairs|repaired|pothole|potholes|damaged|broken|patch ?work|re-?laying|relaid|quality)\b|\b(pothole|potholes|गड्ढ|गड्ढे)\b/i,
    subject: "road maintenance",
    weight: 2,
    department: "Municipal Corporation / State PWD (depending on who owns the road)",
  },
];

/**
 * Subjects that genuinely belong to a Central public authority.
 * These beat a city name: "passport delay in Visakhapatnam" is a
 * Central RPO matter even though a city was mentioned.
 */
const CENTRAL_SIGNALS: Signal[] = [
  { test: /\b(nhai|national highway|nh-?\d+|\bnh \d+|golden quadrilateral|bharatmala|toll plaza|fastag|national highways authority|राष्ट्रीय राजमार्ग)\b/i, subject: "national highway", weight: 6, department: "National Highways Authority of India (NHAI)" },
  { test: /\b(passport|rpo\b|regional passport|tatkaal passport|tatkal passport|police verification passport|पासपोर्ट)\b/i, subject: "passport", weight: 6, department: "MEA — Consular, Passport & Visa Division" },
  { test: /\b(epfo|provident fund|\bepf\b|\buan\b|pension scheme 1995|eps 95|भविष्य निधि)\b/i, subject: "provident fund", weight: 6, department: "Employees Provident Fund Organisation" },
  { test: /\b(income tax|\bitr\b|\btds\b|pan card|\bpan\b|tax refund|assessing officer|cbdt|आयकर)\b/i, subject: "income tax", weight: 5, department: "Central Board of Direct Taxes" },
  { test: /\b(aadhaar|aadhar|uidai|आधार)\b/i, subject: "Aadhaar", weight: 6, department: "Unique Identification Authority of India" },
  { test: /\b(indian rail|railway|railways|train|irctc|\bpnr\b|railway station|zonal railway|रेलवे)\b/i, subject: "railways", weight: 5, department: "Ministry of Railways" },
  { test: /\b(\bgst\b|cgst|igst|customs|central excise|cbic|dri\b)\b/i, subject: "GST / customs", weight: 5, department: "Central Board of Indirect Taxes and Customs" },
  { test: /\b(nationalised bank|nationalized bank|\bsbi\b|\bpnb\b|canara bank|bank of baroda|\brbi\b|reserve bank|jan dhan|mudra loan|dfs\b)\b/i, subject: "public sector banking", weight: 4, department: "Department of Financial Services" },
  { test: /\b(neet|\bjee\b|cuet|\bnta\b|ugc net)\b/i, subject: "national entrance exam", weight: 5, department: "National Testing Agency" },
  { test: /\b(cbse|kendriya vidyalaya|navodaya|central board of secondary)\b/i, subject: "CBSE / central school", weight: 5, department: "Central Board of Secondary Education" },
  { test: /\b(aiims|ayushman|pmjay|cghs|esic|jipmer)\b/i, subject: "central health scheme", weight: 5, department: "Ministry of Health & Family Welfare" },
  { test: /\b(lpg|ujjwala|gas cylinder|gas agency|iocl|hpcl|bpcl|petrol pump dealer)\b/i, subject: "LPG / petroleum", weight: 4, department: "Ministry of Petroleum & Natural Gas" },
  { test: /\b(india post|post office|speed post|registered post|postal department|डाक विभाग)\b/i, subject: "postal services", weight: 4, department: "Department of Posts" },
  { test: /\b(election commission|\bevm\b|voter id|\bepic\b|electoral roll|form 6)\b/i, subject: "elections", weight: 4, department: "Election Commission of India" },
  { test: /\b(airport authority|\baai\b|dgca|air india|indigo refund|civil aviation)\b/i, subject: "civil aviation", weight: 4, department: "Ministry of Civil Aviation" },
  { test: /\b(central government|centre|ministry of|department of (?:posts|telecom|revenue)|govt of india|government of india|केंद्र सरकार|भारत सरकार)\b/i, subject: "named Central ministry", weight: 3 },
  { test: /\b(defence|army|navy|air force|drdo|isro|ordnance|sainik|ex-?servicemen)\b/i, subject: "defence / space", weight: 4, department: "Ministry of Defence" },
  { test: /\b(mgnrega|nrega|pm awas|pmay|pm kisan|jal jeevan mission|swachh bharat mission|smart city mission|amrut)\b/i, subject: "centrally sponsored scheme", weight: 3, department: "Central nodal ministry (scheme funds are routed through the State)" },
  { test: /\b(bsnl|telecom|trai|spectrum|mobile tower clearance)\b/i, subject: "telecom", weight: 4, department: "Department of Telecommunications" },
  { test: /\b(cpwd|central public works)\b/i, subject: "CPWD work", weight: 5, department: "Central Public Works Department" },
];

/**
 * Centrally sponsored schemes are executed by State agencies. The
 * scheme name alone must not flip a ward road into a Central matter.
 */
const SHARED_SCHEME = /\b(mgnrega|nrega|pm awas|pmay|pm gram sadak|pmgsy|jal jeevan|swachh bharat|smart city|amrut|15th finance commission)\b/i;

export interface JurisdictionVerdict {
  level: JurisdictionLevel;
  /** Confidence in the level, 0-1. */
  confidence: number;
  /** The State/UT when identifiable. */
  stateName: string | null;
  /** The local body when identifiable. */
  localBody: LocalBody | null;
  /** Who the citizen should actually approach. */
  recommendedBody: string | null;
  /** Where the request has to be filed. */
  filingChannel: string;
  /** Plain-language subject that drove the decision. */
  subject: string | null;
  /** Why we decided this, for the UI and for the agent to say aloud. */
  reasons: string[];
  /** True when the Central RTI Online portal cannot accept this. */
  outsideCentralPortal: boolean;
  /** True when a shared scheme means both levels may hold records. */
  sharedScheme: boolean;
}

const CENTRAL_CHANNEL = "RTI Online Central portal (rtionline.gov.in)";

function hit(text: string, signals: Signal[]): { total: number; top: Signal | null; subjects: string[] } {
  let total = 0;
  let top: Signal | null = null;
  const subjects: string[] = [];
  for (const signal of signals) {
    if (!signal.test.test(text)) continue;
    total += signal.weight;
    subjects.push(signal.subject);
    if (!top || signal.weight > top.weight) top = signal;
  }
  return { total, top, subjects };
}

export function findLocalBody(text: string): LocalBody | null {
  const t = text.toLowerCase();
  let best: { body: LocalBody; len: number } | null = null;
  for (const body of LOCAL_BODIES) {
    for (const alias of body.aliases) {
      if (!t.includes(alias)) continue;
      // Prefer the longest alias so "chinna mushidiwada" wins over "vizag".
      if (!best || alias.length > best.len) best = { body, len: alias.length };
    }
  }
  return best?.body ?? null;
}

export function findStateName(text: string): string | null {
  const t = text.toLowerCase();
  for (const state of STATES) {
    if (state.aliases.some((alias) => t.includes(alias))) return state.name;
  }
  return null;
}

/**
 * Decide whether a complaint belongs to a Central public authority
 * or to a State government / local body.
 *
 * Precedence, deliberately:
 * 1. A clear Central subject (passport, NHAI, EPFO...) wins even if
 *    a city is named — the city is just where the citizen lives.
 * 2. Otherwise a State/local subject wins.
 * 3. A city or State name with a civic subject is enough to flag.
 * 4. Nothing recognisable stays "unclear" — we never guess.
 */
export function classifyJurisdiction(text: string): JurisdictionVerdict {
  const raw = (text ?? "").trim();
  const reasons: string[] = [];
  const localBody = findLocalBody(raw);
  const stateName = findStateName(raw) ?? localBody?.state ?? null;
  const sharedScheme = SHARED_SCHEME.test(raw);

  const central = hit(raw, CENTRAL_SIGNALS);
  const state = hit(raw, STATE_SIGNALS);

  // A scheme name on its own is not a Central subject.
  const centralScore = sharedScheme && central.total <= 3 ? 0 : central.total;

  const empty: JurisdictionVerdict = {
    level: "unclear",
    confidence: 0,
    stateName,
    localBody,
    recommendedBody: null,
    filingChannel: CENTRAL_CHANNEL,
    subject: null,
    reasons: [],
    outsideCentralPortal: false,
    sharedScheme,
  };

  if (raw.length < 4) return empty;

  // 1. Central subject clearly dominates.
  if (centralScore > 0 && centralScore >= state.total) {
    if (central.top?.subject) reasons.push(`Mentions ${central.top.subject}, which a Central public authority handles.`);
    if (localBody) reasons.push(`${localBody.city} is where you are, not who holds the records.`);
    return {
      level: "central",
      confidence: Math.min(0.95, 0.55 + centralScore / 14),
      stateName,
      localBody,
      recommendedBody: central.top?.department ?? null,
      filingChannel: CENTRAL_CHANNEL,
      subject: central.top?.subject ?? null,
      reasons,
      outsideCentralPortal: false,
      sharedScheme,
    };
  }

  // 2. State / local-body subject.
  if (state.total > 0) {
    /*
     * Whether the city's municipal corporation is the right records holder
     * depends on the subject. A ward road, drain, or street light is
     * municipal. A State highway, land record, DISCOM supply, or RTO file
     * belongs to a State department even when the citizen names their city.
     */
    const municipal = !state.top?.stateLevel;
    const holder = municipal
      ? localBody?.name ?? state.top?.department ?? null
      : state.top?.department ?? localBody?.name ?? null;
    const government = stateName ? `Government of ${stateName}` : "your State government";
    if (state.top?.subject) reasons.push(`${capitalise(state.top.subject)} is handled by the State government or the local body, not the Central government.`);
    if (municipal && localBody) reasons.push(`For ${localBody.city}, that is ${localBody.name}.`);
    else if (stateName) reasons.push(`The records would sit with ${government}.`);
    reasons.push("RTI Online only accepts applications for Central public authorities, so this cannot be filed there.");
    if (sharedScheme) reasons.push("The scheme is centrally funded, so the Central nodal ministry may hold sanction and release records — the execution records stay with the State.");
    return {
      level: "state",
      confidence: Math.min(0.95, 0.5 + state.total / 14 + (localBody ? 0.15 : 0)),
      stateName,
      localBody: municipal ? localBody : null,
      recommendedBody: holder,
      filingChannel: municipal && localBody
        ? `${localBody.short} Public Information Officer${stateName ? ` (${stateName} State RTI channel)` : ""}`
        : stateName
          ? `${stateName} State RTI channel`
          : "your State RTI channel",
      subject: state.top?.subject ?? null,
      reasons,
      outsideCentralPortal: true,
      sharedScheme,
    };
  }

  // 3. A named local body with no clear subject is still a State matter.
  if (localBody) {
    return {
      level: "state",
      confidence: 0.6,
      stateName,
      localBody,
      recommendedBody: localBody.name,
      filingChannel: `${localBody.short} Public Information Officer${stateName ? ` (${stateName} State RTI channel)` : ""}`,
      subject: "local body matter",
      reasons: [
        `${localBody.name} is a State-governed local body.`,
        "RTI Online only accepts applications for Central public authorities.",
      ],
      outsideCentralPortal: true,
      sharedScheme,
    };
  }

  return empty;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * One short spoken line the voice agent uses to flag the mismatch
 * without being asked. Kept plain so it translates cleanly.
 */
export function spokenJurisdictionFlag(verdict: JurisdictionVerdict): string {
  if (verdict.level !== "state") return "";
  const body = verdict.localBody?.name ?? verdict.recommendedBody ?? "your State government";
  return `Before we go further — this is a State matter, not a Central government one. RTI Online, which this service mirrors, only takes Central public authorities. These records are held by ${body}, so the application has to go to them. I can still prepare the full application for you, addressed to ${verdict.localBody?.short ?? "that authority"}.`;
}

/** Compact line for the notes/handoff, and for the PDF cover. */
export function jurisdictionSummary(verdict: JurisdictionVerdict): string {
  if (verdict.level === "state") {
    const body = verdict.localBody?.name ?? verdict.recommendedBody ?? "State government";
    return `State/local-body matter — records holder: ${body}. Not accepted on the Central RTI Online portal.`;
  }
  if (verdict.level === "central") {
    return `Central public authority matter${verdict.recommendedBody ? ` — likely ${verdict.recommendedBody}` : ""}.`;
  }
  return "Jurisdiction not yet determined from the citizen's description.";
}
