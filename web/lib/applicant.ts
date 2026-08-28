/* ============================================================
   Applicant identity — mirrors the field set the official RTI
   Online request form collects (rtionline.gov.in, verified
   against the live form on 2026-08-28).

   Deliberate omissions: the official form does NOT collect date
   of birth or age, so neither is asked here. Aadhaar/PAN are
   never collected — the portal's own guidelines forbid uploading
   them.
   ============================================================ */

export type Gender = "Male" | "Female" | "Transgender";
export type AreaStatus = "Rural" | "Urban";
export type EducationalStatus = "Literate" | "Illiterate";

export const COUNTRIES = [
  "India",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
  "Other",
] as const;

export type Country = (typeof COUNTRIES)[number] | string;

export interface BplDocumentAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  status: "idle" | "verifying" | "valid" | "flagged" | "error" | "unverified";
  documentType?: string;
  isForbiddenId?: boolean;
  flagReason?: string | null;
  confidence?: number;
  extractedDetails?: {
    cardNumber?: string;
    holderName?: string;
    category?: string;
    state?: string;
  };
}

export interface ApplicantDetails {
  name: string;
  gender: Gender;
  address: string;
  pincode: string;
  state: string;
  country: Country;
  areaStatus: AreaStatus;
  educationalStatus: EducationalStatus;
  phone: string;
  mobile: string;
  email: string;
  citizenship: "Indian";
  isBpl: boolean;
  bplDocument?: BplDocumentAttachment | null;
  bplCardNumber?: string;
  bplYearOfIssue?: string;
  bplIssuingAuthority?: string;
}

export const GENDERS: readonly Gender[] = ["Male", "Female", "Transgender"];
export const AREA_STATUSES: readonly AreaStatus[] = ["Rural", "Urban"];
export const EDUCATIONAL_STATUSES: readonly EducationalStatus[] = ["Literate", "Illiterate"];

export interface PincodeInfo {
  state: string;
  areaStatus: AreaStatus;
}

/**
 * Resolves an Indian 6-digit PIN code to its State or Union Territory and
 * determines its Area Status (Rural vs Urban).
 */
