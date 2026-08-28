import { NextResponse } from "next/server";
import { publicFilingRules } from "@/lib/filing-rules/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rules: publicFilingRules(),
    note: "Portal limits can change. Each rule set carries a verification date and source.",
  });
}
