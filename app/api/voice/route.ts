import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_CATEGORIES = [
  "Market", "Fatura", "Kira", "Yemek", "Akaryakıt", 
  "Ulaşım", "Eğlence", "Sağlık", "Kişisel Bakım", "Abonelik"
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
      Sen bir finansal asistanasın. Kullanıcının söylediği cümleyi analiz et ve şu formatta JSON döndür:
      {
        "type": "income" | "expense",
        "amount": number,
        "category": string,
        "description": string
      }

      Kurallar:
      1. Sadece geçerli JSON döndür. Başka metin ekleme.
      2. Miktarı sayıya dönüştür (örn: "beş yüz" -> 500).
      3. Kategoriyi şu listeden seç: [${ALLOWED_CATEGORIES.join(", ")}]. 
         Eğer uygun kategori yoksa mutlaka "Diğer" döndür.
      4. Description alanına harcamanın ne olduğunu kısa bir şekilde yaz.
      5. Eğer harcama/gelir tipi net değilse varsayılan olarak "expense" kullan.
      6. Eğer miktar tespit edilemezse "amount" değerini 0 döndür.
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

    if (!ALLOWED_CATEGORIES.includes(parsedData.category)) {
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
