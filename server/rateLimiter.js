// ============================================================
// IN-MEMORY USER RATE LIMITER UNTUK ENDPOINT KTP
// Membatasi request per user ID untuk mencegah spam & pembengkakan biaya API
// ============================================================

const requestHistory = new Map(); // Map<userId, number[]> (timestamps)

// Bersihkan data lama setiap 5 menit agar tidak boros RAM
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [userId, timestamps] of requestHistory.entries()) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      requestHistory.delete(userId);
    } else {
      requestHistory.set(userId, valid);
    }
  }
}, 5 * 60 * 1000);

export function ktpRateLimiter(req, res, next) {
  const maxRequests = parseInt(process.env.KTP_RATE_LIMIT_PER_MINUTE, 10) || 10;
  const windowMs = 60 * 1000; // 1 menit

  // Dapatkan identitas user dari session atau fallback ke IP
  const userId = req.sessionUser?.id || req.sessionUser?.userId || req.ip || 'anonymous';
  const now = Date.now();

  const userTimestamps = requestHistory.get(userId) || [];
  // Hanya simpan timestamp dalam jendela 1 menit terakhir
  const recentTimestamps = userTimestamps.filter((t) => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    const oldestInWindow = recentTimestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldestInWindow)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak permintaan scan KTP. Mohon tunggu ${waitSeconds} detik sebelum mencoba lagi.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: waitSeconds,
    });
  }

  recentTimestamps.push(now);
  requestHistory.set(userId, recentTimestamps);
  next();
}

