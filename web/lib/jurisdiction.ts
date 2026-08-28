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

/**
 * How strongly a signal identifies the records holder.
 *
 * - `authority` — the citizen named the body, the asset, or the level itself:
 *   "NHAI", "EPFO", "GVMC", "nagar nigam", "NH-16", "Ministry of Railways".
 *   Naming the holder is the strongest statement a citizen can make about
 *   jurisdiction, and it outranks any number of subject words.
 * - `subject` — a topic that implies a level without naming it: a drain, a
 *   street light, a property tax bill, a passport.
 * - `weak` — framing rather than subject: "the road in my area", a bare
 *   centrally-sponsored scheme name. Never decides on its own against a
 *   subject or an authority on the other side.
 */
type SignalTier = "authority" | "subject" | "weak";

interface Signal {
  test: RegExp;
  /** What the citizen is actually complaining about, in plain words. */
  subject: string;
  /** Weight within the tier. Unmistakable bodies score higher. */
  weight: number;
  /** How strongly this identifies the records holder. */
  tier: SignalTier;
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
  { test: /\b(gvmc|ghmc|bbmp|bmc|mcgm|mcd|kmc|pmc|amc|vmc|nagar nigam|nagar palika|nagar panchayat|mahanagar palika|municipal corporation|municipal council|municipality|महानगरपालिका|नगर निगम|నగర పాలక|corporation office|ward office|ward member|ward councillor|corporator)\b/i, subject: "municipal / urban local body work", weight: 6, tier: "authority", department: "Municipal Corporation (Engineering / Works wing)" },
  { test: /\b(gram panchayat|panchayat|zilla parishad|zp office|mandal parishad|sarpanch|पंचायत|పంచాయతీ|block development|bdo office)\b/i, subject: "panchayat / rural local body work", weight: 6, tier: "authority", department: "Panchayat Raj / Rural Development", stateLevel: true },
  { test: /\b(state pwd|\bpwd\b|public works department|r&b department|roads and buildings|state highway|mdr road|major district road)\b/i, subject: "State PWD / R&B road work", weight: 5, tier: "authority", department: "Public Works Department (State)", stateLevel: true },
  /**
   * Expressways and their tolls, when no national highway is named. These are
   * State road-development corporation assets (MSRDC, UPEIDA, APRDC), never a
   * city corporation's — so the city's municipal body must not be suggested.
   */
  { test: /\b(expressway|express way|toll (?:collection|revenue|booth|gate)|toll (?:is|charges|rate)|ring road|outer ring road|bypass road)\b/i, subject: "expressway / State road corridor", weight: 5, tier: "authority", department: "State Road Development Corporation / State PWD", stateLevel: true },
  { test: /\b(district collector|collectorate|collector office|tehsil|tahsil|taluk office|mandal revenue|mro office|patwari|talathi|village revenue|sdm office|sub divisional magistrate)\b/i, subject: "revenue / district administration", weight: 5, tier: "authority", department: "District Revenue Administration", stateLevel: true },
  { test: /\b(discom|electricity board|state electricity|apepdcl|apspdcl|tsspdcl|bescom|mseb|msedcl|tneb|bses|torrent power|bijli vibhag|बिजली विभाग|transformer|power cut|load shedding)\b/i, subject: "electricity distribution", weight: 5, tier: "authority", department: "State Electricity Distribution Company (DISCOM)", stateLevel: true },
  { test: /\b(jal board|water board|jal nigam|water supply department|hmwssb|djb|bwssb|metro water|nalla|piped water|tap water|bore ?well|handpump|हैंडपंप)\b/i, subject: "water supply", weight: 5, tier: "authority", department: "State Water Supply / Sewerage Board", stateLevel: true },
  { test: /\b(state police|police station|thana|sho|dsp office|commissioner of police|fir|एफआईआर|पुलिस स्टेशन|traffic police)\b/i, subject: "State police matter", weight: 4, tier: "authority", department: "State Police (District / Commissionerate)", stateLevel: true },
  { test: /\b(state transport|rtc\b|apsrtc|tsrtc|msrtc|ksrtc|tnstc|city bus|state bus|rto office|regional transport office|driving licence|driving license|learner licence|vehicle registration|roadways)\b/i, subject: "State transport / RTO", weight: 4, tier: "authority", department: "State Transport Department / RTC", stateLevel: true },
  { test: /\b(state university|state board exam|intermediate board|ssc board|hsc board|state education department|government school|zilla parishad school|anganwadi|mid day meal|midday meal)\b/i, subject: "State education", weight: 4, tier: "authority", department: "State Education Department", stateLevel: true },
  { test: /\b(district hospital|area hospital|primary health cent(?:re|er)|phc|chc|government hospital|state health department|asha worker|108 ambulance)\b/i, subject: "State health facility", weight: 4, tier: "authority", department: "State Health & Family Welfare Department", stateLevel: true },
  { test: /\b(land record|pattadar|patta|mutation|encumbrance certificate|sub ?registrar|registrar office|registry office|survey number|bhoomi|dharani|7\/12 extract|record of rights)\b/i, subject: "land records / registration", weight: 5, tier: "authority", department: "Revenue / Registration & Stamps Department", stateLevel: true },
  { test: /\b(ration card|fair price shop|pds shop|civil supplies|white ration|antyodaya|राशन कार्ड|రేషన్)\b/i, subject: "PDS / civil supplies", weight: 4, tier: "authority", department: "Civil Supplies Department (State)", stateLevel: true },
  /** The words for the level itself, spoken by a citizen who already knows. */
  { test: /\b(state government|state govt|government of the state|my state government|राज्य सरकार|రాష్ట్ర ప్రభుత్వ|மாநில அரசு|ರಾಜ್ಯ ಸರ್ಕಾರ|സംസ്ഥാന സർക്കാർ|রাজ্য সরকার|રાજ્ય સરકાર|ਰਾਜ ਸਰਕਾਰ|ରାଜ୍ୟ ସରକାର|ریاستی حکومت)\b/i, subject: "a State government matter the citizen named", weight: 5, tier: "authority", stateLevel: true },
  { test: /\b(building permission|layout approval|occupancy certificate|town planning|tp scheme|unauthorised construction|unauthorized construction|encroachment|illegal construction)\b/i, subject: "building permission / town planning", weight: 5, tier: "subject", department: "Town Planning wing, Municipal Corporation" },
  { test: /\b(property tax|house tax|water tax|vacant land tax|trade licence fee|संपत्ति कर|ఆస్తి పన్ను)\b/i, subject: "property / municipal tax", weight: 5, tier: "subject", department: "Revenue wing, Municipal Corporation" },

