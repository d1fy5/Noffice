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

    let minGray = 255;
    let maxGray = 0;

    // Pass 1: Cari rentang luminansi piksel
    const grayBuffer = new Float32Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      grayBuffer[p] = gray;
      if (gray < minGray) minGray = gray;
      if (gray > maxGray) maxGray = gray;
    }

    const range = maxGray - minGray || 1;

    // Pass 2: Contrast stretch
    for (let p = 0; p < grayBuffer.length; p++) {
      grayBuffer[p] = ((grayBuffer[p] - minGray) / range) * 255;
    }

    // Pass 3: 3x3 Unsharp Sharpening Filter untuk mengatasi foto yang blur/kurang tajam
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const sharpVal = 5 * grayBuffer[p]
          - grayBuffer[p - 1]
          - grayBuffer[p + 1]
          - grayBuffer[p - w]
          - grayBuffer[p + w];

        const clamped = Math.max(0, Math.min(255, sharpVal));
        // Huruf KTP dibuat hitam tegas, latar KTP diputihkan
        const finalVal = clamped < 125 ? Math.max(0, clamped * 0.7) : Math.min(255, clamped * 1.3);

        const idx = p * 4;
        d[idx] = finalVal;
        d[idx + 1] = finalVal;
        d[idx + 2] = finalVal;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Enhancement filter warning:', err);
  }
}

export default function KtpScanner({ onExtracted, notify }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload' | 'paste'
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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung di browser ini.');
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
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan izinkan akses kamera di ikon gembok URL browser Anda, atau gunakan opsi Unggah Foto.');
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

    // Target resolusi optimal untuk OCR Tesseract (resolusi diperbesar agar karakter huruf tidak buram)
    const targetW = Math.max(cropW, 1200);
    const targetH = Math.round(targetW / 1.58);

    // Canvas 1: Raw photo cropped & upscaled high quality
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = targetW;
    rawCanvas.height = targetH;
    const rawCtx = rawCanvas.getContext('2d');
    rawCtx.imageSmoothingEnabled = true;
    rawCtx.imageSmoothingQuality = 'high';
    rawCtx.drawImage(video, startX, startY, cropW, cropH, 0, 0, targetW, targetH);
    const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95);
    setRawCaptured(rawDataUrl);

    // Canvas 2: Filtered & contrast-enhanced for OCR
    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = targetW;
    filterCanvas.height = targetH;
    const filterCtx = filterCanvas.getContext('2d');
    filterCtx.drawImage(rawCanvas, 0, 0);
    applyKtpEnhancement(filterCanvas);
    const enhancedDataUrl = filterCanvas.toDataURL('image/jpeg', 0.95);

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
        setCapturedImage(c.toDataURL('image/jpeg', 0.95));
      };
      img.src = rawCaptured;
    }
  };

  // Handle uploaded image file
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (notify) notify('Pilih file gambar KTP (JPG, PNG, WEBP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const rawUrl = canvas.toDataURL('image/jpeg', 0.95);
        setRawCaptured(rawUrl);

        // Apply contrast boost
        applyKtpEnhancement(canvas);
        const enhancedUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(enhancedUrl);
        setScanFailed(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Process OCR on captured / uploaded image
  const processOcr = async () => {
    if (!capturedImage) return;

    setScanning(true);
    setScanStatus('Memindai teks KTP dengan OCR lokal (100% Offline)...');
    setLastExtracted(null);
    setScanFailed(false);

    try {
      const res = await AiAPI.scanKtp(capturedImage);
      if (res && res.success && res.data) {
        const imageToSave = rawCaptured || capturedImage;
        onExtracted(res.data, imageToSave);
        setLastExtracted(res.data);
        if (notify) {
          const detail = [res.data.nik ? `NIK: ${res.data.nik}` : '', res.data.name ? res.data.name : '']
            .filter(Boolean)
            .join(' - ');
          notify(`KTP berhasil discan (${detail || 'Selesai'})! Foto KTP & data siap disimpan ke dokumen.`, 'success');
        }
        setScanStatus('Scan KTP selesai!');
      } else {
        setScanFailed(true);
        if (notify) notify(res?.message || 'Teks KTP tidak terbaca jelas (buram).', 'warning');
      }
    } catch (err) {
      console.error('Scan KTP failed:', err);
      setScanFailed(true);
      if (notify) notify('Gagal memproses OCR KTP. Silakan coba foto ulang atau gunakan opsi Unggah Foto.', 'danger');
    } finally {
      setScanning(false);
    }
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
            padding: '26px 16px',
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
            capture="environment"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <div style={{ marginBottom: '8px', color: 'var(--primary)' }}>
            <Icon name="upload" size={32} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text)' }}>
            Klik untuk Memilih Foto KTP
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', maxWidth: '380px', marginInline: 'auto' }}>
            Rekomendasi terbaik: gunakan foto KTP dari kamera HP (kamera HP memiliki autofocus tajam dan bebas blur).
          </div>
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

          {/* Warning & Bantuan jika scan gagal atau buram */}
          {scanFailed && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '3px' }}>
                ⚠️ Teks KTP belum terbaca (foto kurang tajam / buram)
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.74rem', marginBottom: '8px', lineHeight: '1.4' }}>
                Webcam laptop umumnya memiliki lensa <i>fixed-focus</i> sehingga sulit memfokuskan teks kecil dari jarak dekat.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSelectMode('upload')}
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Icon name="upload" size={13} />
                  <span>Gunakan Unggah Foto (Foto dari Kamera HP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode('paste')}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Paste Teks Manual
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
          {lastExtracted && (
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
