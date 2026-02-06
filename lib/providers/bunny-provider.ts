import { ProviderInterface, UploadProgress, UploadResult } from '../universal-upload';

const BUNNY_STREAM_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID;
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_BASE_URL = 'https://video.bunnycdn.com';

interface TUSUploadResponse {
  location: string;
}

interface BunnyVideoResponse {
  guid: string;
  title: string;
  length: number;
  status: number;
  framerate: number;
  rotation: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  captions: any[];
  hasMP4Fallback: boolean;
  collectionId: string;
  thumbnailFileName: string;
  averageWatchTime: number;
  totalWatchTime: number;
  category: string;
  chapters: any[];
  moments: any[];
  metaTags: any[];
  transcodingMessages: any[];
  dateUploaded: string;
  views: number;
}

class BunnyProvider implements ProviderInterface {
  private readonly chunkSize = 5 * 1024 * 1024; // 5MB chunks
  private readonly maxRetries = 3;

  async upload(
    file: File,
    options: {
      filename?: string;
      onProgress?: (progress: UploadProgress) => void;
    }
  ): Promise<UploadResult> {
    const { filename = file.name, onProgress } = options;

    try {
      // Initialize TUS upload session
      const uploadUrl = await this.initializeTUSUpload(file, filename);
      
      // Upload file in chunks using TUS protocol
      const videoGuid = await this.uploadFileInChunks(file, uploadUrl, onProgress);
      
      // Get video details
      const videoDetails = await this.getVideoDetails(videoGuid);
      
      return {
        success: true,
        url: `${BUNNY_STREAM_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoGuid}`,
        streamUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoGuid}`,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoGuid}`,
        provider: 'bunny',
        fileSize: file.size,
        originalFileSize: file.size,
        compressed: false,
      };
    } catch (error) {
      console.error('Bunny upload failed:', error);
      return {
        success: false,
        provider: 'bunny',
        fileSize: file.size,
        originalFileSize: file.size,
        compressed: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async validateFile(file: File): Promise<boolean> {
    // Check file type
    if (!file.type.startsWith('video/')) {
      return false;
    }

    // Bunny Stream supports most video formats
    const supportedTypes = [
      'video/mp4',
      'video/webm',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/mkv',
    ];

    return supportedTypes.some(type => file.type === type) || file.type.startsWith('video/');
  }

  getMaxFileSize(): number {
    // Bunny Stream supports very large files with chunked upload
    return 10 * 1024 * 1024 * 1024; // 10GB
  }

  supportsChunkedUpload(): boolean {
    return true;
  }

  private async initializeTUSUpload(file: File, filename: string): Promise<string> {
    const response = await fetch(`${BUNNY_STREAM_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_STREAM_API_KEY!,
        'Upload-Length': file.size.toString(),
        'Upload-Metadata': `filename ${btoa(filename)},filetype ${btoa(file.type)}`,
        'Tus-Resumable': '1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize TUS upload: ${response.statusText}`);
    }

    const location = response.headers.get('Location');
    if (!location) {
      throw new Error('No upload location returned from TUS initialization');
    }

    return location;
  }

  private async uploadFileInChunks(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    let uploadedBytes = 0;
    const totalBytes = file.size;

    while (uploadedBytes < totalBytes) {
      const chunkStart = uploadedBytes;
      const chunkEnd = Math.min(uploadedBytes + this.chunkSize, totalBytes);
      const chunk = file.slice(chunkStart, chunkEnd);

      await this.uploadChunk(uploadUrl, chunk, chunkStart, onProgress);
      
      uploadedBytes = chunkEnd;
      
      onProgress?.({
        loaded: uploadedBytes,
        total: totalBytes,
        percentage: Math.round((uploadedBytes / totalBytes) * 100),
        stage: 'uploading',
        provider: 'bunny',
      });
    }

    // Extract video GUID from upload URL
    const urlParts = uploadUrl.split('/');
    return urlParts[urlParts.length - 1];
  }

  private async uploadChunk(
    uploadUrl: string,
    chunk: Blob,
    offset: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const response = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            'AccessKey': BUNNY_STREAM_API_KEY!,
            'Upload-Offset': offset.toString(),
            'Content-Type': 'application/offset+octet-stream',
            'Tus-Resumable': '1.0.0',
          },
          body: chunk,
        });

        if (response.ok) {
          return;
        } else if (response.status === 409) {
          // Conflict - check current offset and resume
          const currentOffset = await this.getCurrentOffset(uploadUrl);
          if (currentOffset > offset) {
            return; // This chunk was already uploaded
          }
        }
        
        throw new Error(`Chunk upload failed: ${response.statusText}`);
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }

  private async getCurrentOffset(uploadUrl: string): Promise<number> {
    const response = await fetch(uploadUrl, {
      method: 'HEAD',
      headers: {
        'AccessKey': BUNNY_STREAM_API_KEY!,
        'Tus-Resumable': '1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload offset: ${response.statusText}`);
    }

    const offset = response.headers.get('Upload-Offset');
    return offset ? parseInt(offset, 10) : 0;
  }

  private async getVideoDetails(videoGuid: string): Promise<BunnyVideoResponse> {
    const response = await fetch(
      `${BUNNY_STREAM_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoGuid}`,
      {
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get video details: ${response.statusText}`);
    }

    return response.json();
  }
}

export const bunnyProvider = new BunnyProvider();