  // --- Ward-level civic subjects (the common case) ---
  { test: /\b(drainage|drain|sewer|sewage|nala|nalah|manhole|open drain|storm water|गंदा पानी|नाली|కాలువ)\b/i, subject: "drainage / sewerage", weight: 4, tier: "subject", department: "Municipal Engineering wing" },
  { test: /\b(garbage|solid waste|trash|dumping|dump yard|swachh|safai|sanitation|sweeper|कचरा|सफाई|చెత్త)\b/i, subject: "sanitation / solid waste", weight: 4, tier: "subject", department: "Public Health / Sanitation wing" },
  { test: /\b(street ?light|streetlight|lamp post|light pole|स्ट्रीट लाइट|వీధి దీపా)\b/i, subject: "street lighting", weight: 4, tier: "subject", department: "Electrical wing, Municipal Corporation" },
  { test: /\b(footpath|pavement|sidewalk|divider|speed breaker|colony road|ward road|internal road|inner road|link road|village road|cc road|bt road|gully|galli|मोहल्ले की सड़क|कॉलोनी की सड़क)\b/i, subject: "local road work", weight: 4, tier: "subject", department: "Municipal Engineering wing" },
  { test: /\b(park maintenance|playground|community hall|burial ground|graveyard|crematorium|public toilet|stray dog|street dog|mosquito|fogging|water logging|waterlogging)\b/i, subject: "civic amenity", weight: 3, tier: "subject", department: "Municipal Corporation" },

