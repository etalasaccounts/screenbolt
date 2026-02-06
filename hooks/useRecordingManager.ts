import { useCallback, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setCountdownState,
  setRecording,
  setStandby,
} from "@/store/slices/mediaSlice";
import { useMediaRedux } from "@/hooks/use-media-redux";
import { toast } from "sonner";
import { useScreenRecording } from "@/hooks/useScreenRecording";
import { mediaStreamManager } from "@/lib/services/MediaStreamManager";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { generateThumbnailFromVideoBlob } from "@/lib/video-utils";
import { uploadVideoWithFallback } from "@/lib/universal-upload";
import { compressVideo, shouldCompress } from "@/lib/video-compression";
import type { StorageProvider } from "@/lib/storage-config";

export function useRecordingManager() {
  const dispatch = useAppDispatch();
  const {
    isRecording,
    countdownState,
    isCountdownPaused,
    cameraActive,
    selectedStorage,
  } = useAppSelector((state) => state.media);
  const { user } = useCurrentUser();
  const { data: workspace } = useWorkspace();
  const router = useRouter();

  const {
    startRecording,
    stopRecording,
    resumeRecording,
    pauseRecording,
    isPaused,
  } = useScreenRecording();

  const { deactivateCamera } = useMediaRedux();

  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear countdown timeouts
  const clearCountdownTimeouts = useCallback(() => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  // Start recording with countdown
  const startRecordingProcess = useCallback(async () => {
    if (isRecording) {
      return false;
    }

    try {
      // First, capture the screen - this will prompt user for screen selection
      let screenStream = mediaStreamManager.screenStream;
      if (!screenStream) {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });

          // Store the screen stream in the manager
          mediaStreamManager.setScreenStream(screenStream);

          // Add event listener for when user stops sharing
          screenStream.getVideoTracks()[0].addEventListener("ended", () => {
            console.log("Screen sharing ended by user");
            mediaStreamManager.setScreenStream(null);
          });
        } catch (error) {
          console.error("Error capturing screen:", error);
          toast.error(
            "Screen capture was cancelled or failed. Please try again and select a screen to record."
          );
          return false;
        }
      }

      // Verify screen stream is still active before proceeding
      if (!screenStream || !screenStream.active) {
        console.error("Screen stream is not active:", screenStream);
        toast.error("Screen stream is not available. Please try again.");
        return false;
      }

      console.log("Screen stream captured successfully:", screenStream);
      console.log("Screen stream tracks:", screenStream.getTracks().map(t => ({ 
        kind: t.kind, 
        enabled: t.enabled, 
        readyState: t.readyState 
      })));

      // Get microphone stream if mic is active
      const micStream = mediaStreamManager.microphoneStream;
      console.log("Microphone stream:", micStream);

      // Start countdown sequence: standby -> rolling -> action -> recording
      dispatch(setCountdownState("standby"));

      // Standby phase (1 second)
      countdownTimeoutRef.current = setTimeout(() => {
        // Verify stream is still active before continuing
        if (!screenStream || !screenStream.active) {
          console.error("Screen stream became inactive during countdown");
          toast.error("Screen sharing was stopped. Please try again.");
          dispatch(setCountdownState("inactive"));
          return;
        }

        dispatch(setCountdownState("rolling"));

        // Rolling phase (1 second)
        countdownTimeoutRef.current = setTimeout(() => {
          // Verify stream is still active before continuing
          if (!screenStream || !screenStream.active) {
            console.error("Screen stream became inactive during countdown");
            toast.error("Screen sharing was stopped. Please try again.");
            dispatch(setCountdownState("inactive"));
            return;
          }

          dispatch(setCountdownState("action"));

          // Action phase (1 second)
          countdownTimeoutRef.current = setTimeout(async () => {
            // Final verification before starting recording
            if (!screenStream || !screenStream.active) {
              console.error("Screen stream became inactive before recording start");
              toast.error("Screen sharing was stopped. Please try again.");
              dispatch(setCountdownState("inactive"));
              return;
            }

            console.log("Starting actual recording with verified stream");
            dispatch(setCountdownState("inactive"));
            await startActualRecording(screenStream, micStream);
          }, 1000);
        }, 1000);
      }, 1000);

      return true;
    } catch (error: unknown) {
      console.error(
        "Error starting recording process:",
        error instanceof Error ? error.message : String(error)
      );
      toast.error("Error starting recording");
      dispatch(setRecording(false));
      dispatch(setCountdownState("inactive"));
      return false;
    }
  }, [isRecording, dispatch]);

  // Start actual recording without countdown
  const startActualRecording = useCallback(
    async (screenStream: MediaStream, micStream?: MediaStream | null) => {
      console.log('startActualRecording called with:');
      console.log('- screenStream:', screenStream);
      console.log('- screenStream tracks:', screenStream?.getTracks());
      console.log('- micStream:', micStream);
      console.log('- micStream tracks:', micStream?.getTracks());
      
      // Final validation before starting recording
      if (!screenStream || !screenStream.active) {
        console.error("Screen stream is not available or inactive");
        toast.error("Screen stream is not available. Please try again.");
        dispatch(setRecording(false));
        dispatch(setCountdownState("inactive"));
        return false;
      }
      
      try {
        console.log('=== CALLING startRecording ===');
        console.log('About to call startRecording with:');
        console.log('- screenStream:', screenStream);
        console.log('- screenStream active:', screenStream?.active);
        console.log('- micStream:', micStream);
        console.log('- micStream active:', micStream?.active);
        
        try {
          await startRecording(screenStream, micStream);
          console.log('=== startRecording COMPLETED ===');
          console.log('✅ startRecording completed without throwing');
        } catch (error) {
          console.error('❌ startRecording threw an error:', error);
          throw error;
        }
        
        dispatch(setRecording(true));
        toast.success("Recording started!");
        return true;
      } catch (error: unknown) {
        console.error(
          "Error starting actual recording:",
          error instanceof Error ? error.message : String(error)
        );
        console.error("Full error object:", error);
        toast.error("Error starting recording");
        dispatch(setRecording(false));
        dispatch(setCountdownState("inactive"));
        return false;
      }
    },
    [startRecording, dispatch]
  );

  // Stop recording process
  const stopRecordingProcess = useCallback(
    async (recordingDuration?: number) => {
      console.log("stopRecordingProcess called, isRecording:", isRecording);

      if (!isRecording) {
        return false;
      }

      try {
        // Stop the recording and get the blob
        const blob = await stopRecording();

        if (blob && user) {
          console.log("Recording stopped, blob size:", blob.size);
          console.log(
            "Recording duration from timer:",
            recordingDuration,
            "seconds"
          );

          // Reset recording state
          dispatch(setRecording(false));
          dispatch(setCountdownState("inactive"));
          dispatch(setStandby(false));

          // Deactivate camera to ensure it's properly stopped
          if (cameraActive) {
            deactivateCamera();
          }

          // Generate thumbnail
          const thumbnailUrl = await generateThumbnailFromVideoBlob(blob);

          // Create temporary video record in database
          const createVideoToast = toast.loading("Creating video record...");
          const response = await fetch("/api/videos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              workspaceId: workspace?.id,
              title: generateVideoTitleWithLocalTime(),
              duration: recordingDuration,
              thumbnailUrl,
              source: 'Local',
            }),
          });

          const data = await response.json();
          toast.dismiss(createVideoToast);

          if (data.success) {
            console.log("Video record created:", data.video);

            // Redirect to watch page immediately BEFORE uploading
            router.push(`/watch/${data.video.id}`);

            // Determine storage provider based on user selection
            let provider: StorageProvider;
            switch (selectedStorage) {
              case "dropbox":
                provider = "dropbox";
                break;
              case "google-drive":
                provider = "google-drive";
                break;
              default:
                provider = "bunny"; // Default to Bunny CDN (Screenbolt)
            }

            // Convert blob to file for upload
            const videoFile = new File([blob], `recording-${Date.now()}.webm`, {
              type: blob.type || 'video/webm',
              lastModified: Date.now(),
            });

            // Check if compression is recommended
            const shouldCompressVideo = shouldCompress(videoFile.size, 100 * 1024 * 1024, "high"); // 100MB threshold
            let finalFile = videoFile;

            if (shouldCompressVideo) {
              const compressionToast = toast.loading("Optimizing video...", {
                description: "Compressing video for faster upload...",
              });

              try {
                const compressedFile = await compressVideo(videoFile, "high", (progress) => {
                  toast.loading(`Optimizing video... ${Math.round(progress.percentage)}%`, {
                    description: "Compressing video for faster upload...",
                    id: compressionToast,
                  });
                });
                
                finalFile = compressedFile;
                toast.dismiss(compressionToast);
                toast.success("Video optimized successfully!");
              } catch (compressionError) {
                console.warn("Video compression failed, using original:", compressionError);
                toast.dismiss(compressionToast);
                // Continue with original file if compression fails
              }
            }

            // Upload using unified system with fallback
            const uploadToast = toast.loading(`Uploading to ${provider === "bunny" ? "Screenbolt" : provider === "dropbox" ? "Dropbox" : "Google Drive"}...`, {
              description: "Please wait while your video is being uploaded...",
            });

            try {
              const uploadResult = await uploadVideoWithFallback(finalFile, [provider], {
                filename: `recording-${Date.now()}.webm`,
                onProgress: (progress: any) => {
                  const providerName = progress.provider === "bunny" ? "Screenbolt" : 
                                     progress.provider === "dropbox" ? "Dropbox" : "Google Drive";
                  
                  toast.loading(`Uploading to ${providerName}... ${Math.round(progress.percentage)}%`, {
                    description: `${progress.loaded ? `${Math.round(progress.loaded / 1024 / 1024)}MB` : ""} uploaded${progress.total ? ` of ${Math.round(progress.total / 1024 / 1024)}MB` : ""}`,
                    id: uploadToast,
                  });
                },
              });

              if (uploadResult.success && uploadResult.url) {
                // Update video record with upload URL
                const updateResponse = await fetch("/api/videos", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    videoId: data.video.id,
                    videoUrl: uploadResult.url,
                    thumbnailUrl,
                    source: uploadResult.provider === "bunny" ? "Bunny" : 
                           uploadResult.provider === "dropbox" ? "Dropbox" : "Google Drive",
                  }),
                });

                const updateData = await updateResponse.json();
                console.log("Database update response:", updateData);

                if (updateData.success) {
                  const providerName = uploadResult.provider === "bunny" ? "Screenbolt" : 
                                     uploadResult.provider === "dropbox" ? "Dropbox" : "Google Drive";
                  
                  toast.success("Video uploaded successfully!", {
                    description: `Your video is now available for viewing on ${providerName}.`,
                    id: uploadToast,
                  });
                } else {
                  const providerName = uploadResult.provider === "bunny" ? "Screenbolt" : 
                                     uploadResult.provider === "dropbox" ? "Dropbox" : "Google Drive";
                  
                  toast.success(`Video uploaded to ${providerName}!`, {
                    description: "Note: There was an issue updating the database record.",
                    id: uploadToast,
                  });
                  console.warn("Failed to update video record in database:", updateData.error);
                }
              } else {
                throw new Error(uploadResult.error || "Upload failed");
              }
            } catch (uploadError: any) {
              console.error("Upload error:", uploadError);

              toast.error("Upload failed", {
                description: "Your video is saved but not uploaded. Please try again.",
                id: uploadToast,
              });

              // Create a download link for the user as fallback
              const url = URL.createObjectURL(finalFile);
              const a = document.createElement("a");
              a.href = url;
              a.download = `recording-${Date.now()}.webm`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          } else {
            throw new Error(
              data.error || "Failed to create temporary video record"
            );
          }
        } else {
          console.warn("No blob or user available");
        }

        return true;
      } catch (error: unknown) {
        console.error(
          "Error stopping recording:",
          error instanceof Error ? error.message : String(error)
        );
        toast.error("Error saving recording");

        // Reset state on error
        dispatch(setRecording(false));
        dispatch(setCountdownState("inactive"));
        dispatch(setStandby(false));
        return false;
      }
    },
    [
      isRecording,
      stopRecording,
      dispatch,
      user,
      router,
      selectedStorage,
      cameraActive,
      deactivateCamera,
      workspace,
    ]
  );

  // Resume recording
  const resumeRecordingProcess = useCallback(async () => {
    if (!isPaused) {
      return false;
    }

    try {
      await resumeRecording();
      toast.success("Recording resumed!");
      return true;
    } catch (error: unknown) {
      console.error(
        "Error resuming recording:",
        error instanceof Error ? error.message : String(error)
      );
      toast.error("Error resuming recording");
      return false;
    }
  }, [isPaused, resumeRecording]);

  // Pause recording
  const pauseRecordingProcess = useCallback(async () => {
    if (isPaused) {
      return false;
    }

    try {
      await pauseRecording();
      toast.success("Recording paused!");
      return true;
    } catch (error: unknown) {
      console.error(
        "Error pausing recording:",
        error instanceof Error ? error.message : String(error)
      );
      toast.error("Error pausing recording");
      return false;
    }
  }, [isPaused, pauseRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimeouts();
    };
  }, [clearCountdownTimeouts]);

  return {
    startRecordingProcess,
    stopRecordingProcess,
    resumeRecordingProcess,
    pauseRecordingProcess,
    clearCountdownTimeouts,
    isRecording,
    isPaused,
    countdownState,
    isCountdownPaused,
  };
}

const generateVideoTitleWithLocalTime = (): string => {
  const now = new Date();
  const localTime = now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `Recording ${localTime}`;
};
