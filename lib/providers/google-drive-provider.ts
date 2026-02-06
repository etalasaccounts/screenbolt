import { ProviderInterface, UploadProgress, UploadResult } from '../universal-upload';

interface GoogleDriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
}

class GoogleDriveProvider implements ProviderInterface {
  private readonly chunkSize = 256 * 1024; // 256KB chunks
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
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        throw new Error('Google Drive access token not found');
      }

      // Initialize resumable upload
      const uploadUrl = await this.initResumableUpload(accessToken, filename, file.type);
      if (!uploadUrl) {
        throw new Error('Failed to initialize resumable upload');
      }

      // Upload file in chunks
      const fileId = await this.uploadFileInChunks(file, uploadUrl, onProgress);
      if (!fileId) {
        throw new Error('Failed to upload file');
      }

      // Make file public
      const isPublic = await this.makeFilePublic(accessToken, fileId);
      if (!isPublic) {
        console.warn('Failed to make file public, it may not be accessible');
      }

      // Get file URLs
      const urls = this.getFileUrls(fileId);

      return {
        success: true,
        url: urls.webViewLink,
        streamUrl: urls.streamUrl,
        embedUrl: urls.streamUrl,
        provider: 'google-drive',
        fileSize: file.size,
        originalFileSize: file.size,
        compressed: false,
      };
    } catch (error) {
      console.error('Google Drive upload failed:', error);
      return {
        success: false,
        provider: 'google-drive',
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

    // Check if access token exists
    const accessToken = this.getAccessToken();
    return !!accessToken;
  }

  getMaxFileSize(): number {
    // Google Drive supports up to 5TB for videos
    return 5 * 1024 * 1024 * 1024 * 1024; // 5TB
  }

  supportsChunkedUpload(): boolean {
    return true;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('google_drive_access_token');
  }

  private async initResumableUpload(
    accessToken: string,
    filename: string,
    mimeType: string
  ): Promise<string | null> {
    try {
      const metadata = {
        name: filename,
        mimeType: mimeType,
      };

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to initialize resumable upload:', errorText);
        return null;
      }

      const uploadUrl = response.headers.get('Location');
      if (!uploadUrl) {
        console.error('Upload URL not found in response headers');
        return null;
      }

      return uploadUrl;
    } catch (error) {
      console.error('Error initializing resumable upload:', error);
      return null;
    }
  }

  private async uploadFileInChunks(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string | null> {
    const totalSize = file.size;
    let uploadedBytes = 0;

    while (uploadedBytes < totalSize) {
      const chunkStart = uploadedBytes;
      const chunkEnd = Math.min(uploadedBytes + this.chunkSize, totalSize);
      const chunk = file.slice(chunkStart, chunkEnd);

      const chunkBuffer = await chunk.arrayBuffer();
      const result = await this.uploadChunk(
        uploadUrl,
        chunkBuffer,
        chunkStart,
        chunkEnd - 1,
        totalSize
      );

      if (result === null) {
        throw new Error('Chunk upload failed');
      }

      uploadedBytes = chunkEnd;

      onProgress?.({
        loaded: uploadedBytes,
        total: totalSize,
        percentage: Math.round((uploadedBytes / totalSize) * 100),
        stage: 'uploading',
        provider: 'google-drive',
      });

      // If we got a file ID, the upload is complete
      if (typeof result === 'string') {
        return result;
      }
    }

    return null;
  }

  private async uploadChunk(
    uploadUrl: string,
    chunk: ArrayBuffer,
    startByte: number,
    endByte: number,
    totalSize: number
  ): Promise<string | null | undefined> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
            'Content-Length': chunk.byteLength.toString(),
          },
          body: chunk,
        });

        if (response.status === 308) {
          // Upload incomplete, continue with next chunk
          return undefined;
        } else if (response.status === 200 || response.status === 201) {
          // Upload complete
          const result = await response.json();
          return result.id;
        } else {
          throw new Error(`Upload failed with status: ${response.status}`);
        }
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          console.error(`Chunk upload failed after ${this.maxRetries} retries:`, error);
          return null;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }

    return null;
  }

  private getFileUrls(fileId: string) {
    return {
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      streamUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  private async makeFilePublic(accessToken: string, fileId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to make file public:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error making file public:', error);
      return false;
    }
  }
}

export const googleDriveProvider = new GoogleDriveProvider();