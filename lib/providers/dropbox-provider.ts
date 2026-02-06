import { Dropbox } from 'dropbox';
import { ProviderInterface, UploadProgress, UploadResult } from '../universal-upload';

interface DropboxUploadSession {
  session_id: string;
  offset: number;
}

interface DropboxSharedLink {
  url: string;
  path: string;
}

class DropboxProvider implements ProviderInterface {
  private readonly chunkSize = 8 * 1024 * 1024; // 8MB chunks (Dropbox recommended)
  private readonly maxRetries = 3;
  private readonly sessionThreshold = 150 * 1024 * 1024; // 150MB - use sessions for files larger than this

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
        throw new Error('Dropbox access token not found');
      }

      const dbx = new Dropbox({ accessToken });
      
      // Ensure folder exists
      await this.ensureFolderExists(dbx);
      
      const path = `/screenbolt/${filename}`;
      let uploadResult: any;

      // Use upload session for large files, regular upload for smaller ones
      if (file.size > this.sessionThreshold) {
        uploadResult = await this.uploadLargeFile(dbx, file, path, onProgress);
      } else {
        uploadResult = await this.uploadSmallFile(dbx, file, path, onProgress);
      }

      // Create shared link
      const sharedLink = await this.createSharedLink(dbx, uploadResult.path_display);
      
      return {
        success: true,
        url: sharedLink.url,
        streamUrl: sharedLink.url,
        embedUrl: sharedLink.url,
        provider: 'dropbox',
        fileSize: file.size,
        originalFileSize: file.size,
        compressed: false,
      };
    } catch (error) {
      console.error('Dropbox upload failed:', error);
      return {
        success: false,
        provider: 'dropbox',
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
    // Dropbox supports up to 350GB with upload sessions
    return 350 * 1024 * 1024 * 1024; // 350GB
  }

  supportsChunkedUpload(): boolean {
    return true;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dropbox_access_token');
  }

  private async ensureFolderExists(dbx: Dropbox): Promise<void> {
    try {
      await dbx.filesCreateFolderV2({ 
        path: '/screenbolt', 
        autorename: false 
      });
    } catch (error: any) {
      // Ignore error if folder already exists (409 conflict)
      if (error.status !== 409) {
        throw error;
      }
    }
  }

  private async uploadSmallFile(
    dbx: Dropbox,
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any> {
    // For small files, use regular upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            stage: 'uploading',
            provider: 'dropbox',
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Use Dropbox API directly
      dbx.filesUpload({
        path,
        contents: file,
        mode: { '.tag': 'overwrite' },
        autorename: true,
      }).then(resolve).catch(reject);
    });
  }

  private async uploadLargeFile(
    dbx: Dropbox,
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any> {
    // Start upload session
    const sessionStart = await dbx.filesUploadSessionStart({
      contents: file.slice(0, this.chunkSize),
    });

    let uploadedBytes = this.chunkSize;
    const sessionId = sessionStart.result.session_id;

    onProgress?.({
      loaded: uploadedBytes,
      total: file.size,
      percentage: Math.round((uploadedBytes / file.size) * 100),
      stage: 'uploading',
      provider: 'dropbox',
    });

    // Upload remaining chunks
    while (uploadedBytes < file.size) {
      const chunkStart = uploadedBytes;
      const chunkEnd = Math.min(uploadedBytes + this.chunkSize, file.size);
      const chunk = file.slice(chunkStart, chunkEnd);
      const isLastChunk = chunkEnd === file.size;

      if (isLastChunk) {
        // Finish upload session
        const finishResult = await dbx.filesUploadSessionFinish({
          cursor: {
            session_id: sessionId,
            offset: uploadedBytes,
          },
          commit: {
            path,
            mode: { '.tag': 'overwrite' },
            autorename: true,
          },
          contents: chunk,
        });

        return finishResult.result;
      } else {
        // Append to session
        await this.uploadSessionAppend(dbx, sessionId, uploadedBytes, chunk);
        uploadedBytes = chunkEnd;

        onProgress?.({
          loaded: uploadedBytes,
          total: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
          stage: 'uploading',
          provider: 'dropbox',
        });
      }
    }

    throw new Error('Upload session completed unexpectedly');
  }

  private async uploadSessionAppend(
    dbx: Dropbox,
    sessionId: string,
    offset: number,
    chunk: Blob
  ): Promise<void> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        await dbx.filesUploadSessionAppendV2({
          cursor: {
            session_id: sessionId,
            offset,
          },
          contents: chunk,
        });
        return;
      } catch (error: any) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }

  private async createSharedLink(dbx: Dropbox, filePath: string): Promise<DropboxSharedLink> {
    try {
      // Try to create a new shared link
      const shareResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path: filePath,
        settings: {
          requested_visibility: { '.tag': 'public' },
          audience: { '.tag': 'public' },
          access: { '.tag': 'viewer' },
        },
      });

      return this.processSharedLink(shareResponse.result.url, filePath);
    } catch (error: any) {
      // If creation fails, try to get existing shared link
      try {
        const listResponse = await dbx.sharingListSharedLinks({
          path: filePath,
          direct_only: true,
        });

        if (listResponse.result.links.length > 0) {
          return this.processSharedLink(listResponse.result.links[0].url, filePath);
        }
      } catch (listError) {
        console.error('Failed to get existing shared links:', listError);
      }
      
      throw error;
    }
  }

  private processSharedLink(url: string, path: string): DropboxSharedLink {
    // Convert Dropbox shared link to raw format for video embedding
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete('dl');
      urlObj.searchParams.delete('raw');
      urlObj.searchParams.set('raw', '1');
      
      return {
        url: urlObj.toString(),
        path,
      };
    } catch (urlError) {
      // Fallback to string replacement
      let embedUrl = url.replace(/[?&]dl=[01]/g, '').replace(/[?&]raw=[01]/g, '');
      const separator = embedUrl.includes('?') ? '&' : '?';
      embedUrl = embedUrl + separator + 'raw=1';
      
      return {
        url: embedUrl,
        path,
      };
    }
  }
}

export const dropboxProvider = new DropboxProvider();