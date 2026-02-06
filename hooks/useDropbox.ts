import { useState, useCallback } from "react";
import { Dropbox } from "dropbox";
import { useCurrentUser } from "@/hooks/use-auth";
import { validateFileSize, getProviderConfig } from "@/lib/storage-config";

interface DropboxUploadResult {
  url: string;
  path: string;
}

export function useDropbox() {
  const { user } = useCurrentUser();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const getDropboxClient = useCallback((accessToken: string) => {
    return new Dropbox({ accessToken });
  }, []);

  const ensureFolderExists = useCallback(async (dbx: any, path: string) => {
    try {
      await dbx.filesCreateFolderV2({ path, autorename: false });
    } catch (error: any) {
      // Ignore error if folder already exists (409 conflict)
      if (error.status === 409) {
        console.log("Folder already exists, continuing...");
        return;
      }
      // For other errors, log and re-throw
      console.error("Error creating folder:", error);
      throw error;
    }
  }, []);

  const uploadToDropbox = useCallback(
    async (
      accessToken: string,
      file: Blob,
      filename: string
    ): Promise<DropboxUploadResult | null> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsUploading(true);
      setProgress(0);

      try {
        const dbx = getDropboxClient(accessToken);

        // Simplified folder structure - just /screenbolt/
        const basePath = `/screenbolt`;
        await ensureFolderExists(dbx, basePath);

        // Create a unique path for the video
        const path = `${basePath}/${filename}`;

        console.log("Uploading file to Dropbox:", path);
        console.log("File size:", file.size, "bytes");
        console.log("File type:", file.type);

        // Validate file size using centralized configuration
        const validation = validateFileSize(file.size, 'dropbox', true); // true for direct upload
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        
        // Log warning if file is large
        if (validation.warning) {
          console.warn(validation.warning);
        }

        // Upload the file
        const response = await dbx.filesUpload({
          path,
          contents: file,
          mode: { ".tag": "overwrite" },
          autorename: true,
        });

        console.log("File uploaded successfully:", response.result);

        // Create a shared link with public visibility
        console.log("Creating shared link for:", response.result.path_display);
        let shareResponse;
        try {
          shareResponse = await dbx.sharingCreateSharedLinkWithSettings({
            path: response.result.path_display as string,
            settings: {
              requested_visibility: { ".tag": "public" }, // Make it publicly accessible
              audience: { ".tag": "public" }, // Public audience
              access: { ".tag": "viewer" }, // Read-only access
            },
          });
        } catch (shareError: any) {
          // If sharing fails, try to get an existing shared link
          console.log(
            "Failed to create shared link, checking for existing links:",
            shareError
          );
          try {
            const listResponse = await dbx.sharingListSharedLinks({
              path: response.result.path_display as string,
              direct_only: true,
            });

            if (listResponse.result.links.length > 0) {
              // Use the first existing link
              shareResponse = { result: listResponse.result.links[0] };
              console.log(
                "Using existing shared link:",
                shareResponse.result.url
              );
            } else {
              // If no existing link, re-throw the original error
              throw shareError;
            }
          } catch (listError) {
            // If both methods fail, re-throw the original error
            console.error("Failed to get existing shared links:", listError);
            throw shareError;
          }
        }

        console.log("Shared link created:", shareResponse.result.url);

        // Convert shared link to raw video URL for direct embedding
        // This allows the video to be embedded using HTML <video> tag
        let embedUrl = shareResponse.result.url;
        
        // Convert Dropbox shared link to raw format for video embedding
        try {
          const url = new URL(embedUrl);
          
          // Remove any existing download parameters
          url.searchParams.delete("dl");
          url.searchParams.delete("raw");
          
          // Add raw=1 parameter to serve video as raw file for embedding
          url.searchParams.set("raw", "1");
          
          embedUrl = url.toString();
        } catch (urlError) {
          console.error("Error processing Dropbox URL:", urlError);
          // Fallback to string replacement
          embedUrl = embedUrl.replace(/[?&]dl=[01]/g, '').replace(/[?&]raw=[01]/g, '');
          
          // Add raw=1 parameter
          const separator = embedUrl.includes('?') ? '&' : '?';
          embedUrl = embedUrl + separator + 'raw=1';
        }

        return {
          url: embedUrl, // Return embed-ready URL for database storage
          path: response.result.path_display as string,
        };
      } catch (error: any) {
        console.error("Dropbox upload error:", error);
        // Try to get more detailed error information
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }

        // Handle Dropbox-specific errors
        if (error.error) {
          console.error(
            "Dropbox error details:",
            JSON.stringify(error.error, null, 2)
          );
        }

        // Log additional debugging information
        console.error("Error status:", error.status);
        console.error("Error headers:", error.headers);
        console.error("Error response:", error.response);

        throw error;
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [getDropboxClient, user, ensureFolderExists]
  );

  return {
    uploadToDropbox,
    isUploading,
    progress,
  };
}