export function lookupPincode(pincode: string): PincodeInfo | null {
  const pin = pincode.replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6 || pin[0] === "0") return null;

  const p2 = parseInt(pin.slice(0, 2), 10);
  const p3 = parseInt(pin.slice(0, 3), 10);
  const p4 = parseInt(pin.slice(0, 4), 10);

  let state = "";

  // Specific Union Territories and State boundary exceptions (3-digit / 4-digit / exact matches)
  if (p3 === 194) {
    state = "Ladakh";
  } else if (p3 === 160) {
    state = "Chandigarh";
  } else if (p3 === 403) {
    state = "Goa";
  } else if (p3 === 737) {
    state = "Sikkim";
  } else if (p3 === 744) {
    state = "Andaman and Nicobar Islands";
  } else if (
    p3 === 605 ||
    p4 === 6096 || // Karaikal
    pin === "673310" ||
    pin === "673311" || // Mahe
    pin === "533464" // Yanam
  ) {
    state = "Puducherry";
  } else if (p4 === 6825) {
    state = "Lakshadweep";
  } else if (
    pin === "362220" ||
    pin === "396210" ||
    pin === "396215" ||
    pin === "396220" ||
    pin === "396230" ||
    pin === "396235" ||
    pin === "396240"
  ) {
    state = "Dadra and Nagar Haveli and Daman and Diu";
  } else if (p3 >= 790 && p3 <= 792) {
    state = "Arunachal Pradesh";
  } else if (p3 === 793 || p3 === 794) {
    state = "Meghalaya";
  } else if (p3 === 795) {
    state = "Manipur";
  } else if (p3 === 796) {
    state = "Mizoram";
  } else if (p3 === 797) {
    state = "Nagaland";
  } else if (p3 === 799) {
    state = "Tripura";
  } else if (
    p3 === 246 ||
    p3 === 248 ||
    p3 === 249 ||
    p3 === 263 ||
    p4 === 2625 ||
    p4 === 2447
  ) {
    state = "Uttarakhand";
  } else if (
    p3 === 814 ||
    p3 === 815 ||
    p3 === 816 ||
    (p3 >= 825 && p3 <= 829) ||
    (p3 >= 831 && p3 <= 835)
  ) {
    state = "Jharkhand";
  } else if (p2 === 11) {
    state = "Delhi";
  } else if (p2 === 12 || p2 === 13) {
    state = "Haryana";
  } else if (p2 === 14 || p2 === 15) {
    state = "Punjab";
  } else if (p2 === 17) {
    state = "Himachal Pradesh";
  } else if (p2 === 18 || p2 === 19) {
    state = "Jammu and Kashmir";
  } else if (p2 >= 20 && p2 <= 28) {
    state = "Uttar Pradesh";
  } else if (p2 >= 30 && p2 <= 34) {
    state = "Rajasthan";
  } else if (p2 >= 36 && p2 <= 39) {
    state = "Gujarat";
  } else if (p2 >= 40 && p2 <= 44) {
    state = "Maharashtra";
  } else if (p2 >= 45 && p2 <= 48) {
    state = "Madhya Pradesh";
  } else if (p2 === 49) {
    state = "Chhattisgarh";
  } else if (p2 === 50) {
    state = "Telangana";
  } else if (p2 >= 51 && p2 <= 53) {
    state = "Andhra Pradesh";
  } else if (p2 >= 56 && p2 <= 59) {
    state = "Karnataka";
  } else if (p2 >= 60 && p2 <= 64) {
    state = "Tamil Nadu";
  } else if (p2 >= 67 && p2 <= 69) {
    state = "Kerala";
  } else if (p2 >= 70 && p2 <= 74) {
    state = "West Bengal";
  } else if (p2 >= 75 && p2 <= 77) {
    state = "Odisha";
  } else if (p2 === 78) {
    state = "Assam";
  } else if (p2 >= 80 && p2 <= 85) {
    state = "Bihar";
  }

  if (!state) return null;

  // Rural vs Urban classification:
  // 1. Delhi & Chandigarh are wholly classified as Urban.
  // 2. Major metropolitan & municipal corporation clusters (tier-1 / tier-2 cities).
  // 3. Head Post Offices & District main sorting centres (3rd digit 0 with low ending index).
  let areaStatus: AreaStatus = "Rural";
  const last3 = parseInt(pin.slice(3), 10);
  const thirdDigit = parseInt(pin[2], 10);

  const isDelhiOrChandigarh = state === "Delhi" || state === "Chandigarh";
  const isMajorUrbanHub =
    (p3 === 400 && last3 <= 104) || // Mumbai
    (p3 === 700 && last3 <= 150) || // Kolkata
    (p3 === 600 && last3 <= 130) || // Chennai
    (p3 === 560 && last3 <= 110) || // Bengaluru
    (p3 === 500 && last3 <= 100) || // Hyderabad
    (p3 === 380 && last3 <= 65) || // Ahmedabad
    (p3 === 411 && last3 <= 65) || // Pune
    (p3 === 530 && last3 <= 60) || // Visakhapatnam (including 530051 Sujatha Nagar)
    (p3 === 302 && last3 <= 40) || // Jaipur
    (p3 === 226 && last3 <= 35) || // Lucknow
    (p3 === 208 && last3 <= 30) || // Kanpur
    (p3 === 201 && last3 >= 301 && last3 <= 318) || // Noida / Greater Noida
    (p3 === 122 && last3 <= 52) || // Gurugram
    (p3 === 121 && last3 <= 15) || // Faridabad
    (p3 === 452 && last3 <= 25) || // Indore
    (p3 === 462 && last3 <= 50) || // Bhopal
    (p3 === 440 && last3 <= 40) || // Nagpur
    (p3 === 395 && last3 <= 30) || // Surat
    (p3 === 390 && last3 <= 30) || // Vadodara
    (p3 === 800 && last3 <= 30) || // Patna
    (p3 === 834 && last3 <= 15) || // Ranchi
    (p3 === 751 && last3 <= 30) || // Bhubaneswar
    (p3 === 781 && last3 <= 40) || // Guwahati
    (p3 === 641 && last3 <= 50) || // Coimbatore
    (p3 === 625 && last3 <= 25) || // Madurai
    (p3 === 695 && last3 <= 45) || // Thiruvananthapuram
    (p3 === 682 && last3 <= 45) || // Kochi / Ernakulam
    (p3 === 520 && last3 <= 20) || // Vijayawada
    (p3 === 522 && last3 <= 10) || // Guntur
    (p3 === 180 && last3 <= 20) || // Jammu
    (p3 === 190 && last3 <= 25) || // Srinagar
    (p3 === 141 && last3 <= 20) || // Ludhiana
    (p3 === 143 && last3 <= 10) || // Amritsar
    (p3 === 144 && last3 <= 30) || // Jalandhar
    (p3 === 248 && last3 <= 15) || // Dehradun
    (p3 === 403 && (last3 <= 10 || (last3 >= 601 && last3 <= 605))); // Panaji / Margao

  const isDistrictHeadquarter = thirdDigit === 0 && last3 <= 20;

  if (isDelhiOrChandigarh || isMajorUrbanHub || isDistrictHeadquarter) {
    areaStatus = "Urban";
  }

  return { state, areaStatus };
}

