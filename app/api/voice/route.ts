import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_CATEGORIES = [
  "Market", "Fatura", "Yemek", "Akaryakıt", "Ulaşım", "Eğlence", "Sağlık", "Kişisel Bakım", "Abonelik", "Diğer"
];

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API anahtarı yapılandırılmamış." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "Ses dosyası bulunamadı." }, { status: 400 });
    }

    // 1. Transcription (Whisper) with one retry
    let transcription;
    try {
      transcription = await transcribeWithRetry(audioFile);
    } catch (err: any) {
      console.error("Whisper Error:", err);
      return NextResponse.json({ error: "Ses algılanamadı veya OpenAI servisine ulaşılamadı." }, { status: 500 });
    }

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json({ error: "Ses algılanamadı." }, { status: 400 });
    }

    // 2. Parsing (GPT-4o-mini)
    const systemPrompt = `
      Sen bir finansal asistanasın. Kullanıcının söylediği Türkçe cümleyi analiz et ve sadece JSON formatında döndür.

      OUTPUT FORMAT:
      {
        "type": "income" | "expense",
        "amount": number,
        "category": string,
        "description": string
      }

      RULES:
      1. TYPE INFERENCE:
         - INCOME keywords: "gelir", "kazanç", "aldım", "geldi", "ödeme aldım", "maaş", "artı", "+"
         - EXPENSE keywords: "gider", "harcama", "ödedim", "aldım (alışveriş/market)", "eksi", "-"
         - If category is clearly expense-related (Market, Fatura, Yemek, Akaryakıt, Ulaşım, Eğlence, Sağlık, Kişisel Bakım, Abonelik) -> expense
         - If NO category and only amount + location/route/name (e.g., "500 TL Bayrampaşa Şişli") -> income
         - Fallback: expense
      2. CATEGORY NORMALIZATION (Select from this list ONLY):
         [Market, Fatura, Yemek, Akaryakıt, Ulaşım, Eğlence, Sağlık, Kişisel Bakım, Abonelik, Diğer]
      3. DESCRIPTION:
         - Extract ALL meaningful words remaining after removing amount and category.
         - NEVER return empty description if extra words exist.
         - Keep it short but meaningful.
      4. AMOUNT:
         - Convert spoken Turkish numbers to numeric (e.g., "beş yüz" -> 500).
         - Remove currency words (TL, lira).
      5. STRICT MODE:
         - Output ONLY JSON. No explanation text.
         - amount must be > 0.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Ayrıştır: "${transcription}"` }
      ],
      response_format: { type: "json_object" }
    });

    const parsedData = JSON.parse(response.choices[0].message.content || "{}");

    // 3. Validation
    if (!parsedData.amount || parsedData.amount <= 0) {
      return NextResponse.json({ error: "Tutar algılanamadı." }, { status: 400 });
    }

    if (!parsedData.type || !["income", "expense"].includes(parsedData.type)) {
      parsedData.type = "expense";
    }

    // Force category to "Gelir" for income
    if (parsedData.type === "income") {
      parsedData.category = "Gelir";
    } else if (!ALLOWED_CATEGORIES.includes(parsedData.category)) {
      parsedData.category = "Diğer";
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Voice API Error:", error);
    if (error.status === 429) {
      return NextResponse.json({ error: "OpenAI kota sınırı aşıldı." }, { status: 429 });
    }
    return NextResponse.json({ error: "Sesli işlem şu anda kullanılamıyor." }, { status: 500 });
  }
}

async function transcribeWithRetry(audioBlob: Blob, retries = 1): Promise<string> {
  const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
  
  try {
    const result = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "tr"
    });
    return result.text;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying transcription... (${retries} left)`);
      return transcribeWithRetry(audioBlob, retries - 1);
    }
    throw error;
  }
}
