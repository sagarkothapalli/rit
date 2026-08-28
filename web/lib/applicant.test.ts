import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  emptyApplicant,
  lookupPincode,
  STATES,
  validateApplicant,
} from "./applicant";

describe("lookupPincode", () => {
  it("resolves the Andhra Pradesh pincode 530051 as Urban", () => {
    const result = lookupPincode("530051");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Andhra Pradesh");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves rural Andhra Pradesh pincode 531023 as Rural", () => {
    const result = lookupPincode("531023");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Andhra Pradesh");
    expect(result?.areaStatus).toBe("Rural");
  });

  it("resolves Delhi pincodes as Urban", () => {
    const result = lookupPincode("110001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Delhi");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Chandigarh pincodes as Urban", () => {
    const result = lookupPincode("160017");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Chandigarh");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Ladakh pincode 194101", () => {
    const result = lookupPincode("194101");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Ladakh");
  });

  it("resolves Lakshadweep pincode 682555", () => {
    const result = lookupPincode("682555");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Lakshadweep");
  });

  it("resolves Dadra and Nagar Haveli and Daman and Diu pincodes", () => {
    const result = lookupPincode("396210");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Dadra and Nagar Haveli and Daman and Diu");
  });

  it("resolves Goa pincode 403001", () => {
    const result = lookupPincode("403001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Goa");
  });

  it("resolves Uttarakhand pincodes (Dehradun 248001)", () => {
    const result = lookupPincode("248001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Uttarakhand");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Jharkhand pincodes (Ranchi 834001)", () => {
    const result = lookupPincode("834001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Jharkhand");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Karnataka pincode 560001 (Bengaluru Urban)", () => {
    const result = lookupPincode("560001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Karnataka");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Maharashtra pincode 400001 (Mumbai Urban)", () => {
    const result = lookupPincode("400001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Maharashtra");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Telangana pincode 500001 (Hyderabad Urban)", () => {
    const result = lookupPincode("500001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Telangana");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Tamil Nadu pincode 600001 (Chennai Urban)", () => {
    const result = lookupPincode("600001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Tamil Nadu");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves West Bengal pincode 700001 (Kolkata Urban)", () => {
    const result = lookupPincode("700001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("West Bengal");
    expect(result?.areaStatus).toBe("Urban");
  });

  it("resolves Sikkim pincode 737101", () => {
    const result = lookupPincode("737101");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Sikkim");
  });

  it("resolves Andaman and Nicobar Islands pincode 744101", () => {
    const result = lookupPincode("744101");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Andaman and Nicobar Islands");
  });

  it("resolves Puducherry pincode 605001", () => {
    const result = lookupPincode("605001");
    expect(result).not.toBeNull();
    expect(result?.state).toBe("Puducherry");
  });

  it("handles non-digit formatting and invalid inputs", () => {
    expect(lookupPincode("530-051")).toEqual({ state: "Andhra Pradesh", areaStatus: "Urban" });
    expect(lookupPincode("")).toBeNull();
    expect(lookupPincode("123")).toBeNull();
    expect(lookupPincode("012345")).toBeNull();
  });

  it("all resolved states exist in the official STATES list", () => {
    const samplePins = [
      "110001", "121001", "141001", "160017", "171001", "180001", "194101",
      "226001", "248001", "302001", "380001", "396210", "400001", "403001",
      "462001", "492001", "500001", "530051", "560001", "600001", "605001",
      "682555", "695001", "700001", "737101", "744101", "751001", "781001",
      "790001", "793001", "795001", "796001", "797001", "799001", "800001",
      "834001",
    ];
    for (const pin of samplePins) {
      const res = lookupPincode(pin);
      expect(res).not.toBeNull();
      expect(STATES).toContain(res?.state);
    }
  });
});

describe("applicant country defaults and options", () => {
  it("defaults to India in emptyApplicant", () => {
    const applicant = emptyApplicant();
    expect(applicant.country).toBe("India");
  });

  it("contains India as the first entry and includes other countries", () => {
    expect(COUNTRIES[0]).toBe("India");
    expect(COUNTRIES.length).toBeGreaterThan(100);
    expect(COUNTRIES).toContain("United States");
    expect(COUNTRIES).toContain("United Kingdom");
    expect(COUNTRIES).toContain("United Arab Emirates");
    expect(COUNTRIES).toContain("Canada");
    expect(COUNTRIES).toContain("Australia");
  });
});
