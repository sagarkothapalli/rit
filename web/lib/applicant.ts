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
export type Country = "India" | "Other";

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
}

export const GENDERS: readonly Gender[] = ["Male", "Female", "Transgender"];
export const AREA_STATUSES: readonly AreaStatus[] = ["Rural", "Urban"];
export const EDUCATIONAL_STATUSES: readonly EducationalStatus[] = ["Literate", "Illiterate"];
export const COUNTRIES: readonly Country[] = ["India", "Other"];

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
export function validateApplicant(applicant: ApplicantDetails): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const add = (field: keyof ApplicantDetails, message: string) => problems.push({ field, message });

  if (applicant.name.trim().length < 2) add("name", "Enter the applicant's full name.");
  if (applicant.address.trim().length < 5) add("address", "Enter the postal address for the reply.");
  if (!applicant.state.trim()) add("state", "Select the State or Union Territory.");
  if (!/^\S+@\S+\.\S+$/.test(applicant.email.trim())) add("email", "Enter a valid email address.");
  if (!/^[0-9]{10}$/.test(applicant.mobile.replace(/\D/g, ""))) {
    add("mobile", "Enter a 10-digit mobile number. The portal uses it for SMS alerts.");
  }
  if (applicant.pincode.trim() && !/^[1-9][0-9]{5}$/.test(applicant.pincode.trim())) {
    add("pincode", "A PIN code is six digits and cannot start with zero.");
  }
  if (applicant.phone.trim() && !/^[0-9+\-\s]{6,20}$/.test(applicant.phone.trim())) {
    add("phone", "Enter a valid landline number, or leave it blank.");
  }
  return problems;
}

/** Field-level lookup for rendering inline errors. */
export function problemFor(problems: FieldProblem[], field: keyof ApplicantDetails): string | null {
  return problems.find((problem) => problem.field === field)?.message ?? null;
}
