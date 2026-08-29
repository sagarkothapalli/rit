import { NextResponse } from "next/server";
import {
  BplVerificationRequest,
  BplVerificationSchema,
  bplVerificationFallback,
  type GateResult,
} from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { bplVerifyPrompt } from "@/lib/cage/prompts";
import { modelGuard } from "@/lib/cage/ratelimit";
import { GoogleGenAI } from "@google/genai";
import { getRuntimeModelConfig } from "@/lib/cage/config";

export const dynamic = "force-dynamic";

async function resolveGeminiKey(): Promise<string | null> {
  const dedicated = process.env.GEMINI_LIVE_API_KEY?.trim();
  if (dedicated) return dedicated;
  try {
    const { cfg } = await getRuntimeModelConfig();
    if (cfg?.apiKey?.trim() && (cfg.baseUrl.includes("googleapis.com") || cfg.fast.startsWith("gemini"))) {
      return cfg.apiKey.trim();
    }
  } catch {
    // Store unreachable
  }
  const key = process.env.LLM_API_KEY?.trim();
  if (key && (process.env.LLM_BASE_URL?.includes("googleapis.com") || process.env.LLM_MODEL_FAST?.startsWith("gemini"))) {
    return key;
  }
  return null;
}

export async function POST(req: Request) {
  const blocked = modelGuard(req, "verify-bpl", 20, 60_000);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const parsed = BplVerificationRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { fileName, fileType, fileSize, fileBase64 } = parsed.data;

  // 1. Run deterministic rule screening first
  const deterministic = bplVerificationFallback(fileName);

  // If deterministic screening definitively flags forbidden document by filename, respect it immediately
  if (deterministic.is_forbidden_id) {
    const result: GateResult<typeof deterministic> = {
      mode: "SIMULATED",
      data: deterministic,
    };
    return NextResponse.json(result);
  }

  // 2. Try Gemini multimodal vision directly if base64 data and Gemini key are present
  const geminiKey = await resolveGeminiKey();
  if (geminiKey && fileBase64 && (fileType.startsWith("image/") || fileType === "application/pdf")) {
    try {
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `You are a document verification AI for Indian Right to Information (RTI) application filing under RTI Act 2005.
TASK: Inspect this attached document and verify if it is a valid Below Poverty Line (BPL) proof (BPL Certificate, Antyodaya/BPL Ration Card, NFSA Priority Household Card) or if it is a forbidden/wrong document (such as Aadhaar Card, PAN Card, Passport, Driving License, Voter ID, electricity bill, selfie, or random document).
STRICT RTI RULE: The RTI Online portal explicitly forbids personal identity proofs like Aadhaar and PAN cards.
Return JSON ONLY matching this exact schema:
{
  "verdict": "VALID_BPL" | "FLAGGED_WRONG_DOCUMENT" | "UNCLEAR",
  "document_type": string,
  "is_bpl_proof": boolean,
  "is_forbidden_id": boolean,
  "reason_summary": string,
  "confidence": number,
  "extracted_details": {
    "card_number": string | null,
    "holder_name": string | null,
    "category": string | null,
    "state": string | null
  }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: fileType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim();
      if (text) {
        const rawJson = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
        const validated = BplVerificationSchema.parse(rawJson);
        const result: GateResult<typeof validated> = {
          mode: "LIVE",
          model: "gemini-2.5-flash",
          data: validated,
        };
        return NextResponse.json(result);
      }
    } catch {
      // Vision model fallback to text LLM / deterministic screening
    }
  }

  // 3. Try OpenAI-compatible configured LLM
  const cfg = await getModelConfig();
  if (cfg) {
    const shape = `{
  "verdict": "VALID_BPL" | "FLAGGED_WRONG_DOCUMENT" | "UNCLEAR",
  "document_type": string,
  "is_bpl_proof": boolean,
  "is_forbidden_id": boolean,
  "reason_summary": string,
  "confidence": number,
  "extracted_details": {
    "card_number": string | null,
    "holder_name": string | null,
    "category": string | null,
    "state": string | null
  }
}`;
    const docMeta = `File name: ${fileName}\nFile type: ${fileType}\nFile size: ${fileSize} bytes`;
    const { system, user } = bplVerifyPrompt(docMeta, shape);
    const res = await callModelJSON(
      { cfg, model: cfg.fast, system, user, maxTokens: 400 },
      (x) => BplVerificationSchema.parse(x)
    );

    if (res.ok) {
      const result: GateResult<typeof res.data> = {
        mode: "LIVE",
        model: res.model,
        data: res.data,
      };
      return NextResponse.json(result);
    }
  }

  // 4. Return deterministic screening result
  const result: GateResult<typeof deterministic> = {
    mode: "SIMULATED",
    data: deterministic,
  };
  return NextResponse.json(result);
}
