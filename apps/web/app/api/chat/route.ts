import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy chat endpoint has been retired. Use the authorized Company Brain API chat service.",
    },
    { status: 410 },
  );
}
