// src/app/api/verify-pin/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.pin !== "string") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { pin } = body;
  const expected = process.env.PARENTAL_PIN;

  if (!expected) {
    console.error("PARENTAL_PIN is not set");
    return NextResponse.json(
      { error: "Server ist nicht korrekt konfiguriert." },
      { status: 500 }
    );
  }

  if (pin !== expected) {
    return NextResponse.json(
      { success: false, error: "Falsche PIN." },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
