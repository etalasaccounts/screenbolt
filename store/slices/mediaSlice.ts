import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface MediaState {
  micPermission: "granted" | "denied" | "prompt";
  cameraPermission: "granted" | "denied" | "prompt";
  micActive: boolean;
  cameraActive: boolean;
  screenActive: boolean;
  audioDevices: MediaDevice[];
  videoDevices: MediaDevice[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  selectedStorage: "screenbolt" | "dropbox" | "google-drive";
  isStandby: boolean;
  isRecording: boolean;
  countdownState: "inactive" | "standby" | "rolling" | "action" | "recording";
  isCountdownPaused: boolean;
}

const initialState: MediaState = {
  micPermission: "prompt",
  cameraPermission: "prompt",
  micActive: false,
  cameraActive: false,
  screenActive: false,
  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: "",
  selectedVideoDevice: "",
  selectedStorage: "dropbox",
  isStandby: false,
  isRecording: false,
  countdownState: "inactive",
  isCountdownPaused: false,
};

export const mediaSlice = createSlice({
  name: "media",
  initialState,
  reducers: {
    setMicPermission: (
      state,
      action: PayloadAction<"granted" | "denied" | "prompt">,
    ) => {
      state.micPermission = action.payload;
    },
    setCameraPermission: (
      state,
      action: PayloadAction<"granted" | "denied" | "prompt">,
    ) => {
      state.cameraPermission = action.payload;
    },
    setMicActive: (state, action: PayloadAction<boolean>) => {
      state.micActive = action.payload;
    },
    setCameraActive: (state, action: PayloadAction<boolean>) => {
      state.cameraActive = action.payload;
    },
    setScreenActive: (state, action: PayloadAction<boolean>) => {
      state.screenActive = action.payload;
    },
    setAudioDevices: (state, action: PayloadAction<MediaDevice[]>) => {
      state.audioDevices = action.payload;
    },
    setVideoDevices: (state, action: PayloadAction<MediaDevice[]>) => {
      state.videoDevices = action.payload;
    },
    setSelectedAudioDevice: (state, action: PayloadAction<string>) => {
      state.selectedAudioDevice = action.payload;
    },
    setSelectedVideoDevice: (state, action: PayloadAction<string>) => {
      state.selectedVideoDevice = action.payload;
    },
    setSelectedStorage: (
      state,
      action: PayloadAction<"screenbolt" | "dropbox" | "google-drive">,
    ) => {
      state.selectedStorage = action.payload;
    },
    setStandby: (state, action: PayloadAction<boolean>) => {
      state.isStandby = action.payload;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setCountdownState: (
      state,
      action: PayloadAction<
        "inactive" | "standby" | "rolling" | "action" | "recording"
      >,
    ) => {
      state.countdownState = action.payload;
    },
    setCountdownPaused: (state, action: PayloadAction<boolean>) => {
      state.isCountdownPaused = action.payload;
    },
    clearMediaState: (state) => {
      state.micActive = false;
      state.cameraActive = false;
      state.screenActive = false;
      state.isStandby = false;
      state.isRecording = false;
      state.countdownState = "inactive";
      state.isCountdownPaused = false;
    },
  },
});

export const {
  setMicPermission,
  setCameraPermission,
  setMicActive,
  setCameraActive,
  setScreenActive,
  setAudioDevices,
  setVideoDevices,
  setSelectedAudioDevice,
  setSelectedVideoDevice,
  setSelectedStorage,
  setStandby,
  setRecording,
  setCountdownState,
  setCountdownPaused,
  clearMediaState,
} = mediaSlice.actions;

export default mediaSlice.reducer;
