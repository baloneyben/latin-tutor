// src/app/api/tutor/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Ungültige Anfrage an den Tutor." },
        { status: 400 }
      );
    }

    const { question, chapterName } = body as {
      question: string;
      chapterName?: string;
    };

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json(
        { error: "Der Tutor ist aktuell nicht richtig konfiguriert." },
        { status: 500 }
      );
    }

    const systemPrompt = `
Du bist ein geduldiger Latein-Nachhilfelehrer für Schüler an einem deutschen Gymnasium.

Deine Aufgaben:
- Beantworte alle Fragen zu Latein, z.B. Vokabeln, Grammatik, Übersetzungen, Beispielsätze.
- Erkläre auf Deutsch, verwende klare, altersgerechte Sprache.
- Du darfst Beispiele aus der allgemeinen lateinischen Grammatik verwenden, nicht nur aus einem einzelnen Kapitel.
- Wenn ein Kapitelname angegeben ist, kannst du dich gern darauf beziehen (z.B. "In diesem Kapitel lernst du...").

Einschränkung:
- Nur wenn die Frage gar nichts mit Latein zu tun hat (z.B. Minecraft, Fußballergebnisse, Politik, Mathe-Hausaufgaben usw.),
  antworte freundlich:

  "Ich kann dir nur bei Latein helfen – bitte stell mir eine Frage zu Latein, Vokabeln oder Grammatik."

Antworte immer vollständig in Deutsch (mit lateinischen Beispielen, wo nötig).
    `.trim();

    const userContent = [
      chapterName
        ? `Kapitel: ${chapterName}`
        : "Kein spezielles Kapitel angegeben.",
      `Frage der Schülerin: ${question}`,
    ].join("\n\n");

    const completion = await openai.chat.completions.create({
      // if/when you switch, this is where you'd use "gpt-5-mini"
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
    });

    const answer = completion.choices[0].message.content ?? "";

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("Tutor-Fehler:", err);
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unbekannter Fehler im Tutor.";

    return NextResponse.json(
      {
        error:
          "Es ist ein technischer Fehler im Tutor aufgetreten: " + message,
      },
      { status: 500 }
    );
  }
}