/** States and Union Territories, as listed on the official request form. */
export const STATES: readonly string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function emptyApplicant(): ApplicantDetails {
  return {
    name: "",
    gender: "Male",
    address: "",
    pincode: "",
    state: "",
    country: "India",
    areaStatus: "Urban",
    educationalStatus: "Literate",
    phone: "",
    mobile: "",
    email: "",
    citizenship: "Indian",
    isBpl: false,
    bplDocument: null,
    bplCardNumber: "",
    bplYearOfIssue: "",
    bplIssuingAuthority: "",
  };
}

export interface FieldProblem {
  field: keyof ApplicantDetails;
  message: string;
}

/**
 * Mirrors the mandatory-field rules of the official form. Returns every
 * problem at once so the citizen fixes the whole form in one pass instead
 * of being told about one field at a time.
 */
export function validateApplicant(
  applicant: ApplicantDetails,
  options?: { mobileRequired?: boolean },
): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const add = (field: keyof ApplicantDetails, message: string) => problems.push({ field, message });
  const mobileRequired = options?.mobileRequired ?? true;

  if (applicant.name.trim().length < 2) add("name", "Enter the applicant's full name.");
  if (applicant.address.trim().length < 5) add("address", "Enter the postal address for the reply.");
  if (!applicant.state.trim()) add("state", "Select the State or Union Territory.");
  if (!/^\S+@\S+\.\S+$/.test(applicant.email.trim())) add("email", "Enter a valid email address.");
  const mobile = applicant.mobile.replace(/\D/g, "");
  if (mobileRequired && !/^[0-9]{10}$/.test(mobile)) {
    add("mobile", "Enter a 10-digit mobile number. The portal uses it for SMS alerts.");
  } else if (mobile && !/^[0-9]{10}$/.test(mobile)) {
    add("mobile", "Enter a 10-digit mobile number, or leave it blank.");
  }
  if (applicant.pincode.trim() && !/^[1-9][0-9]{5}$/.test(applicant.pincode.trim())) {
    add("pincode", "A PIN code is six digits and cannot start with zero.");
  }
  if (applicant.phone.trim() && !/^[0-9+\-\s]{6,20}$/.test(applicant.phone.trim())) {
    add("phone", "Enter a valid landline number, or leave it blank.");
  }
  if (applicant.isBpl) {
    if (!applicant.bplDocument) {
      add("bplDocument", "Upload a copy of your BPL certificate or card to claim the fee exemption.");
    } else if (applicant.bplDocument.status === "flagged") {
      add(
        "bplDocument",
        applicant.bplDocument.flagReason
          || "The uploaded document was flagged as invalid. Upload a valid BPL certificate or ration card.",
      );
    } else if (applicant.bplDocument.status === "verifying") {
      add("bplDocument", "Document verification is still in progress. Please wait for the AI check to complete.");
    } else if (applicant.bplDocument.status === "error") {
      add("bplDocument", "Document verification failed. Please try re-uploading your file.");
    }
  }
  return problems;
}

/** Field-level lookup for rendering inline errors. */
export function problemFor(problems: FieldProblem[], field: keyof ApplicantDetails): string | null {
  return problems.find((problem) => problem.field === field)?.message ?? null;
}