  /**
   * Neighbourhood framing. "The road in my area is not maintained" is
   * almost always a local body road — but it is framing, not a subject, so
   * a named Central authority anywhere in the account outranks it.
   */
  {
    test: /\b(?:my|our|hamare|humare|mere|maa|mana|our\s+own)\s+(?:area|locality|colony|street|road|lane|ward|village|mohalla|basti|nagar|layout|society|apartment\s+road)\b|\b(?:in|at)\s+my\s+(?:area|locality|colony|village|ward)\b|\b(?:mere|hamare)\s+(?:ilaake|इलाके|क्षेत्र)\b|\bमेरे\s+इलाके\b|\bమా\s+ఏరియా\b/i,
    subject: "neighbourhood civic work",
    weight: 3,
    tier: "weak",
    department: "Municipal Corporation / local body",
  },
  {
    test: /\b(road|roads|sadak|सड़क|सडक|రోడ్డు|street|lane)\b[\s\S]{0,60}\b(not (?:being )?(?:well )?maintain|poorly maintain|badly maintain|repair|repairs|repaired|pothole|potholes|damaged|broken|patch ?work|re-?laying|relaid|quality)\b|\b(pothole|potholes|गड्ढ|गड्ढे)\b/i,
    subject: "road maintenance",
    weight: 2,
    tier: "weak",
    department: "Municipal Corporation / State PWD (depending on who owns the road)",
  },
];

/**
 * Subjects that genuinely belong to a Central public authority.
 *
 * A citizen who names one of these has named the records holder, so an
 * `authority`-tier hit here settles the question — "NHAI has not repaired
 * the road in my colony" is an NHAI matter, not a municipal one, however
 * many civic words surround it.
 */
