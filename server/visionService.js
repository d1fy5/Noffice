// ============================================================
// NOFFICE - VISION AI SERVICE (Backend Proxy)
// Mendukung Google Gemini, OpenAI, & Anthropic Claude via .env
// ============================================================

import fs from 'fs';
import sharp from 'sharp';

// Muat .env bawaan Node jika tersedia
if (fs.existsSync('.env')) {
  try {
    process.loadEnvFile();
  } catch (err) {
    console.warn('[VisionAI] Warning: Gagal memuat file .env:', err.message);
  }
}

export const KTP_EXTRACTION_PROMPT = `Ekstrak data dari foto KTP Indonesia berikut ke dalam format JSON murni.
Salin teks persis seperti tercetak di KTP, huruf demi huruf dan digit demi digit. Jangan memperbaiki ejaan, jangan menyingkat, jangan menebak. Jika satu karakter ragu, tandai field itu di uncertain_fields.

Format JSON yang WAJIB digunakan:
{
  "nik": string|null,
  "nama": string|null,
  "tempat_lahir": string|null,
  "tanggal_lahir": "YYYY-MM-DD"|null,
  "jenis_kelamin": "LAKI-LAKI"|"PEREMPUAN"|null,
  "alamat": string|null,
  "rt_rw": string|null,
  "kelurahan": string|null,
  "kecamatan": string|null,
  "agama": string|null,
  "status_perkawinan": string|null,
  "pekerjaan": string|null,
  "kewarganegaraan": string|null,
  "image_quality": "good"|"poor",
  "uncertain_fields": string[]
}

Aturan penting:
1. Salin teks persis seperti tercetak di KTP, huruf demi huruf dan digit demi digit. Jangan menyingkat kata atau menambah kata baru.
2. NIK harus tepat 16 digit numerik. Periksa setiap digit angka dengan sangat teliti (jangan tertukar 0 dan 8, 1 dan 7, 3 dan 8, 5 dan 6). Jika ada digit yang tertutup atau tidak pasti, set "nik": null dan masukkan "nik" ke uncertain_fields.
3. DILARANG KERAS menebak, mengarang, atau memprediksi digit angka maupun huruf. Jika sebuah field buram atau terpotong, isi null dan masukkan nama field ke uncertain_fields.
4. Format tanggal_lahir harus "YYYY-MM-DD" (misal: "1990-05-17"). Jika tidak terbaca jelas, isi null.
5. Pada bagian alamat:
   - "alamat": hanya nama jalan/dusun/gang (misal: "JL. MERDEKA NO 15" atau "TANJUNG")
   - "rt_rw": format "001/002"
   - "kelurahan": nama desa/kelurahan
   - "kecamatan": nama kecamatan
6. Jika gambar sama sekali bukan KTP Republik Indonesia (atau kartu lain yang tidak relevan), kembalikan semua field dengan nilai null dan set "image_quality": "poor".
7. Keluarkan HANYA string JSON murni tanpa penjelasan pembuka/penutup.`;

/**
 * Optimasi ukuran gambar KTP sebelum dikirim ke Vision AI
 * Batas: maksimal 1600px sisi terpanjang atau ukuran > 1.5 MB
 * Tidak mengubah warna atau kontras, hanya resize dan re-encode JPEG kualitas 0.85
 */
export async function optimizeImageForVision(imageBuffer, mimeType = 'image/jpeg') {
  const resizeStart = Date.now();
  const originalSizeKb = Math.round(imageBuffer.length / 1024);

  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const longestSide = Math.max(width, height);

    const shouldResize = longestSide > 1600 || imageBuffer.length > 1.5 * 1024 * 1024;

    if (!shouldResize && (mimeType === 'image/jpeg' || mimeType === 'image/jpg')) {
      const resizeDurationMs = Date.now() - resizeStart;
      return {
        buffer: imageBuffer,
        mimeType: 'image/jpeg',
        resized: false,
        resizeDurationMs,
        originalSizeKb,
        finalSizeKb: originalSizeKb,
        dimensions: `${width}x${height}`,
      };
    }

    let pipeline = sharp(imageBuffer);
    if (longestSide > 1600) {
      pipeline = pipeline.resize({
        width: width >= height ? 1600 : undefined,
        height: height > width ? 1600 : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const optimizedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
    const resizeDurationMs = Date.now() - resizeStart;
    const finalSizeKb = Math.round(optimizedBuffer.length / 1024);

    return {
      buffer: optimizedBuffer,
      mimeType: 'image/jpeg',
      resized: true,
      resizeDurationMs,
      originalSizeKb,
      finalSizeKb,
      dimensions: `${width}x${height} -> max-1600`,
    };
  } catch (err) {
    console.warn('[VisionAI] Gagal resize gambar dengan Sharp, menggunakan buffer asli:', err.message);
    const resizeDurationMs = Date.now() - resizeStart;
    return {
      buffer: imageBuffer,
      mimeType,
      resized: false,
      resizeDurationMs,
      originalSizeKb,
      finalSizeKb: originalSizeKb,
    };
  }
}

/**
 * Parsing aman JSON hasil keluaran Vision Model
 */
function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let cleaned = rawText.trim();
  // Hapus markdown code fence jika ada (mis. ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Cari substring JSON {...} pertama jika ada teks pengantar
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[VisionAI] Gagal parse JSON dari response:', err.message);
    return null;
  }
}

