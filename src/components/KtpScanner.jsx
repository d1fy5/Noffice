import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';
import { AiAPI } from '../services/api.js';

// Auto-contrast & Unsharp Sharpening filter khusus KTP:
// Menghilangkan latar belakang biru & hologram, mempertajam font hitam teks KTP
function applyKtpEnhancement(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // 1. Grayscale dengan bobot perceptual
    const gray = new Float32Array(w * h);
    const hist = new Int32Array(256);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      gray[p] = g;
      hist[Math.min(255, Math.max(0, Math.round(g)))]++;
    }

    // 2. Percentile stretch (4% - 96%) agar tahan silau & bayangan
    const total = gray.length;
    let pLow = 0, count = 0;
    for (let i = 0; i < 256; i++) {
      count += hist[i];
      if (count >= total * 0.04) { pLow = i; break; }
    }
    count = 0;
    let pHigh = 255;
    for (let i = 255; i >= 0; i--) {
      count += hist[i];
      if (count >= total * 0.04) { pHigh = i; break; }
    }
    const range = Math.max(25, pHigh - pLow);

    // 3. Normalisasi kontras & Laplacian unsharp mask halus (tanpa binarisasi ekstrem)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const norm = Math.min(255, Math.max(0, ((gray[p] - pLow) / range) * 255));
        const up = Math.min(255, Math.max(0, ((gray[p - w] - pLow) / range) * 255));
        const dn = Math.min(255, Math.max(0, ((gray[p + w] - pLow) / range) * 255));
        const lf = Math.min(255, Math.max(0, ((gray[p - 1] - pLow) / range) * 255));
        const rt = Math.min(255, Math.max(0, ((gray[p + 1] - pLow) / range) * 255));

        // Laplacian sharpening halus: mempertajam tepi huruf KTP tanpa merusak font atau menggabungkan spasi antar-kata
        const sharp = norm + 0.45 * (norm - 0.25 * (up + dn + lf + rt));
        const val = Math.min(255, Math.max(0, Math.round(sharp)));

        const idx = p * 4;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Enhancement filter warning:', err);
  }
}

// Deteksi apakah sedang diakses dari IP Wi-Fi lokal HTTP (bukan HTTPS dan bukan localhost)
const isNonSecure = typeof window !== 'undefined' && (
  !window.isSecureContext &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
);