const CENTRAL_SIGNALS: Signal[] = [
  { test: /\b(nhai|national highways? authority(?: of india)?|national highway|national high way|nh-?\s?\d+|\bnh \d+|golden quadrilateral|bharatmala|nhidcl|morth|ministry of road transport|toll plaza|fastag|राष्ट्रीय राजमार्ग|రాష్ట్రీయ రహదారి|தேசிய நெடுஞ்சாலை)\b/i, subject: "national highway", weight: 6, tier: "authority", department: "National Highways Authority of India (NHAI)" },
  { test: /\b(passport|rpo\b|regional passport|passport seva|tatkaal passport|tatkal passport|police verification passport|पासपोर्ट)\b/i, subject: "passport", weight: 6, tier: "authority", department: "MEA — Consular, Passport & Visa Division" },
  { test: /\b(epfo|employees'? provident fund|provident fund|\bepf\b|\buan\b|pension scheme 1995|eps 95|भविष्य निधि)\b/i, subject: "provident fund", weight: 6, tier: "authority", department: "Employees Provident Fund Organisation" },
  { test: /\b(income tax|\bitr\b|\btds\b|pan card|\bpan\b|tax refund|assessing officer|cbdt|आयकर)\b/i, subject: "income tax", weight: 5, tier: "authority", department: "Central Board of Direct Taxes" },
  { test: /\b(aadhaar|aadhar|uidai|आधार)\b/i, subject: "Aadhaar", weight: 6, tier: "authority", department: "Unique Identification Authority of India" },
  { test: /\b(indian rail|railway|railways|train|irctc|\bpnr\b|railway station|zonal railway|रेलवे)\b/i, subject: "railways", weight: 5, tier: "authority", department: "Ministry of Railways" },
  { test: /\b(\bgst\b|cgst|igst|customs|central excise|cbic|dri\b)\b/i, subject: "GST / customs", weight: 5, tier: "authority", department: "Central Board of Indirect Taxes and Customs" },
  { test: /\b(nationalised bank|nationalized bank|public sector bank|\bsbi\b|state bank of india|\bpnb\b|punjab national bank|canara bank|union bank of india|bank of baroda|bank of india|indian overseas bank|\brbi\b|reserve bank|nabard|sidbi|jan dhan|mudra loan|dfs\b)\b/i, subject: "public sector banking", weight: 4, tier: "authority", department: "Department of Financial Services" },
  { test: /\b(\blic\b|life insurance corporation|\birdai\b|\bsebi\b|securities and exchange board|\bnse\b|\bbse\b|\bepfo grievance\b|\bpfrda\b|national pension system|\bnps\b)\b/i, subject: "financial regulator / LIC", weight: 5, tier: "authority", department: "Ministry of Finance (regulator or Central PSU concerned)" },
  { test: /\b(neet|\bjee\b|cuet|\bnta\b|ugc net|\bupsc\b|union public service commission|\bssc\b cgl|staff selection commission|\bibps\b|\brrb\b exam|civil services exam)\b/i, subject: "national exam / Central recruitment", weight: 5, tier: "authority", department: "National Testing Agency / UPSC / SSC as applicable" },
  { test: /\b(cbse|kendriya vidyalaya|navodaya|central board of secondary|\bcisce\b|\bicse\b|central university|\bugc\b|\baicte\b|\bnit\b|\biit\b|\biim\b|\bnios\b)\b/i, subject: "CBSE / central educational institution", weight: 5, tier: "authority", department: "Ministry of Education (institution or board concerned)" },
  { test: /\b(aiims|ayushman|pmjay|cghs|esic|jipmer|\bicmr\b|\bnmc\b medical council|pgimer)\b/i, subject: "central health scheme or institution", weight: 5, tier: "authority", department: "Ministry of Health & Family Welfare" },
  { test: /\b(lpg|ujjwala|gas cylinder|gas agency|iocl|indian oil|hpcl|bpcl|gail|ongc|petrol pump dealer)\b/i, subject: "LPG / petroleum", weight: 4, tier: "authority", department: "Ministry of Petroleum & Natural Gas" },
  { test: /\b(india post|post office|speed post|registered post|postal department|postal life insurance|डाक विभाग)\b/i, subject: "postal services", weight: 4, tier: "authority", department: "Department of Posts" },
  { test: /\b(election commission of india|\beci\b|\bevm\b|voter id|\bepic\b|electoral roll|form 6)\b/i, subject: "elections", weight: 4, tier: "authority", department: "Election Commission of India" },
  { test: /\b(airports? authority|\baai\b|dgca|air india|indigo refund|civil aviation|\bbcas\b)\b/i, subject: "civil aviation", weight: 4, tier: "authority", department: "Ministry of Civil Aviation" },
  { test: /\b(defence|army|navy|air force|drdo|isro|ordnance|sainik|ex-?servicemen|cantonment board|\bncc\b)\b/i, subject: "defence / space", weight: 4, tier: "authority", department: "Ministry of Defence" },
  { test: /\b(\bcbi\b|central bureau of investigation|\bnia\b|\bed\b enforcement directorate|enforcement directorate|\bcvc\b|central vigilance|\bcrpf\b|\bbsf\b|\bcisf\b|\bitbp\b|central armed police)\b/i, subject: "Central investigating or armed force", weight: 5, tier: "authority", department: "Ministry of Home Affairs (organisation concerned)" },
  { test: /\b(bsnl|mtnl|telecom|trai|spectrum|mobile tower clearance|\bdot\b licence)\b/i, subject: "telecom", weight: 4, tier: "authority", department: "Department of Telecommunications" },
  { test: /\b(cpwd|central public works)\b/i, subject: "CPWD work", weight: 5, tier: "authority", department: "Central Public Works Department" },
  { test: /\b(\bntpc\b|\bpgcil\b|power grid corporation|\bnhpc\b|\bsail\b|\bbhel\b|\bcoal india\b|\bhal\b|\bbel\b|central public sector|central psu)\b/i, subject: "Central public sector undertaking", weight: 4, tier: "authority", department: "The Central PSU concerned" },
  /**
   * The words for the level itself. A citizen who says "this is a central
   * government matter" has told us the level directly.
   *
   * Note the deliberate absence of a bare "centre": "primary health centre"
   * is a State PHC, and matching it here would flip a village clinic into a
   * Union ministry.
   */
  { test: /\b(central government|central govt|centre government|the union government|union ministry|ministry of|department of (?:posts|telecom|revenue|expenditure|personnel)|govt of india|government of india|केंद्र सरकार|भारत सरकार|కేంద్ర ప్రభుత్వ|மத்திய அரசு|ಕೇಂದ್ರ ಸರ್ಕಾರ|കേന്ദ്ര സർക്കാർ|কেন্দ্রীয় সরকার|કેન્દ્ર સરકાર|ਕੇਂਦਰ ਸਰਕਾਰ|କେନ୍ଦ୍ର ସରକାର|مرکزی حکومت)\b/i, subject: "a Central government matter the citizen named", weight: 5, tier: "authority" },
  /**
   * Centrally sponsored schemes name a Central nodal ministry but are
   * executed by State agencies — framing, not an authority, so a civic
   * subject on the other side still wins.
   */
  { test: /\b(mgnrega|nrega|pm awas|pmay|pm kisan|jal jeevan mission|swachh bharat mission|smart city mission|amrut)\b/i, subject: "centrally sponsored scheme", weight: 3, tier: "weak", department: "Central nodal ministry (scheme funds are routed through the State)" },
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
  /**
   * True when the citizen named the records holder outright — "NHAI", "EPFO",
   * "GVMC", "nagar nigam", "this is a central government matter". The level is
   * then settled by that name, and callers may state it as a fact rather than
   * as an inference.
   */
  namedAuthority: boolean;
  /**
   * Set when the other level was also mentioned — an NHAI complaint that also
   * describes a colony drain. The level is decided by the named authority; this
   * records what else was heard so the agent can say why.
   */
  alsoMentioned: string | null;
}

const CENTRAL_CHANNEL = "RTI Online Central portal (rtionline.gov.in)";

/** Authority beats subject beats framing, regardless of weight. */
const TIER_RANK: Record<SignalTier, number> = { authority: 2, subject: 1, weak: 0 };

interface Hits {
  /** Score of the `authority` tier alone — a named records holder. */
  authority: number;
  /** Score of the `subject` and `weak` tiers, for when nobody was named. */
  implied: number;
  /** Highest-ranking signal overall: authority first, then weight. */
  top: Signal | null;
  /** Highest-ranking signal within the `authority` tier. */
  topAuthority: Signal | null;
  subjects: string[];
}

function stronger(a: Signal | null, b: Signal): boolean {
  if (!a) return true;
  const rank = TIER_RANK[b.tier] - TIER_RANK[a.tier];
  return rank > 0 || (rank === 0 && b.weight > a.weight);
}

function hit(text: string, signals: Signal[]): Hits {
  let authority = 0;
  let implied = 0;
  let top: Signal | null = null;
  let topAuthority: Signal | null = null;
  const subjects: string[] = [];
  for (const signal of signals) {
    if (!signal.test.test(text)) continue;
    if (signal.tier === "authority") {
      authority += signal.weight;
      if (stronger(topAuthority, signal)) topAuthority = signal;
    } else {
      implied += signal.weight;
    }
    subjects.push(signal.subject);
    if (stronger(top, signal)) top = signal;
  }
  return { authority, implied, top, topAuthority, subjects };
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
 * 1. A named records holder settles it. "NHAI", "EPFO", "GVMC",
 *    "nagar nigam", "this is a central government matter" — naming the
 *    body outranks any number of subject words on the other side, so an
 *    NHAI complaint that also mentions a colony drain is still NHAI.
 * 2. With nobody named, the subject decides: a drain, a street light, or
 *    a property tax bill is local; a passport or a PF claim is Central.
 * 3. Framing alone ("the road in my area") is the weakest evidence and
 *    only decides when it is the only evidence there is.
 * 4. A city or State name with a civic subject is enough to flag.
 * 5. Nothing recognisable stays "unclear" — we never guess.
 */
export function classifyJurisdiction(text: string): JurisdictionVerdict {
  const raw = (text ?? "").trim();
  const localBody = findLocalBody(raw);
  const stateName = findStateName(raw) ?? localBody?.state ?? null;
  const sharedScheme = SHARED_SCHEME.test(raw);

  const central = hit(raw, CENTRAL_SIGNALS);
  const state = hit(raw, STATE_SIGNALS);

  /*
   * A scheme name on its own is not a Central subject: MGNREGA and PMAY works
   * are executed by State agencies. Only a genuinely named Central authority
   * lifts a scheme complaint to the Central level.
   */
  const centralImplied = sharedScheme && central.authority === 0 ? 0 : central.implied;

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
    namedAuthority: false,
    alsoMentioned: null,
  };

  if (raw.length < 4) return empty;

  /*
   * Which side did the citizen actually name? An authority-tier hit is a
   * statement about the records holder, so it is compared only against the
   * other side's authority tier — never against a pile of subject words.
   */
  const named = central.authority > 0 || state.authority > 0;
  const centralScore = named ? central.authority : centralImplied;
  const stateScore = named ? state.authority : state.implied;

  // 1. Central: the named Central authority wins, or the subject does.
  if (centralScore > 0 && centralScore >= stateScore) {
    const decisive = central.topAuthority ?? central.top;
    const reasons: string[] = [];
    const byName = central.authority > 0;
    if (decisive?.subject) {
      reasons.push(
        byName
          ? `You named ${decisive.subject}, which is a Central public authority — so this is a Central matter.`
          : `Mentions ${decisive.subject}, which a Central public authority handles.`,
      );
    }
    // The most common misfire: civic words in an account that is Central.
    const otherSide = state.top?.subject ?? null;
    if (byName && otherSide) {
      reasons.push(
        `${capitalise(otherSide)} was mentioned too, but the authority you named holds these records, so this is not a municipal or State matter.`,
      );
    }
    if (localBody) reasons.push(`${localBody.city} is where you are, not who holds the records.`);
    if (sharedScheme) reasons.push("The scheme is centrally funded: the Central nodal ministry holds the sanction and fund-release records.");
    return {
      level: "central",
      confidence: Math.min(0.95, (byName ? 0.7 : 0.55) + centralScore / 14),
      stateName,
      localBody,
      recommendedBody: decisive?.department ?? null,
      filingChannel: CENTRAL_CHANNEL,
      subject: decisive?.subject ?? null,
      reasons,
      outsideCentralPortal: false,
      sharedScheme,
      namedAuthority: byName,
      alsoMentioned: byName ? otherSide : null,
    };
  }

  // 2. State / local-body.
  if (stateScore > 0) {
    const decisive = state.topAuthority ?? state.top;
    const byName = state.authority > 0;
    const reasons: string[] = [];
    /*
     * Whether the city's municipal corporation is the right records holder
     * depends on the subject. A ward road, drain, or street light is
     * municipal. A State highway, land record, DISCOM supply, or RTO file
     * belongs to a State department even when the citizen names their city.
     */
    const municipal = !decisive?.stateLevel;
    const holder = municipal
      ? localBody?.name ?? decisive?.department ?? null
      : decisive?.department ?? localBody?.name ?? null;
    const government = stateName ? `Government of ${stateName}` : "your State government";
    if (decisive?.subject) reasons.push(`${capitalise(decisive.subject)} is handled by the State government or the local body, not the Central government.`);
    if (municipal && localBody) reasons.push(`For ${localBody.city}, that is ${localBody.name}.`);
    else if (stateName) reasons.push(`The records would sit with ${government}.`);
    reasons.push("RTI Online only accepts applications for Central public authorities, so this cannot be filed there.");
    if (sharedScheme) reasons.push("The scheme is centrally funded, so the Central nodal ministry may hold sanction and release records — the execution records stay with the State.");
    return {
      level: "state",
      confidence: Math.min(0.95, (byName ? 0.65 : 0.5) + stateScore / 14 + (localBody ? 0.15 : 0)),
      stateName,
      localBody: municipal ? localBody : null,
      recommendedBody: holder,
      filingChannel: municipal && localBody
        ? `${localBody.short} Public Information Officer${stateName ? ` (${stateName} State RTI channel)` : ""}`
        : stateName
          ? `${stateName} State RTI channel`
          : "your State RTI channel",
      subject: decisive?.subject ?? null,
      reasons,
      outsideCentralPortal: true,
      sharedScheme,
      namedAuthority: byName,
      alsoMentioned: byName ? central.top?.subject ?? null : null,
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
      namedAuthority: false,
      alsoMentioned: null,
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

/**
 * The other direction, and the one that was going wrong: the citizen named a
 * Central authority and must not be told their matter is municipal. Spoken
 * only when there was something to be confused by — civic words in the same
 * account — so a plain Central complaint is not lectured at.
 */
export function spokenCentralConfirmation(verdict: JurisdictionVerdict): string {
  if (verdict.level !== "central" || !verdict.namedAuthority) return "";
  const body = verdict.recommendedBody ?? "the Central public authority you named";
  const aside = verdict.alsoMentioned
    ? ` Local civic work is handled elsewhere, but these particular records sit with ${body}.`
    : "";
  return `This is a Central government matter — ${body} holds these records, so it can be filed on the Central RTI portal.${aside}`;
}

/** Compact line for the notes/handoff, and for the PDF cover. */
export function jurisdictionSummary(verdict: JurisdictionVerdict): string {
  if (verdict.level === "state") {
    const body = verdict.localBody?.name ?? verdict.recommendedBody ?? "State government";
    return `State/local-body matter — records holder: ${body}. Not accepted on the Central RTI Online portal.`;
  }
  if (verdict.level === "central") {
    const holder = verdict.recommendedBody
      ? ` — ${verdict.namedAuthority ? "" : "likely "}${verdict.recommendedBody}`
      : "";
    return `Central public authority matter${holder}.`;
  }
  return "Jurisdiction not yet determined from the citizen's description.";
}
