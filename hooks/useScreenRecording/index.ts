import { useState, useRef, useCallback } from 'react';

interface ScreenRecordingOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
}

interface UseScreenRecordingReturn {
  startRecording: (screenStream: MediaStream, microphoneStream?: MediaStream | null) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  resumeRecording: () => void;
  pauseRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  recordedBlob: Blob | null;
}

export function useScreenRecording({
  mimeType = 'video/webm;codecs=vp8,opus',
  videoBitsPerSecond = 2500000
}: ScreenRecordingOptions = {}): UseScreenRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Start recording
  const startRecording = useCallback(async (screenStream: MediaStream, microphoneStream?: MediaStream | null) => {
    console.log('=== useScreenRecording.startRecording called ===');
    console.log('Screen stream:', screenStream);
    console.log('Screen stream active:', screenStream?.active);
    console.log('Screen stream tracks:', screenStream?.getTracks().map(t => ({ 
      kind: t.kind, 
      enabled: t.enabled, 
      readyState: t.readyState,
      id: t.id,
      label: t.label
    })));
    console.log('Mic stream:', microphoneStream);
    console.log('Mic stream active:', microphoneStream?.active);

    // Validate input streams
    if (!screenStream || !screenStream.active) {
      console.error('Invalid or inactive screen stream provided');
      throw new Error('Invalid or inactive screen stream provided');
    }
    
    try {
      // Reset state
      recordedChunksRef.current = [];
      setIsRecording(true);
      setIsPaused(false);
      
      // Combine streams if microphone is available
      let combinedStream = screenStream;
      
      if (microphoneStream && microphoneStream.active) {
        console.log('Combining screen and microphone streams');
        // Create a new MediaStream with both video and audio tracks
        combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...microphoneStream.getAudioTracks()
        ]);
        console.log('Combined stream tracks:', combinedStream.getTracks().map(t => ({ 
          kind: t.kind, 
          enabled: t.enabled, 
          readyState: t.readyState,
          id: t.id,
          label: t.label
        })));
      }
      
      // Validate combined stream
      if (!combinedStream.active || combinedStream.getTracks().length === 0) {
        console.error('Combined stream is not active or has no tracks');
        setIsRecording(false);
        throw new Error('Combined stream is not active or has no tracks');
      }
      
      console.log('Creating MediaRecorder with mimeType:', mimeType, 'videoBitsPerSecond:', videoBitsPerSecond);
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }
      
      // Create MediaRecorder with fallback handling
      let mediaRecorder: MediaRecorder;
      try {
        // Check if the mimeType is supported
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn(`MimeType ${mimeType} is not supported, trying fallback`);
          const fallbackMimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(fallbackMimeType)) {
            throw new Error('No supported video format found');
          }
          console.log('Using fallback mimeType:', fallbackMimeType);
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: fallbackMimeType,
            videoBitsPerSecond
          });
        } else {
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond
          });
        }
        console.log('MediaRecorder created successfully with specified codec');
      } catch (codecError) {
        console.warn('Codec not supported, using default:', codecError);
        mediaRecorder = new MediaRecorder(combinedStream);
        console.log('MediaRecorder created with default codec');
      }
      
      console.log('MediaRecorder state:', mediaRecorder.state);
      console.log('MediaRecorder mimeType:', mediaRecorder.mimeType);
      
      mediaRecorderRef.current = mediaRecorder;
      console.log("=== MediaRecorder STORED IN REF ===");
      console.log("mediaRecorderRef.current:", mediaRecorderRef.current);
      console.log("mediaRecorderRef.current.state:", mediaRecorderRef.current?.state);
      console.log("Ref storage successful:", !!mediaRecorderRef.current);
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        console.log('MediaRecorder ondataavailable:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder onstop event (from startRecording)');
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error during recording:', event);
      };
      
      // Handle start
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
      };
      
      // Start recording
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder.start() called, state:', mediaRecorder.state);
      
      // Verify recording started
      setTimeout(() => {
        console.log('Post-start verification - MediaRecorder state:', mediaRecorder.state);
        console.log('Post-start verification - isRecording:', true);
      }, 100);
      
      console.log('useScreenRecording.startRecording completed successfully');
      
    } catch (error) {
      console.error('Error in useScreenRecording.startRecording:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsRecording(false);
      throw error;
    }
  }, [mimeType, videoBitsPerSecond]);
  
  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    console.log("=== STOP RECORDING CALLED ===");
    console.log("mediaRecorderRef.current:", mediaRecorderRef.current);
    console.log("mediaRecorderRef.current?.state:", mediaRecorderRef.current?.state);
    console.log("recordedChunks length:", recordedChunksRef.current.length);
    console.log("isRecording state:", isRecording);

    if (!mediaRecorderRef.current) {
      console.error("❌ MediaRecorder is null or undefined, cannot stop recording");
      return null;
    }

    if (mediaRecorderRef.current.state === "inactive") {
      console.error("❌ MediaRecorder is already inactive");
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      console.log("Setting up onstop handler...");
      mediaRecorder.onstop = () => {
        console.log("=== MediaRecorder STOPPED ===");
        console.log("Final recorded chunks:", recordedChunksRef.current.length);
        
        if (recordedChunksRef.current.length === 0) {
          console.error("❌ No recorded chunks available");
          resolve(null);
          return;
        }

        try {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          });
          console.log("✅ Blob created successfully:", blob.size, "bytes");
          resolve(blob);
        } catch (error) {
          console.error("❌ Error creating blob:", error);
          resolve(null);
        }
      };

      console.log("Calling mediaRecorder.stop()...");
      mediaRecorder.stop();
      console.log("mediaRecorder.stop() called, state:", mediaRecorder.state);
    });
  }, [isRecording]);
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  }, []);
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
    }
  }, []);
  
  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    recordedBlob
  };
}