// src/app/api/chapters/route.ts
import { NextResponse } from "next/server";
// import OpenAI from "openai"; // uncomment when wiring real OCR/LLM

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

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

  // TODO: Use OpenAI Vision to extract vocab + grammar from images.
  // For now, we return a mocked chapter with a few sample vocab items.

  // Example of where you'd plug in OpenAI:
  // const base64Images = await Promise.all(
  //   images.map(async (file) => {
  //     const arrayBuffer = await file.arrayBuffer();
  //     const buffer = Buffer.from(arrayBuffer);
  //     return `data:${file.type};base64,${buffer.toString("base64")}`;
  //   })
  // );
  //
  // const response = await client.responses.create({
  //   model: "gpt-4.1-mini",
  //   input: [
  //     {
  //       role: "user",
  //       content: [
  //         {
  //           type: "input_text",
  //           text: "Lies diese lateinischen Seiten und extrahiere eine Vokabelliste (Latein–Deutsch) und kurze Grammatiknotizen im JSON-Format.",
  //         },
  //         ...base64Images.map((img) => ({
  //           type: "input_image",
  //           image_url: { url: img },
  //         })),
  //       ],
  //     },
  //   ],
  // });

  // For the MVP skeleton, just mock:
  const mockChapter = {
    id: `${Date.now()}`,
    name,
    vocab: [
      { latin: "amicus", german: "Freund" },
      { latin: "puella", german: "Mädchen" },
      { latin: "schola", german: "Schule" },
    ],
    grammarNotes: [
      "Substantive der a- und o-Deklination.",
      "Nominativ und Akkusativ Singular/Plural.",
    ],
  };

  return NextResponse.json({ chapter: mockChapter });
}
