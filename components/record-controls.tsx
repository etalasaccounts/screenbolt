"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Video,
  VideoOff,
  Pause,
  Play as PlayIcon,
  X,
} from "lucide-react";
import { Rnd } from "react-rnd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useMediaRedux } from "@/hooks/use-media-redux";
import { setCountdownState, setRecording } from "@/store/slices/mediaSlice";
import { mediaStreamManager } from "@/lib/services/MediaStreamManager";
import { useScreenRecording } from "@/hooks/useScreenRecording";
import { toast } from "sonner";
import { useRecordingManager } from "@/hooks/useRecordingManager";

// Maximum recording time in seconds (10 minutes = 600 seconds)
const MAX_RECORDING_TIME = 600;

export function RecordControls() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dispatch = useAppDispatch();
  const {
    cameraActive,
    micActive,
    isRecording,
    countdownState,
    screenActive,
    cameraPermission,
  } = useAppSelector((state) => state.media);

  // State for recording timer
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Reference to streams via state to trigger re-renders on stream changes
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [localIsPaused, setLocalIsPaused] = useState(false);

  const {
    getSelectedVideoDeviceLabel,
    activateCamera,
    deactivateCamera,
    captureScreen,
  } = useMediaRedux();

  // Use the recording manager
  const {
    startRecordingProcess,
    stopRecordingProcess,
    resumeRecordingProcess,
    pauseRecordingProcess,
    clearCountdownTimeouts,
  } = useRecordingManager();

  // Get the actual recording pause state from useScreenRecording
  const { isPaused, stopRecording } = useScreenRecording();

  // Format time for display (MM:SS)
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Subscribe to stream changes
  useEffect(() => {
    // Initialize state from manager
    setCameraStream(mediaStreamManager.cameraStream);
    setScreenStream(mediaStreamManager.screenStream);

    // Listen for stream changes
    const onCameraStreamChanged = (stream: MediaStream | null) => {
      setCameraStream(stream);
    };

    const onScreenStreamChanged = (stream: MediaStream | null) => {
      setScreenStream(stream);
    };

    mediaStreamManager.on("cameraStreamChanged", onCameraStreamChanged);
    mediaStreamManager.on("screenStreamChanged", onScreenStreamChanged);

    return () => {
      mediaStreamManager.removeListener(
        "cameraStreamChanged",
        onCameraStreamChanged
      );
      mediaStreamManager.removeListener(
        "screenStreamChanged",
        onScreenStreamChanged
      );
    };
  }, []);

  // Effect to update video source when camera stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Start the timer for recording
  const startTimer = useCallback(() => {
    // Reset time
    setRecordingTime(0);

    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // Set new interval
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    setTimerInterval(interval);
  }, [timerInterval]);

  // Handle stopping recording and saving
  const handleStopRecording = useCallback(async () => {
    // Capture the recording time before stopping the timer
    const finalRecordingTime = recordingTime;

    // Stop the timer first
    stopTimer();

    // Reset local pause state
    setLocalIsPaused(false);

    // IMPORTANT: Stop recording FIRST before cleaning up streams
    // This ensures MediaRecorder can finalize the recording and generate the blob
    const result = await stopRecordingProcess(finalRecordingTime);
    console.log("Stop recording result:", result);

    // Only clean up streams AFTER recording has been processed
    // Explicitly stop the screen stream to remove browser's screen sharing UI
    if (mediaStreamManager.screenStream) {
      mediaStreamManager.screenStream
        .getTracks()
        .forEach((track) => track.stop());
      mediaStreamManager.setScreenStream(null);
    }

    // Deactivate camera to ensure it's properly stopped
    if (cameraActive) {
      deactivateCamera();
    }

    // Trigger the same event that browser 'Stop sharing' triggers
    // This ensures consistent behavior between custom stop button and browser stop
    mediaStreamManager.emit("screenSharingEnded", finalRecordingTime);
  }, [recordingTime, cameraActive, deactivateCamera, stopRecordingProcess]);

  // Effect to start timer when recording actually begins
  useEffect(() => {
    if (isRecording && !timerInterval && !localIsPaused) {
      // Start the timer when recording begins (only if not paused)
      startTimer();
    } else if (!isRecording && timerInterval) {
      // Clear timer when recording stops
      clearInterval(timerInterval);
      setTimerInterval(null);
      setRecordingTime(0);
    }

    // Check if recording has reached maximum time limit
    if (recordingTime >= MAX_RECORDING_TIME && isRecording) {
      toast.info("Recording telah mencapai batas maksimal 10 menit dan akan dihentikan otomatis.");
      handleStopRecording();
    }
  }, [isRecording, timerInterval, localIsPaused, startTimer, recordingTime]);

  // Effect to clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Toggle camera from controls
  const toggleCamera = async () => {
    if (cameraActive) {
      deactivateCamera();
    } else {
      await activateCamera();
    }
  };

  // Stop the timer
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };



  // Handle toggle pause/resume
  const handleTogglePause = async () => {
    // Check current state before toggling
    const wasRecording = !localIsPaused;

    const success = wasRecording ? await pauseRecordingProcess() : await resumeRecordingProcess();

    // Handle timer and local state based on what the state was before toggle
    if (success) {
      if (wasRecording) {
        // Was recording, now paused - stop timer
        setLocalIsPaused(true);
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
      } else {
        // Was paused, now recording - start timer
        setLocalIsPaused(false);
        if (timerInterval) {
          clearInterval(timerInterval);
        }

        const interval = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
        setTimerInterval(interval);
      }
    }
  };

  // Handle canceling recording (discard without saving)
  const handleCancelRecording = async () => {
    // Stop the timer first
    stopTimer();

    // Reset recording time and pause state
    setRecordingTime(0);
    setLocalIsPaused(false);

    // Stop all streams and reset state without saving
    try {
      // Stop the actual recording
      await stopRecording();

      // Explicitly stop the screen stream to remove browser's screen sharing UI
      if (mediaStreamManager.screenStream) {
        mediaStreamManager.screenStream
          .getTracks()
          .forEach((track) => track.stop());
        mediaStreamManager.setScreenStream(null);
      }

      // Deactivate camera to ensure it's properly stopped
      if (cameraActive) {
        deactivateCamera();
      }

      // Clear countdown timeouts
      clearCountdownTimeouts();

      // Reset recording state
      dispatch(setRecording(false));
      dispatch(setCountdownState("inactive"));

      // Show cancellation message
      toast.info("Recording cancelled");
    } catch (error) {
      console.error("Error canceling recording:", error);
      toast.error("Failed to cancel recording");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
      <Rnd
        default={{
          x: 20,
          y: typeof window !== "undefined" ? window.innerHeight - 200 : 0,
          width: cameraActive ? 360 : 200,
          height: cameraActive ? 180 : 60,
        }}
        style={{
          pointerEvents: "auto",
          position: "fixed",
          zIndex: 10000,
        }}
        bounds="window"
        minWidth={cameraActive ? 360 : 200}
        minHeight={cameraActive ? 180 : 60}
        dragHandleClassName="drag-handle"
      >
        <div
          className={`flex items-end h-full drag-handle`}
          style={{ touchAction: "none" }}
        >
          {/* Camera Preview - Only show when camera is active */}
          {cameraActive && (
            <div className="relative w-40 h-40 border-4 border-white overflow-hidden rounded-full mr-2 shadow-lg flex-shrink-0">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Device Label Overlay */}
              {/* <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 truncate">
                {getSelectedVideoDeviceLabel()}
              </div> */}
            </div>
          )}

          <div
            id="control-bar"
            className="flex items-center justify-center gap-2 h-fit backdrop-blur-sm dark:bg-black dark:border-white/[0.15] bg-gradient-to-b from-neutral-800 to-neutral-950 shadow-[0_1px_2px_#00000045,0_0_#000,inset_1px_1px_#ffffff5,inset_0_2px_1px_#ffffff50] rounded-full px-4 py-3"
            style={{ touchAction: "none" }}
          >
            {/* Record/Stop button */}
            <Button
              variant="ghost"
              size="icon"
              className={`[&_svg]:size-4 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-white/20 hover:bg-white/30"
              } rounded-full size-8`}
              onClick={
                isRecording ? handleStopRecording : startRecordingProcess
              }
              disabled={countdownState !== "inactive" && !isRecording}
            >
              {isRecording ? (
                <Square fill="white" className="text-white" />
              ) : (
                <Play fill="white" className="text-white" />
              )}
            </Button>

            {/* Recording timer - show when recording */}
            {isRecording && (
              <div
                className={`text-sm font-mono ${
                  localIsPaused ? "text-yellow-500" : "text-white"
                }`}
              >
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Pause/Resume button */}
            <Button
              variant="ghost"
              size="icon"
              className={`[&_svg]:size-4 ${
                localIsPaused
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-white/20 hover:bg-white/30"
              } rounded-full size-8`}
              onClick={handleTogglePause}
              disabled={!isRecording}
            >
              {localIsPaused ? (
                <PlayIcon fill="white" className="text-white" />
              ) : (
                <Pause fill="white" className="text-white" />
              )}
            </Button>

            {/* Camera button */}
            <Button
              variant="ghost"
              size="icon"
              className={`[&_svg]:size-4 rounded-full size-8 ${
                cameraPermission === "granted"
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-white/10 opacity-50 cursor-not-allowed"
              }`}
              onClick={toggleCamera}
              disabled={cameraPermission !== "granted"}
            >
              {cameraPermission !== "granted" ? (
                <VideoOff fill="white" className="text-white" />
              ) : cameraActive ? (
                <VideoOff fill="white" className="text-white" />
              ) : (
                <Video fill="white" className="text-white" />
              )}
            </Button>

            {/* Cancel button */}
            <Button
              variant="ghost"
              size="icon"
              className="[&_svg]:size-5 bg-white/20 hover:bg-white/30 rounded-full size-8"
              onClick={handleCancelRecording}
              disabled={!isRecording && countdownState === "inactive"}
            >
              <X fill="white" className="text-white" />
            </Button>
          </div>
        </div>
      </Rnd>
    </div>
  );
}
