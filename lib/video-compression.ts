export type VideoQualityPreset = 'low' | 'medium' | 'high' | 'original';

export interface CompressionProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface CompressionOptions {
  quality: VideoQualityPreset;
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  framerate?: number;
  format?: 'webm' | 'mp4';
}

interface QualitySettings {
  maxWidth: number;
  maxHeight: number;
  bitrate: number; // in bps
  framerate: number;
  quality: number; // 0-1 for quality
}

const QUALITY_PRESETS: Record<VideoQualityPreset, QualitySettings> = {
  low: {
    maxWidth: 854,
    maxHeight: 480,
    bitrate: 500000, // 500 kbps
    framerate: 15,
    quality: 0.6,
  },
  medium: {
    maxWidth: 1280,
    maxHeight: 720,
    bitrate: 1500000, // 1.5 Mbps
    framerate: 24,
    quality: 0.7,
  },
  high: {
    maxWidth: 1920,
    maxHeight: 1080,
    bitrate: 3000000, // 3 Mbps
    framerate: 30,
    quality: 0.8,
  },
  original: {
    maxWidth: 3840,
    maxHeight: 2160,
    bitrate: 8000000, // 8 Mbps
    framerate: 60,
    quality: 0.9,
  },
};

/**
 * Compress a video file using client-side processing
 */
export async function compressVideo(
  file: File,
  quality: VideoQualityPreset = 'medium',
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> {
  if (quality === 'original') {
    return file;
  }

  const settings = QUALITY_PRESETS[quality];
  
  try {
    // Create video element to get dimensions and duration
    const video = await createVideoElement(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Calculate new dimensions maintaining aspect ratio
    const { width, height } = calculateDimensions(
      video.videoWidth,
      video.videoHeight,
      settings.maxWidth,
      settings.maxHeight
    );

    canvas.width = width;
    canvas.height = height;

    // Set up MediaRecorder for compression
    const stream = canvas.captureStream(settings.framerate);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: settings.bitrate,
    });

    const chunks: Blob[] = [];
    let recordedDuration = 0;
    const totalDuration = video.duration * 1000; // Convert to ms

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'video/webm',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error(`Compression failed: ${event}`));
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Play video and draw frames to canvas
      let frameCount = 0;
      const frameInterval = 1000 / settings.framerate;
      
      const drawFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        recordedDuration += frameInterval;
        frameCount++;

        // Update progress
        onProgress?.({
          loaded: recordedDuration,
          total: totalDuration,
          percentage: Math.min(Math.round((recordedDuration / totalDuration) * 100), 100),
        });

        // Schedule next frame
        setTimeout(drawFrame, frameInterval);
      };

      video.onloadeddata = () => {
        video.play();
        drawFrame();
      };

      // Handle video end
      video.onended = () => {
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      };
    });
  } catch (error) {
    console.error('Video compression failed:', error);
    throw error;
  }
}

/**
 * Get estimated compression ratio for a quality preset
 */
export function getCompressionRatio(quality: VideoQualityPreset): number {
  const ratios: Record<VideoQualityPreset, number> = {
    low: 0.2, // 80% reduction
    medium: 0.4, // 60% reduction
    high: 0.7, // 30% reduction
    original: 1.0, // No compression
  };
  
  return ratios[quality];
}

/**
 * Estimate compressed file size
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: VideoQualityPreset
): number {
  return Math.round(originalSize * getCompressionRatio(quality));
}

/**
 * Check if compression is recommended for a file
 */
export function shouldCompress(
  fileSize: number,
  maxSize: number,
  quality: VideoQualityPreset = 'medium'
): boolean {
  if (quality === 'original') return false;
  
  const estimatedSize = estimateCompressedSize(fileSize, quality);
  return fileSize > maxSize && estimatedSize <= maxSize;
}

/**
 * Get available quality presets based on original video dimensions
 */
export async function getAvailableQualities(file: File): Promise<VideoQualityPreset[]> {
  try {
    const video = await createVideoElement(file);
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    const availableQualities: VideoQualityPreset[] = ['original'];
    
    // Add qualities that would actually reduce the resolution
    Object.entries(QUALITY_PRESETS).forEach(([preset, settings]) => {
      if (preset !== 'original' && 
          (settings.maxWidth < originalWidth || settings.maxHeight < originalHeight)) {
        availableQualities.unshift(preset as VideoQualityPreset);
      }
    });
    
    return availableQualities;
  } catch (error) {
    console.error('Failed to analyze video:', error);
    return ['low', 'medium', 'high', 'original'];
  }
}

/**
 * Create a video element from a file
 */
function createVideoElement(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    video.onloadedmetadata = () => {
      resolve(video);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = Math.min(originalWidth, maxWidth);
  let height = Math.min(originalHeight, maxHeight);
  
  // Maintain aspect ratio
  if (width / height > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }
  
  // Ensure even dimensions for better encoding
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;
  
  return { width, height };
}

/**
 * Check if the browser supports video compression
 */
export function isCompressionSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const stream = canvas.captureStream();
    const mediaRecorder = new MediaRecorder(stream);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get compression statistics for a quality preset
 */
export function getCompressionStats(quality: VideoQualityPreset) {
  const settings = QUALITY_PRESETS[quality];
  const ratio = getCompressionRatio(quality);
  
  return {
    quality,
    settings,
    compressionRatio: ratio,
    estimatedSizeReduction: Math.round((1 - ratio) * 100),
    description: getQualityDescription(quality),
  };
}

function getQualityDescription(quality: VideoQualityPreset): string {
  const descriptions: Record<VideoQualityPreset, string> = {
    low: 'Smallest file size, good for slow connections',
    medium: 'Balanced quality and file size',
    high: 'High quality, larger file size',
    original: 'No compression, original quality',
  };
  
  return descriptions[quality];
}