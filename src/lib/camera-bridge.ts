/**
 * camera-bridge.ts — Native camera via @capacitor/camera, web fallback to
 * HTML file-picker. Top-1%: compresses images to 1920px max, 80% quality,
 * preventing multi-MB uploads.
 */

import { isNative } from './platform-engine';

export interface CaptureResult {
  ok: boolean;
  data_url?: string;
  mime_type?: string;
  size_bytes?: number;
  reason?: string;
}

const MAX_DIMENSION = 1920;
const COMPRESSION_QUALITY = 0.8;

interface CameraLike {
  getPhoto: (opts: {
    quality: number;
    allowEditing: boolean;
    resultType: unknown;
    source: unknown;
    width?: number;
  }) => Promise<{ dataUrl?: string }>;
}

async function loadPlugin(): Promise<{
  Camera: CameraLike;
  CameraResultType: { DataUrl: unknown };
  CameraSource: { Camera: unknown };
} | null> {
  try {
    const mod = (await import(
      /* @vite-ignore */ '@capacitor/camera' as unknown as string
    )) as {
      Camera?: CameraLike;
      CameraResultType?: { DataUrl: unknown };
      CameraSource?: { Camera: unknown };
    };
    if (!mod.Camera || !mod.CameraResultType || !mod.CameraSource) return null;
    return {
      Camera: mod.Camera,
      CameraResultType: mod.CameraResultType,
      CameraSource: mod.CameraSource,
    };
  } catch {
    return null;
  }
}

export async function capturePhoto(): Promise<CaptureResult> {
  if (isNative()) {
    try {
      const plugin = await loadPlugin();
      if (plugin) {
        const photo = await plugin.Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: plugin.CameraResultType.DataUrl,
          source: plugin.CameraSource.Camera,
          width: MAX_DIMENSION,
        });
        if (!photo.dataUrl) return { ok: false, reason: 'No image captured' };
        return {
          ok: true,
          data_url: photo.dataUrl,
          mime_type: 'image/jpeg',
          size_bytes: estimateBase64Bytes(photo.dataUrl),
        };
      }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : 'Camera error',
      };
    }
  }

  // Web fallback — file picker with camera hint
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    (input as HTMLInputElement & { capture?: string }).capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, reason: 'No file selected' });
        return;
      }
      const compressed = await compressImage(file);
      resolve(compressed);
    };
    input.click();
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4);
}

async function compressImage(file: File): Promise<CaptureResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height * MAX_DIMENSION) / width;
            width = MAX_DIMENSION;
          } else {
            width = (width * MAX_DIMENSION) / height;
            height = MAX_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ ok: false, reason: 'Canvas unsupported' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
        resolve({
          ok: true,
          data_url: dataUrl,
          mime_type: 'image/jpeg',
          size_bytes: estimateBase64Bytes(dataUrl),
        });
      };
      img.onerror = () => resolve({ ok: false, reason: 'Image decode failed' });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ ok: false, reason: 'File read failed' });
    reader.readAsDataURL(file);
  });
}