/**
 * Panggil Google Gemini API
 */
async function callGeminiVision({ base64Image, mimeType, model, apiKey, timeoutMs }) {
  const buildPayload = (targetModel) => {
    const genConfig = {
      temperature: 0,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    };
    // Tambahkan thinkingConfig & mediaResolution hanya untuk model yang mendukungnya (non-lite)
    if (!targetModel.includes('lite') && !targetModel.includes('flash-lite')) {
      genConfig.mediaResolution = 'MEDIA_RESOLUTION_HIGH';
      genConfig.thinkingConfig = { thinkingBudget: 0 };
    }
    return {
      contents: [
        {
          parts: [
            { text: KTP_EXTRACTION_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: genConfig,
    };
  };

  let activeModel = model;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
  let payload = buildPayload(activeModel);

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Jika Google mengembalikan 503 (lonjakan beban sementara) atau 429, retry otomatis
  if (response.status === 503 || response.status === 429) {
    console.warn(`[VisionAI] Gemini (${activeModel}) merespons HTTP ${response.status}, mencoba ulang otomatis dalam 1.5 detik...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Jika model preview masih 503, fallback ke gemini-flash-lite-latest yang stabil
    if ((response.status === 503 || response.status === 429) && activeModel !== 'gemini-flash-lite-latest') {
      console.warn(`[VisionAI] Server Google untuk ${activeModel} masih sibuk (503). Beralih ke model fallback: gemini-flash-lite-latest...`);
      activeModel = 'gemini-flash-lite-latest';
      url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
      payload = buildPayload(activeModel);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
  }

  if (!response.ok) {
    let errorCode = 'GEMINI_ERROR';
    try {
      const errJson = await response.json();
      errorCode = errJson.error?.status || errJson.error?.code || 'GEMINI_ERROR';
    } catch {}
    const err = new Error(`Gemini API Error (HTTP ${response.status})`);
    err.statusCode = response.status;
    err.errorCode = errorCode;
    throw err;
  }

  const json = await response.json();
  const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Gemini tidak mengembalikan teks konten valid.');
  }
  return safeParseJson(candidateText);
}

/**
 * Panggil OpenAI Vision API (gpt-4o-mini / gpt-4o)
 */
async function callOpenAiVision({ base64Image, mimeType, model, apiKey, timeoutMs }) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model,
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: KTP_EXTRACTION_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    let errorCode = 'OPENAI_ERROR';
    try {
      const errJson = await response.json();
      errorCode = errJson.error?.code || errJson.error?.type || 'OPENAI_ERROR';
    } catch {}
    const err = new Error(`OpenAI API Error (HTTP ${response.status})`);
    err.statusCode = response.status;
    err.errorCode = errorCode;
    throw err;
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI tidak mengembalikan pesan balasan valid.');
  }
  return safeParseJson(content);
}

/**
 * Panggil Anthropic Claude Vision API (claude-3-5-sonnet / haiku)
 */
async function callAnthropicVision({ base64Image, mimeType, model, apiKey, timeoutMs }) {
  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model,
    max_tokens: 1000,
    temperature: 0,
    system: 'Anda adalah asisten ekstraksi data dokumen KTP Indonesia yang presisi. Selalu kembalikan respon berupa objek JSON murni tanpa markdown formatting.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: KTP_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    let errorCode = 'ANTHROPIC_ERROR';
    try {
      const errJson = await response.json();
      errorCode = errJson.error?.type || 'ANTHROPIC_ERROR';
    } catch {}
    const err = new Error(`Anthropic API Error (HTTP ${response.status})`);
    err.statusCode = response.status;
    err.errorCode = errorCode;
    throw err;
  }

  const json = await response.json();
  const text = json.content?.[0]?.text;
  if (!text) {
    throw new Error('Anthropic tidak mengembalikan blok teks valid.');
  }
  return safeParseJson(text);
}

/**
 * Fungsi Utama: Ekstraksi Data KTP via Vision AI Model
 * Mendukung pemanggilan extractKtpWithVision(imageBuffer, mimeType)
 * atau extractKtpWithVision({ imageBuffer, mimeType })
 */
export async function extractKtpWithVision(firstArg, secondArg = 'image/jpeg') {
  let imageBuffer = null;
  let mimeType = 'image/jpeg';

  if (Buffer.isBuffer(firstArg)) {
    imageBuffer = firstArg;
    mimeType = secondArg || 'image/jpeg';
  } else if (firstArg && typeof firstArg === 'object') {
    imageBuffer = firstArg.imageBuffer;
    mimeType = firstArg.mimeType || 'image/jpeg';
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    return { success: false, message: 'Buffer gambar tidak valid atau kosong.' };
  }

  const provider = (process.env.VISION_PROVIDER || 'gemini').trim().toLowerCase();
  const defaultModels = {
    gemini: 'gemini-flash-lite-latest',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
  };
  const model = (process.env.VISION_MODEL || defaultModels[provider] || 'gemini-flash-lite-latest').trim();
  const apiKey = (process.env.VISION_API_KEY || '').trim();
  const timeoutMs = parseInt(process.env.VISION_TIMEOUT_MS, 10) || 25000;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return {
      success: false,
      message: `API Key untuk provider '${provider}' belum dikonfigurasi di server. Silakan isi VISION_API_KEY di berkas .env`,
      code: 'API_KEY_MISSING',
    };
  }

  const startTime = Date.now();

  // 1. Optimasi Gambar (Resize ke max 1600px & encode JPEG 85 jika >1600px atau >1.5MB)
  const opt = await optimizeImageForVision(imageBuffer, mimeType);
  if (opt.resized) {
    console.log(`[VisionAI] Resize: ${opt.resizeDurationMs}ms (${opt.originalSizeKb} KB [${opt.dimensions}] -> ${opt.finalSizeKb} KB)`);
  } else {
    console.log(`[VisionAI] Gambar tidak perlu di-resize (${opt.originalSizeKb} KB [${opt.dimensions || 'N/A'}])`);
  }

  const base64Image = opt.buffer.toString('base64');
  const apiStartTime = Date.now();
  console.log(`[VisionAI] Memanggil API (${provider}/${model}) - Ukuran payload: ${opt.finalSizeKb} KB...`);

  try {
    let parsedData = null;

    if (provider === 'gemini') {
      parsedData = await callGeminiVision({ base64Image, mimeType: opt.mimeType, model, apiKey, timeoutMs });
    } else if (provider === 'openai') {
      parsedData = await callOpenAiVision({ base64Image, mimeType: opt.mimeType, model, apiKey, timeoutMs });
    } else if (provider === 'anthropic') {
      parsedData = await callAnthropicVision({ base64Image, mimeType: opt.mimeType, model, apiKey, timeoutMs });
    } else {
      throw new Error(`Provider Vision AI '${provider}' tidak didukung. Pilih 'gemini', 'openai', atau 'anthropic'.`);
    }

    const apiDurationMs = Date.now() - apiStartTime;
    const durationMs = Date.now() - startTime;
    console.log(`[VisionAI] Ekstraksi selesai: Total=${durationMs}ms (Resize=${opt.resizeDurationMs}ms, API=${apiDurationMs}ms)`);

    if (!parsedData || typeof parsedData !== 'object') {
      return {
        success: false,
        message: 'Vision AI tidak mengembalikan format data JSON yang dapat diproses.',
      };
    }

    return {
      success: true,
      rawVisionData: parsedData,
      provider,
      model,
      durationMs,
      apiDurationMs,
      resizeDurationMs: opt.resizeDurationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const statusCode = err.statusCode || 'N/A';
    const errCode = err.errorCode || err.code || (err.name === 'TimeoutError' || err.name === 'AbortError' ? 'TIMEOUT' : 'API_ERROR');
    console.error(`[VisionAI] Ekstraksi gagal setelah ${durationMs}ms: Status=${statusCode}, Code=${errCode}`);

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return {
        success: false,
        message: `Koneksi ke Vision AI timeout (${Math.round(timeoutMs / 1000)} detik). Mohon coba lagi.`,
        code: 'TIMEOUT',
      };
    }

    return {
      success: false,
      message: `Gagal memproses gambar KTP (${errCode}).`,
      code: 'VISION_API_ERROR',
    };
  }
}
