// src/app/api/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.APP_ACCESS_PASSWORD;

  if (!expected) {
    console.error("APP_ACCESS_PASSWORD is not set");
    return NextResponse.json(
      { error: "Server ist nicht korrekt konfiguriert." },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { error: "Falsches Passwort." },
      { status: 401 }
    );
  }

  // Return a simple success flag; we'll store access on the client
  return NextResponse.json({ success: true });
}
