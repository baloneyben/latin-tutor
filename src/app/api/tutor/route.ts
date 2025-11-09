// src/app/api/tutor/route.ts
import { NextResponse } from "next/server";
// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { chapterId, chapterName, question } = body as {
    chapterId: string;
    chapterName: string;
    question: string;
  };

  if (!chapterId || !question) {
    return NextResponse.json(
      { error: "chapterId und Frage sind erforderlich." },
      { status: 400 },
    );
  }

  // TODO: Load chapter vocab/grammar from storage to give as context.
  // In this skeleton we don't have persistent storage, so we just send a fixed prompt.

  const systemPrompt = `
Du bist ein geduldiger Latein-Nachhilfelehrer für Schülerinnen und Schüler.
Du darfst NUR Fragen zu lateinischer Grammatik und Vokabeln beantworten.
Wenn die Frage nichts mit Latein zu tun hat, antworte:
"Ich kann dir nur bei Latein helfen – bitte stelle mir eine Frage zu den Vokabeln oder zur Grammatik dieses Kapitels."
Antworte kurz und klar auf Deutsch und nutze Beispiele mit Latein + deutscher Übersetzung.
Kapitelname: ${chapterName}
`;

  // When wiring OpenAI, you'd do something like:
  //
  // const response = await client.responses.create({
  //   model: "gpt-4.1-mini",
  //   input: [
  //     { role: "system", content: systemPrompt },
  //     { role: "user", content: question },
  //   ],
  // });
  //
  // const answer = response.output[0].content[0].text; // shape may change – see docs

  // For now, simple canned answer:
  const answer =
    "Ich bin dein Latein-Tutor. In der echten Version antworte ich mit einer Erklärung zu Vokabeln oder Grammatik dieses Kapitels.";

  return NextResponse.json({ answer });
}
