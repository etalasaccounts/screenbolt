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
import { useDropbox } from "@/hooks/useDropbox";
import { generateThumbnailFromVideoBlob } from "@/lib/video-utils";
import { uploadVideoToBunny, validateVideoFileSize } from "@/lib/upload-video";

export function useRecordingManager() {
  const dispatch = useAppDispatch();
  const { isRecording, countdownState, isCountdownPaused, cameraActive, selectedStorage } =
    useAppSelector((state) => state.media);
  const { user } = useCurrentUser();
  const router = useRouter();

  const {
    startRecording,
    stopRecording,
    resumeRecording,
    pauseRecording,
    isPaused,
  } = useScreenRecording();

  const { deactivateCamera } = useMediaRedux();
  const { uploadToDropbox } = useDropbox();

  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear countdown timeouts
  const clearCountdownTimeouts = useCallback(() => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  // Start the recording process with countdown
  const startRecordingProcess = useCallback(async () => {
    if (isRecording) {
      console.log("Recording already in progress");
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

      // Get microphone stream if mic is active
      const micStream = mediaStreamManager.microphoneStream;

      // Start countdown sequence: standby -> rolling -> action -> recording
      dispatch(setCountdownState("standby"));

      // Standby phase (1 second)
      countdownTimeoutRef.current = setTimeout(() => {
        dispatch(setCountdownState("rolling"));

        // Rolling phase (1 second)
        countdownTimeoutRef.current = setTimeout(() => {
          dispatch(setCountdownState("action"));

          // Action phase (1 second)
          countdownTimeoutRef.current = setTimeout(async () => {
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
      try {
        await startRecording(screenStream, micStream);
        dispatch(setRecording(true));
        toast.success("Recording started!");
        return true;
      } catch (error: unknown) {
        console.error(
          "Error starting actual recording:",
          error instanceof Error ? error.message : String(error)
        );
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

          // Validate file size before proceeding
          const validation = validateVideoFileSize(blob);
          if (!validation.valid) {
            toast.error("File terlalu besar", {
              description: validation.error,
            });
            
            // Still allow download as fallback
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset state
            dispatch(setRecording(false));
            dispatch(setCountdownState("inactive"));
            dispatch(setStandby(false));
            return false;
          }

          // Reset recording state
          dispatch(setRecording(false));
          dispatch(setCountdownState("inactive"));
          dispatch(setStandby(false));

          // Deactivate camera to ensure it's properly stopped
          if (cameraActive) {
            deactivateCamera();
          }

          // Use the timer duration instead of extracting from blob
          const duration =
            recordingDuration && recordingDuration > 0 ? recordingDuration : 0;
          console.log("Duration being used for video creation:", duration);
          console.log(
            "Original recordingDuration parameter:",
            recordingDuration
          );

          // Show a loading toast for the create video process
          const createVideoToast = toast.loading(
            "Processing your recording..."
          );

          try {
            // Generate thumbnail from the video blob
            const thumbnailBlob = await generateThumbnailFromVideoBlob(blob);

            // If we have a thumbnail, upload it to Bunny.net
            let thumbnailUrl: string | undefined;
            if (thumbnailBlob) {
              try {
                // Upload thumbnail to Bunny.net using dedicated thumbnail endpoint
                const thumbnailResponse = await fetch("/api/upload-thumbnail", {
                  method: "POST",
                  body: (() => {
                    const formData = new FormData();
                    formData.append(
                      "thumbnail",
                      thumbnailBlob,
                      `thumbnail-${Date.now()}.jpg`
                    );
                    return formData;
                  })(),
                });

                const thumbnailData = await thumbnailResponse.json();
                if (thumbnailData.success) {
                  thumbnailUrl = thumbnailData.url;
                }
              } catch (thumbnailError) {
                console.error("Error uploading thumbnail:", thumbnailError);
              }
            }

            // Create temporary video record in database without URL
            const response = await fetch("/api/videos", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.id,
                workspaceId: workspace.id,
                duration: Math.round(duration),
                thumbnailUrl: thumbnailUrl,
                source: 'screen_recording',
                title: generateVideoTitleWithLocalTime(), // Use client-generated title with local time
              }),
            });

            const data = await response.json();

            if (data.success && data.video) {
              toast.dismiss(createVideoToast);

              // Redirect to watch page immediately BEFORE uploading
              router.push(`/watch/${data.video.id}`);

              // Try Dropbox upload only if user selected Dropbox storage
              if (selectedStorage === 'dropbox') {
                try {
                  const tokenResponse = await fetch("/api/auth/dropbox-token");

                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  const accessToken = tokenData.accessToken;

                  if (accessToken) {
                    // Show upload progress toast
                    toast.loading("Uploading to Dropbox...", {
                      description:
                        "Please wait while your video is being uploaded...",
                      id: "dropbox-upload",
                    });

                    try {
                      // Upload to Dropbox
                      const uploadResult = await uploadToDropbox(
                        accessToken,
                        blob,
                        `recording-${Date.now()}.webm`
                      );

                      if (uploadResult) {
                        // Update video record with Dropbox URL
                        const updateResponse = await fetch("/api/videos", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            videoId: data.video.id,
                            videoUrl: uploadResult.url,
                            thumbnailUrl, // Include thumbnail URL in update
                            source: "Dropbox", // Dropbox uses Dropbox storage
                          }),
                        });

                        const updateData = await updateResponse.json();
                        console.log("Database update response:", updateData);

                        if (updateData.success) {
                          toast.success("Video uploaded successfully!", {
                            description:
                              "Your video is now available for viewing.",
                            id: "dropbox-upload",
                          });
                        } else {
                          // Even if we couldn't update the database, the file was uploaded to Dropbox
                          toast.success("Video uploaded to Dropbox!", {
                            description:
                              "Note: There was an issue updating the database record.",
                            id: "dropbox-upload",
                          });
                          console.warn(
                            "Failed to update video record in database:",
                            updateData.error
                          );
                        }
                      } else {
                        throw new Error("Failed to upload video to Dropbox");
                      }
                    } catch (uploadError: any) {
                      console.error("Dropbox upload error:", uploadError);

                      // Check if it's a specific error we can handle
                      let errorMessage =
                        "Your video is saved but not uploaded to Dropbox.";
                      if (uploadError.error && uploadError.error.path) {
                        errorMessage = `Dropbox error: ${uploadError.error.path.reason}`;
                      } else if (uploadError.message) {
                        errorMessage = uploadError.message;
                      }

                      toast.error("Upload to Dropbox failed", {
                        description: errorMessage,
                        id: "dropbox-upload",
                      });

                      // Create a download link for the user
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `recording-${Date.now()}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  } else {
                    // Dropbox token not available
                    toast.error("Dropbox access not authorized", {
                      description:
                        "Please authenticate with Dropbox to enable cloud uploads.",
                      id: "dropbox-upload",
                    });

                    // Create a download link for the user
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `recording-${Date.now()}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                } else {
                  // Dropbox token API returned error
                  const errorData = await tokenResponse.json();
                  console.error("Dropbox token API error:", errorData);

                  toast.error("Dropbox access error", {
                    description:
                      errorData.error || "Failed to get Dropbox access token.",
                    id: "dropbox-upload",
                  });

                  // Create a download link for the user
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `recording-${Date.now()}.webm`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
                } catch (tokenError) {
                console.error("Failed to get Dropbox token:", tokenError);
                toast.error("Dropbox service unavailable", {
                  description:
                    "Video saved locally. Dropbox upload temporarily unavailable.",
                  id: "dropbox-upload",
                });

                // Create a download link for the user
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `recording-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                }
              } else {
                // User selected Screenbolt storage - upload to Bunny.net
                toast.loading("Uploading to Screenbolt...", {
                  description: "Please wait while your video is being uploaded...",
                  id: "bunny-upload",
                });

                try {
                  // Upload to Bunny.net with progress tracking
                  let uploadProgress = 0;
                  const bunnyUrl = await uploadVideoToBunny(blob, (progress) => {
                    uploadProgress = progress;
                    // Update toast with progress
                    toast.loading(`Uploading to Screenbolt... ${progress}%`, {
                      description: "Please wait while your video is being uploaded...",
                      id: "bunny-upload",
                    });
                  });

                  if (bunnyUrl) {
                    // Update video record with Bunny.net URL
                    const updateResponse = await fetch("/api/videos", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        videoId: data.video.id,
                        videoUrl: bunnyUrl,
                        thumbnailUrl,
                        source: "Bunny", // Bunny Stream service
                      }),
                    });

                    const updateData = await updateResponse.json();
                    console.log("Database update response:", updateData);

                    if (updateData.success) {
                      toast.success("Video uploaded successfully!", {
                        description: "Your video is now available for viewing.",
                        id: "bunny-upload",
                      });
                    } else {
                      toast.success("Video uploaded to Screenbolt!", {
                        description: "Note: There was an issue updating the database record.",
                        id: "bunny-upload",
                      });
                      console.warn("Failed to update video record in database:", updateData.error);
                    }
                  } else {
                    throw new Error("Failed to upload video to Bunny.net");
                  }
                } catch (uploadError: any) {
                  console.error("Bunny.net upload error:", uploadError);

                  toast.error("Upload to Screenbolt failed", {
                    description: "Your video is saved but not uploaded. Please try again.",
                    id: "bunny-upload",
                  });

                  // Create a download link for the user as fallback
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `recording-${Date.now()}.webm`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }
            } else {
              throw new Error(
                data.error || "Failed to create temporary video record"
              );
            }
          } catch (error) {
            console.error("Error processing video:", error);
            toast.dismiss(createVideoToast);
            toast.error("Failed to process video");

            // Fallback: download the video locally if processing fails
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          return true;
        }

        // Reset state
        dispatch(setRecording(false));
        dispatch(setCountdownState("inactive"));
        dispatch(setStandby(false));
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
    [isRecording, stopRecording, dispatch, user, router, uploadToDropbox, selectedStorage, cameraActive, deactivateCamera]
  );

  const togglePauseRecording = useCallback(async () => {
    if (!isRecording) {
      console.log("No recording in progress to pause/resume");
      return false;
    }

    try {
      if (isPaused) {
        await resumeRecording();
        toast.success("Recording resumed");
      } else {
        await pauseRecording();
        toast.success("Recording paused");
      }
      return true;
    } catch (error: unknown) {
      console.error(
        "Error toggling pause:",
        error instanceof Error ? error.message : String(error)
      );
      toast.error("Error pausing/resuming recording");
      return false;
    }
  }, [isRecording, isPaused, resumeRecording, pauseRecording]);

  // Handle countdown pause/resume
  useEffect(() => {
    if (countdownState === "recording") {
      if (isCountdownPaused) {
        // Pause countdown
        if (countdownTimeoutRef.current) {
          clearTimeout(countdownTimeoutRef.current);
          countdownTimeoutRef.current = null;
        }
      } else {
        // Resume countdown if it was paused
        // This would need more complex logic to resume from where it left off
        // For now, we'll just clear the timeouts when paused
      }
    }
  }, [isCountdownPaused, countdownState, dispatch, clearCountdownTimeouts]);

  // Listen for screen sharing ended event
  useEffect(() => {
    const handleScreenSharingEnded = async (recordingTime?: number) => {
      if (isRecording) {
        console.log("Screen sharing ended by user, stopping recording...");
        console.log("Recording time from event:", recordingTime);
        await stopRecordingProcess(recordingTime);
      }
    };

    mediaStreamManager.on("screenSharingEnded", handleScreenSharingEnded);

    return () => {
      mediaStreamManager.removeListener(
        "screenSharingEnded",
        handleScreenSharingEnded
      );
    };
  }, [isRecording, stopRecordingProcess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimeouts();
    };
  }, [clearCountdownTimeouts]);

  return {
    startRecordingProcess,
    startActualRecording,
    stopRecordingProcess,
    togglePauseRecording,
    clearCountdownTimeouts,
  };
}

// Generate video title with user's local time
const generateVideoTitleWithLocalTime = (): string => {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `Screen Recording ${formattedDate}`;
};
