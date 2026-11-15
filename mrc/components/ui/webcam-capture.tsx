"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, X, CheckCircle, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebcamCaptureProps {
  onPhotoCaptured: (url: string | null) => void;
  initialPhotoUrl?: string | null;
  captureType?: "borrow" | "return";
  label?: string;
  helperText?: string;
}

export default function WebcamCapture({
  onPhotoCaptured,
  initialPhotoUrl = null,
  captureType = "borrow",
  label = "Foto Bukti Penyerahan / Pengembalian",
  helperText = "Ambil foto bukti wajah peminjam atau kondisi fisik barang serah terima.",
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ? initialPhotoUrl.replace("/uploads/captures/", "/api/captures/") : null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stop media stream tracks helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start webcam stream
  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses webcam (WebRTC).");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // If video element already mounted, attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.error("Play error:", e);
        }
      }

      // Update state to render video container
      setIsStreaming(true);
    } catch (err: any) {
      console.error("Gagal membuka kamera:", err);
      let msg = "Tidak dapat mengakses kamera. Pastikan webcam terhubung dan izin kamera telah diberikan di browser.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Izin akses kamera ditolak. Silakan izinkan akses kamera di ikon gembok pada URL bar browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Perangkat webcam tidak ditemukan. Pastikan webcam terpasang.";
      }
      setErrorMsg(msg);
      setIsStreaming(false);
    }
  }, []);

  // Callback ref: fires immediately when <video> mounts in DOM
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      element.play().catch((err) => {
        console.error("Video play error in callback ref:", err);
      });
    }
  }, []);

  // Otomatis buka kamera langsung saat komponen dimuat (tanpa tombol buka kamera)
  useEffect(() => {
    if (!initialPhotoUrl) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [initialPhotoUrl, startCamera, stopStream]);

  // Upload image to backend
  const uploadImage = async (dataUrl: string) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          type: captureType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail ? `${data.error}: ${data.detail}` : (data.error || "Gagal mengunggah foto ke server"));
      }

      setPhotoPreview(data.path);
      onPhotoCaptured(data.path);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Gagal menyimpan foto");
    } finally {
      setIsUploading(false);
    }
  };

  // Take snapshot from video to canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Get JPEG data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Show preview immediately with local data URL
    setPhotoPreview(dataUrl);

    // Stop camera stream once captured
    stopStream();

    // Upload to server
    uploadImage(dataUrl);
  };

  // Retake / Clear photo
  const handleRetake = () => {
    setPhotoPreview(null);
    onPhotoCaptured(null);
    startCamera();
  };

  // Remove photo
  const handleRemove = () => {
    stopStream();
    setPhotoPreview(null);
    onPhotoCaptured(null);
  };

  // Fallback: file upload with auto-resize and compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = canvasRef.current || document.createElement("canvas");
      canvasRef.current = canvas;

      let width = img.width;
      let height = img.height;
      const maxDim = 1280;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      setPhotoPreview(dataUrl);
      stopStream();
      uploadImage(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setErrorMsg("Gagal memuat berkas gambar.");
    };
    img.src = url;
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        </div>
        {photoPreview && !errorMsg && !isUploading && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Foto Tersimpan
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{helperText}</p>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Hidden canvas for taking snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewport Area */}
      <div className="relative w-full aspect-video max-h-56 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300 dark:border-gray-700">
        {photoPreview ? (
          // Preview of captured photo
          <div className="relative w-full h-full">
            <img
              src={photoPreview}
              alt="Bukti Serah Terima"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          </div>
        ) : isStreaming ? (
          // Live video stream with callback ref
          <div className="relative w-full h-full">
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const target = e.currentTarget;
                target.play().catch(console.error);
              }}
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/40 m-4 rounded-lg flex items-end justify-center pb-2">
              <span className="text-[11px] bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                Arahkan ke peminjam / barang
              </span>
            </div>
          </div>
        ) : (
          // Standby state
          <div className="text-center p-4">
            <Camera className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-gray-400">Kamera belum aktif</p>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 text-white text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-accent-400" />
            <span>Menyimpan foto bukti...</span>
          </div>
        )}
      </div>

      {/* Controls & Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!photoPreview && !isStreaming && (
            <Button
              type="button"
              onClick={startCamera}
              size="sm"
              className="bg-accent-600 hover:bg-accent-700 text-white text-xs h-8"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Buka Webcam
            </Button>
          )}

          {isStreaming && (
            <>
              <Button
                type="button"
                onClick={capturePhoto}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Ambil Foto Sekarang
              </Button>
              <Button
                type="button"
                onClick={stopStream}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Batal
              </Button>
            </>
          )}

          {photoPreview && (
            <>
              <Button
                type="button"
                onClick={handleRetake}
                variant="outline"
                size="sm"
                className="text-xs h-8 border-gray-300 dark:border-gray-600"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Ambil Ulang
              </Button>
              <Button
                type="button"
                onClick={handleRemove}
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Hapus
              </Button>
            </>
          )}
        </div>

        {/* Fallback upload from local file */}
        <label className="cursor-pointer inline-flex items-center text-[11px] text-gray-500 hover:text-accent-600 dark:text-gray-400 dark:hover:text-accent-400 transition-colors">
          <Upload className="w-3.5 h-3.5 mr-1" />
          <span>Upload file gambar</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
