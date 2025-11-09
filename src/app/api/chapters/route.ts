// src/app/api/chapters/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type VocabItem = {
  latin: string;
  german: string;
};

type Chapter = {
  id: string;
  name: string;
  vocab: VocabItem[];
  grammarNotes: string[];
};

async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mime = file.type || "image/jpeg";
  return { base64, mime };
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const name = formData.get("name") as string | null;
  const images = formData.getAll("images") as File[];

  if (!name || images.length === 0) {
    return NextResponse.json(
      { error: "Kapitelname und mindestens ein Bild sind erforderlich." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set");
    return NextResponse.json(
      { error: "Server ist nicht korrekt konfiguriert." },
      { status: 500 },
    );
  }

  try {
    // Convert images to base64 data URLs
    const imagePayloads = await Promise.all(
      images.map(async (img) => {
        const { base64, mime } = await fileToBase64(img);
        return {
          type: "image_url" as const,
          image_url: {
            url: `data:${mime};base64,${base64}`,
          },
        };
      }),
    );

    const systemPrompt = `
Du bist ein hilfsbereiter Latein-Nachhilfelehrer für Schüler an einem deutschen Gymnasium.

Du erhältst Fotos von Seiten aus einem Lateinbuch (Vokabel- und Grammatik-Abschnitte). 
Deine Aufgabe:

1. Erkenne alle klar lesbaren Vokabeln mit Übersetzung (Latein → Deutsch).
2. Erkenne die wichtigsten Grammatikpunkte, die auf den Seiten erklärt werden.

Gib **ausschließlich** ein JSON-Objekt mit folgendem Format zurück:

{
  "vocab": [
    { "latin": "amicus", "german": "Freund" },
    ...
  ],
  "grammarNotes": [
    "Kurzer deutscher Satz zur Grammatikregel 1.",
    "Kurzer deutscher Satz zur Grammatikregel 2."
  ]
}

- Schreibe die Grammatiknotizen als kurze, verständliche Sätze auf Deutsch.
- Nimm nur Inhalte auf, die eindeutig im Bild stehen oder sich daraus sicher schließen lassen.
- Keine zusätzlichen Erklärungen, kein Fließtext außerhalb dieses JSON-Objekts.
    `.trim();

    const userText = `
Hier sind Fotos eines Kapitels (Vokabeln und Grammatik) aus einem Lateinbuch.
Bitte extrahiere Vokabeln (Latein → Deutsch) und Grammatikpunkte wie beschrieben.
    `.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...imagePayloads,
          ],
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Keine Antwort vom Modell erhalten.");
    }

    // content is expected to be a JSON string or contain JSON
    let parsed: { vocab?: VocabItem[]; grammarNotes?: string[] } = {
      vocab: [],
      grammarNotes: [],
    };

    try {
      // Try direct JSON parse
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from text if the model wrapped it in extra text
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Antwort konnte nicht als JSON gelesen werden.");
      }
    }

    const chapter: Chapter = {
      id: `${Date.now()}`,
      name,
      vocab: parsed.vocab ?? [],
      grammarNotes: parsed.grammarNotes ?? [],
    };

    return NextResponse.json({ chapter });
  } catch (error: any) {
    console.error("Fehler bei der Kapitelverarbeitung:", error);
    return NextResponse.json(
      {
        error:
          "Die Seiten konnten nicht verarbeitet werden. Bitte versuche es mit klaren Fotos noch einmal.",
      },
      { status: 500 },
    );
  }
}