export default function KtpScanner({ onExtracted, notify }) {
  // Jika diakses via IP Wi-Fi HTTP di HP, default-kan ke mode 'upload' karena browser HP memblokir navigator.mediaDevices
  const [mode, setMode] = useState(() => (isNonSecure ? 'upload' : 'camera')); // 'camera' | 'upload' | 'paste'
  const [streamActive, setStreamActive] = useState(false);
  const [rawCaptured, setRawCaptured] = useState(null); // original crop
  const [capturedImage, setCapturedImage] = useState(null); // active image for OCR
  const [useFilter, setUseFilter] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [rawText, setRawText] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [lastExtracted, setLastExtracted] = useState(null);
  const [partialData, setPartialData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanFailed, setScanFailed] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop current active media stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Error stopping track:', err);
      }
      streamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  // List available camera devices
  const loadDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoDevs);
      }
    } catch {
      // Ignore enumeration errors
    }
  }, []);

  // Start video stream with robust fallback
  const startCamera = useCallback(async (deviceIndex = 0) => {
    stopStream();
    setCameraError('');
    setCapturedImage(null);
    setRawCaptured(null);
    setScanFailed(false);

    try {
      if (isNonSecure) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('DEVICE_UNSUPPORTED');
      }

      let stream = null;

      // 1. Coba dengan constraints ideal
      try {
        const constraints = {
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        };

        if (videoDevices.length > 0 && videoDevices[deviceIndex]?.deviceId) {
          constraints.video = {
            deviceId: { exact: videoDevices[deviceIndex].deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (errConstraint) {
        console.warn('Constraint camera failed, falling back to simple video: true', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setStreamActive(true);
      setCurrentDeviceIndex(deviceIndex);

      loadDevices();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Play error:', e));
        };
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      if (err?.message === 'SECURE_CONTEXT_REQUIRED') {
        const hostStr = typeof window !== 'undefined' ? window.location.hostname : 'IP Wi-Fi';
        setCameraError(`Browser HP (Chrome/Safari) memblokir video streaming kamera langsung pada koneksi HTTP IP lokal (${hostStr}). Gunakan tombol "Unggah Foto" untuk memotret KTP langsung dengan kamera HP.`);
      } else {
        setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan izinkan akses kamera di pengaturan browser Anda, atau gunakan opsi Unggah Foto.');
      }
      setStreamActive(false);
    }
  }, [loadDevices, stopStream, videoDevices]);

  // Callback ref untuk attach stream ke video
  const setVideoElement = useCallback((element) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      element.onloadedmetadata = () => {
        element.play().catch((e) => console.warn('Play error:', e));
      };
      element.play().catch((e) => console.warn('Play error:', e));
    }
  }, []);

  const switchCamera = () => {
    if (videoDevices.length > 1) {
      const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
      startCamera(nextIndex);
    }
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleSelectMode = (newMode) => {
    setMode(newMode);
    setCapturedImage(null);
    setRawCaptured(null);
    setCameraError('');
    setScanFailed(false);
    if (newMode === 'camera') {
      startCamera(currentDeviceIndex);
    } else {
      stopStream();
    }
  };

  // Crop area bingkai KTP + terapkan auto-contrast enhancement
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const vw = video.videoWidth || video.clientWidth || 1280;
    const vh = video.videoHeight || video.clientHeight || 720;

    if (vw === 0 || vh === 0) {
      if (notify) notify('Video belum siap, tunggu 1 detik lalu tekan Ambil Foto lagi', 'warning');
      return;
    }

    // Hitung area cropping fokus pada bingkai KTP di tengah (rasio 1.58:1)
    const cropW = Math.round(vw * 0.82);
    const cropH = Math.round(cropW / 1.58);
    const startX = Math.max(0, Math.round((vw - cropW) / 2));
    const startY = Math.max(0, Math.round((vh - cropH) / 2));

    // Target resolusi optimal: 1600px lebar agar huruf kecil KTP terbaca jelas Tesseract
    const targetW = Math.max(cropW, 1600);
    const targetH = Math.round(targetW / 1.58);

    // Canvas 1: Raw photo cropped & upscaled high quality (JPEG 95% sebagai backup warna)
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = targetW;
    rawCanvas.height = targetH;
    const rawCtx = rawCanvas.getContext('2d');
    rawCtx.imageSmoothingEnabled = true;
    rawCtx.imageSmoothingQuality = 'high';
    rawCtx.drawImage(video, startX, startY, cropW, cropH, 0, 0, targetW, targetH);
    const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95);
    setRawCaptured(rawDataUrl);

    // Canvas 2: Filtered & contrast-enhanced - PNG lossless agar tidak ada artefak JPEG
    // yang merusak ketajaman huruf OCR (sangat penting untuk NIK dan nama berukuran kecil)
    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = targetW;
    filterCanvas.height = targetH;
    const filterCtx = filterCanvas.getContext('2d');
    filterCtx.drawImage(rawCanvas, 0, 0);
    applyKtpEnhancement(filterCanvas);
    const enhancedDataUrl = filterCanvas.toDataURL('image/png');

    setCapturedImage(enhancedDataUrl);
    stopStream();
  };

  // Toggle filter ketajaman teks
  const toggleFilter = () => {
    if (!rawCaptured) return;
    const next = !useFilter;
    setUseFilter(next);
    if (!next) {
      setCapturedImage(rawCaptured);
    } else {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        applyKtpEnhancement(c);
        setCapturedImage(c.toDataURL('image/png')); // PNG lossless untuk OCR akurat
      };
      img.src = rawCaptured;
    }
  };

  // Handle uploaded image file (RAM-Safe & Crash-Proof for Mobile Phones)
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (notify) notify('Pilih file gambar KTP (JPG, PNG, WEBP)', 'warning');
      return;
    }

    // Reset nilai input agar memilih file yang sama tetap memicu onChange
    e.target.value = '';

    // Gunakan ObjectURL bukan FileReader base64 agar browser HP tidak kehabisan RAM (OOM)
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        let targetW = img.width, targetH = img.height;

        // Jika foto berorientasi tegak / portrait (foto HP dengan KTP mendatar di tengah):
        // Fokuskan cropping otomatis pada area kartu KTP di tengah (rasio KTP ~1.58:1)
        if (img.height > img.width * 1.05) {
          srcW = Math.round(img.width * 0.94);
          srcH = Math.min(img.height, Math.round(srcW / 1.58));
          srcX = Math.max(0, Math.round((img.width - srcW) / 2));
          srcY = Math.max(0, Math.round((img.height - srcH) / 2));
          targetW = Math.max(1600, srcW);
          targetH = Math.round(targetW / 1.58);
        } else {
          // Jika sudah landscape, pastikan resolusi minimal 1600px untuk ketajaman OCR
          const maxDim = 1800;
          if (img.width < 1400) {
            targetW = 1600;
            targetH = Math.round((img.height * 1600) / img.width);
          } else if (img.width > maxDim || img.height > maxDim) {
            if (img.width > img.height) {
              targetH = Math.round((img.height * maxDim) / img.width);
              targetW = maxDim;
            } else {
              targetW = Math.round((img.width * maxDim) / img.height);
              targetH = maxDim;
            }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

        // Raw: simpan JPEG 92% sebagai referensi warna asli
        const rawUrl = canvas.toDataURL('image/jpeg', 0.92);
        setRawCaptured(rawUrl);

        // Enhanced: PNG lossless agar tidak ada artefak kompresi yang merusak huruf OCR
        // PNG lebih besar tetapi WAJIB untuk akurasi OCR huruf tipis KTP
        applyKtpEnhancement(canvas);
        const enhancedUrl = canvas.toDataURL('image/png');
        setCapturedImage(enhancedUrl);
        setScanFailed(false);
      } catch (err) {
        console.error('Error processing image:', err);
        if (notify) notify('Gagal memproses gambar pada perangkat HP.', 'danger');
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      if (notify) notify('Gagal membaca gambar dari galeri HP.', 'danger');
    };

    img.src = blobUrl;
  };

  // Process OCR on captured / uploaded image
  const processOcr = async () => {
    if (!capturedImage) return;

    setScanning(true);
    setScanStatus('Memindai teks KTP dengan OCR lokal (100% Offline)...');
    setLastExtracted(null);
    setPartialData(null);
    setScanFailed(false);
    setErrorMessage('');

    try {
      const res = await AiAPI.scanKtp(capturedImage, rawCaptured);
      const data = res?.data || {};
      const hasNik = Boolean(data.nik && data.nik.length === 16);
      const hasName = Boolean(data.name && data.name.trim().length > 2);

      // KTP dinyatakan sukses LENGKAP hanya jika ada NIK DAN NAMA LENGKAP!
      if (res && res.success && hasNik && hasName) {
        const imageToSave = rawCaptured || capturedImage;
        onExtracted(data, imageToSave);
        setLastExtracted(data);
        setPartialData(null);
        setScanFailed(false);
        if (notify) {
          notify(`KTP berhasil dipindai lengkap: ${data.name} (NIK: ${data.nik})!`, 'success');
        }
        setScanStatus('Scan KTP selesai!');
      } else if (hasNik && !hasName) {
        // NIK masuk tapi nama BELUM kebaca -> AI meminta foto ulang lebih dekat!
        setScanFailed(true);
        setLastExtracted(null);
        setPartialData(data);
        setErrorMessage(`NIK berhasil terdeteksi (${data.nik}), namun Nama Lengkap belum terbaca jelas. Mohon foto ulang KTP lebih dekat ke arah nama.`);
        if (notify) {
          notify('Nama KTP belum terbaca jelas. Silakan foto ulang lebih dekat.', 'warning');
        }
      } else {
        // Belum terbaca sama sekali
        setScanFailed(true);
        setLastExtracted(null);
        setPartialData(null);
        setErrorMessage(res?.message || 'Teks KTP tidak terbaca jelas (terlalu jauh atau buram). Dekatkan KTP hingga memenuhi bingkai kamera.');
        if (notify) notify('Teks KTP belum terbaca jelas. Dekatkan kartu ke kamera.', 'warning');
      }
    } catch (err) {
      console.error('Scan KTP failed:', err);
      setScanFailed(true);
      setLastExtracted(null);
      setPartialData(null);
      setErrorMessage('Gagal memproses OCR KTP. Silakan coba dekatkan kartu atau gunakan opsi Unggah Foto dari HP.');
      if (notify) notify('Gagal memproses OCR KTP. Coba foto ulang.', 'danger');
    } finally {
      setScanning(false);
    }
  };

  const applyPartialNik = () => {
    if (!partialData) return;
    const imageToSave = rawCaptured || capturedImage;
    onExtracted(partialData, imageToSave);
    setLastExtracted(partialData);
    setScanFailed(false);
    if (notify) notify(`NIK ${partialData.nik} dimasukkan ke formulir. Silakan ketik nama klien secara manual.`, 'info');
  };

  // Manual extract from pasted text
  const handleManualTextExtract = async () => {
    if (!rawText.trim()) {
      if (notify) notify('Paste teks hasil scan KTP terlebih dahulu!', 'warning');
      return;
    }
    setScanning(true);
    try {
      const res = await AiAPI.extractData(rawText);
      if (res && res.success && res.data) {
        onExtracted(res.data);
        setLastExtracted(res.data);
        if (notify) notify(`Data berhasil diekstrak oleh ${res.engine}!`, 'success');
        setRawText('');
      } else {
        if (notify) notify('Gagal mengenali data dari teks yang dimasukkan.', 'warning');
      }
    } catch {
      if (notify) notify('Gagal mengekstrak data dari teks', 'danger');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '14px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
              Scan KTP Pintar (AI & OCR)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              Foto KTP untuk mengisi formulir klien secara otomatis & offline
            </div>
          </div>
        </div>

        {/* Mode Buttons */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => handleSelectMode('camera')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'camera' ? 'var(--primary)' : 'transparent',
              color: mode === 'camera' ? '#fff' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="camera" size={13} />
            <span>Kamera KTP</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'upload' ? 'var(--primary)' : 'transparent',
              color: mode === 'upload' ? '#fff' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="upload" size={13} />
            <span>Unggah Foto</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode('paste')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'paste' ? 'var(--primary)' : 'transparent',
              color: mode === 'paste' ? '#fff' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="fileText" size={13} />
            <span>Paste Teks</span>
          </button>
        </div>
      </div>

      {/* MODE 1: KAMERA KTP */}
      {mode === 'camera' && (
        <div>
          {!capturedImage && !streamActive && (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
              {isNonSecure ? (
                <>
                  <div style={{ marginBottom: '10px', color: '#f59e0b' }}>
                    <Icon name="alert" size={36} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '6px', color: 'var(--text)' }}>
                    Kamera Streaming Memerlukan HTTPS di HP
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '14px', maxWidth: '380px', marginInline: 'auto', lineHeight: '1.5' }}>
                    Browser HP (Chrome & Safari) memblokir video kamera streaming langsung pada IP Wi-Fi lokal (<code>{typeof window !== 'undefined' ? window.location.hostname : '192.168...'}</code>). Silakan gunakan tab <strong>Unggah Foto</strong> untuk memotret KTP langsung dengan kamera HP Anda.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <Button variant="primary" icon="upload" size="sm" onClick={() => handleSelectMode('upload')}>
                      Buka Kamera HP (Via Unggah)
                    </Button>
                    <Button variant="secondary" icon="camera" size="sm" onClick={() => startCamera(currentDeviceIndex)}>
                      Coba Buka Kamera
                    </Button>
                  </div>
                  {cameraError && (
                    <div style={{ fontSize: '0.76rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px', marginTop: '10px' }}>
                      {cameraError}
                    </div>
                  )}
                  <div style={{ marginTop: '14px', fontSize: '0.7rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    💡 <strong>Tips Chrome Android:</strong> Untuk mengizinkan kamera di IP lokal tanpa HTTPS, buka: <code style={{ userSelect: 'all' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> di Chrome HP, masukkan IP web ini, lalu restart Chrome.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '10px', color: 'var(--text-3)' }}>
                    <Icon name="camera" size={36} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                    Akses Kamera KTP
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '14px', maxWidth: '340px', marginInline: 'auto' }}>
                    Noffice akan membuka kamera perangkat Anda untuk mengambil foto KTP klien langsung.
                  </div>
                  {cameraError && (
                    <div style={{ fontSize: '0.78rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                      {cameraError}
                    </div>
                  )}
                  <Button variant="primary" icon="camera" size="sm" onClick={() => startCamera(currentDeviceIndex)}>
                    Buka Kamera Sekarang
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Live Camera Viewfinder */}
          {!capturedImage && streamActive && (
            <div
              style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#111827',
                minHeight: '270px',
                maxHeight: '340px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <video
                ref={setVideoElement}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '270px',
                  maxHeight: '340px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* KTP Framing Overlay dengan Cutout */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    width: '84%',
                    maxWidth: '360px',
                    aspectRatio: '1.58 / 1',
                    border: '2px solid #3b82f6',
                    borderRadius: '10px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '8px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    🪪 Pasang KTP di dalam bingkai ini
                  </span>
                </div>
              </div>

              {/* Petunjuk Kamera Agar Tidak Blur */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '12px',
                  right: '12px',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <span style={{ fontSize: '0.68rem', background: 'rgba(15,23,42,0.8)', color: '#e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
                  💡 Dekatkan KTP hingga memenuhi bingkai & tahan stabil agar tidak blur
                </span>
              </div>

              {/* Viewfinder Controls */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 10,
                }}
              >
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    title="Ganti Kamera Depan/Belakang"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <Icon name="refresh" size={17} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={capturePhoto}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '30px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <Icon name="camera" size={18} />
                  <span>Ambil Foto KTP</span>
                </button>

                <button
                  type="button"
                  onClick={stopStream}
                  title="Tutup Kamera"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Icon name="x" size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: UNGGAH FOTO KTP */}
      {mode === 'upload' && !capturedImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '24px 16px',
            background: 'var(--surface)',
            borderRadius: '10px',
            border: '2px dashed var(--primary)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <div style={{ marginBottom: '8px', color: 'var(--primary)' }}>
            <Icon name="camera" size={34} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px', color: 'var(--text)' }}>
            Pilih atau Jepret Foto KTP
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', maxWidth: '380px', marginInline: 'auto', marginBottom: '14px', lineHeight: '1.45' }}>
            Ketuk di sini untuk langsung <strong>memotret KTP lewat kamera HP</strong> atau memilih dari galeri foto Anda.
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }}
            >
              <Icon name="camera" size={15} />
              <span>Buka Kamera / Galeri HP</span>
            </button>
          </div>
          {isNonSecure && (
            <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span>✅ Mode aman & kompatibel untuk Wi-Fi Lokal ({typeof window !== 'undefined' ? window.location.hostname : '192.168...'})</span>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: PASTE TEKS OCR */}
      {mode === 'paste' && (
        <div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Paste hasil scan KTP / teks dokumen di sini..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualTextExtract()}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.82rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
            <Button variant="primary" size="sm" onClick={handleManualTextExtract} disabled={scanning}>
              {scanning ? 'Mengekstrak...' : 'Ekstrak ke Form'}
            </Button>
          </div>
        </div>
      )}

      {/* PREVIEW FOTO KTP & KONTROL SCAN */}
      {capturedImage && (
        <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Foto Preview */}
            <div style={{ position: 'relative', width: '150px', height: '95px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, background: '#000' }}>
              <img
                src={capturedImage}
                alt="Foto KTP Preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              {useFilter && (
                <span style={{ position: 'absolute', bottom: '3px', right: '3px', background: 'rgba(16, 185, 129, 0.9)', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  HD Filter ON
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                Foto KTP Siap Dipindai
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '10px' }}>
                Sistem otomatis memfokuskan area kartu dan meningkatkan ketajaman teks hitam KTP.
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="primary"
                  icon="zap"
                  size="sm"
                  onClick={processOcr}
                  disabled={scanning}
                >
                  {scanning ? 'Memindai KTP...' : '⚡ Scan & Ekstrak Data'}
                </Button>

                <Button
                  variant="secondary"
                  icon="refresh"
                  size="sm"
                  onClick={() => {
                    setCapturedImage(null);
                    setRawCaptured(null);
                    setLastExtracted(null);
                    setScanFailed(false);
                    if (mode === 'camera') startCamera(currentDeviceIndex);
                  }}
                  disabled={scanning}
                >
                  Foto Ulang
                </Button>

                <button
                  type="button"
                  onClick={toggleFilter}
                  title="Toggle filter ketajaman kontras teks"
                  style={{
                    background: useFilter ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-2)',
                    color: useFilter ? 'var(--primary)' : 'var(--text-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {useFilter ? '✨ Filter Ketajaman: Aktif' : '✨ Filter: Asli'}
                </button>
              </div>
            </div>
          </div>

          {/* Warning & Bantuan jika scan gagal atau nama belum terbaca */}
          {scanFailed && (
            <div style={{ marginTop: '12px', padding: '12px 14px', background: partialData ? 'rgba(234, 179, 8, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${partialData ? 'rgba(234, 179, 8, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`, borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: partialData ? '#b45309' : '#dc2626', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name={partialData ? "info" : "x"} size={16} />
                {partialData ? '⚠️ Nama Klien Belum Terbaca (Scan Belum Lengkap)' : '⚠️ Teks KTP Belum Terbaca (Foto Terlalu Jauh / Buram)'}
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.76rem', marginBottom: '10px', lineHeight: '1.5' }}>
                {errorMessage}
              </div>

              {partialData && partialData.nik && (
                <div style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <div><strong>NIK Terdeteksi:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>{partialData.nik}</span></div>
                  {partialData.birthdate && <div><strong>Tgl Lahir (Auto NIK):</strong> {partialData.birthdate}</div>}
                  <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: 600 }}>* Nama Lengkap belum terbaca. Mohon ambil foto ulang lebih dekat agar nama terisi otomatis.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    setRawCaptured(null);
                    setLastExtracted(null);
                    setPartialData(null);
                    setScanFailed(false);
                    if (mode === 'camera') startCamera(currentDeviceIndex);
                  }}
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <Icon name="refresh" size={14} />
                  <span>🔄 Ambil Foto Ulang (Lebih Dekat)</span>
                </button>

                {partialData && (
                  <button
                    type="button"
                    onClick={applyPartialNik}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '7px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Gunakan NIK Saja & Ketik Nama Manual
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSelectMode('upload')}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-2)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '7px 12px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  Unggah Foto dari HP
                </button>
              </div>
            </div>
          )}

          {/* Scanning Progress Status Indicator */}
          {scanning && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--primary)' }}>
              <div className="spinner-border" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
              <span>{scanStatus}</span>
            </div>
          )}

          {/* Extracted Summary Card */}
          {lastExtracted && (lastExtracted.nik || lastExtracted.name || lastExtracted.birthdate || lastExtracted.address || lastExtracted.job) && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text)' }}>
              <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon name="check" size={14} /> Data KTP Berhasil Terisi ke Formulir:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px', fontSize: '0.75rem', color: 'var(--text-2)' }}>
                {lastExtracted.nik && <div><strong>NIK:</strong> {lastExtracted.nik}</div>}
                {lastExtracted.name && <div><strong>Nama:</strong> {lastExtracted.name}</div>}
                {lastExtracted.birthdate && <div><strong>Tgl Lahir:</strong> {lastExtracted.birthdate}</div>}
                {lastExtracted.job && <div><strong>Pekerjaan:</strong> {lastExtracted.job}</div>}
              </div>
              {lastExtracted.address && (
                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  <strong>Alamat:</strong> {lastExtracted.address}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
