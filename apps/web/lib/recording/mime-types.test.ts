/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pickSupportedMimeType, canStartMp4Recorder } from './mime-types';

const MP4_MIME = "video/mp4;codecs=avc1.42E01E,mp4a.40.2";
const WEBM_VP9_MIME = "video/webm;codecs=vp9,opus";

describe('pickSupportedMimeType', () => {
  let originalMediaRecorder: any;

  beforeEach(() => {
    // Store original MediaRecorder
    originalMediaRecorder = globalThis.MediaRecorder;
  });

  afterEach(() => {
    // Restore original MediaRecorder
    if (originalMediaRecorder) {
      (globalThis as any).MediaRecorder = originalMediaRecorder;
    } else {
      delete (globalThis as any).MediaRecorder;
    }
  });

  it('should return MP4 when isTypeSupported returns true and probe succeeds', () => {
    // Create a proper constructor function
    const mockConstructor = function (stream: MediaStream, options?: any) {
      if (options?.mimeType === MP4_MIME) {
        return {
          state: 'recording',
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      throw new Error('Unsupported mime type');
    };
    mockConstructor.isTypeSupported = vi.fn().mockImplementation((mime) => mime === MP4_MIME);

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = pickSupportedMimeType(mockStream);

    expect(result).toBe(MP4_MIME);
  });

  it('should choose WebM VP9 when MP4 probe throws NotSupportedError', () => {
    // This is the critical Windows/Chrome regression case
    const mockConstructor = function (stream: MediaStream, options?: any) {
      if (options?.mimeType === MP4_MIME) {
        // Advertise support but throw on start (the regression)
        return {
          state: 'recording',
          start: vi.fn().mockImplementation(() => {
            throw new DOMException('NotSupportedError', 'NotSupportedError');
          }),
          stop: vi.fn(),
        };
      }
      if (options?.mimeType === WEBM_VP9_MIME) {
        return {
          state: 'recording',
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      throw new Error('Unsupported mime type');
    };
    mockConstructor.isTypeSupported = vi.fn().mockImplementation((mime) =>
      mime === MP4_MIME || mime === WEBM_VP9_MIME
    );

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = pickSupportedMimeType(mockStream);

    // Should fall back to WebM VP9 because MP4 probe threw
    expect(result).toBe(WEBM_VP9_MIME);
  });

  it('should choose WebM VP9 when MP4 mime is not supported at all', () => {
    const mockConstructor = function (stream: MediaStream, options?: any) {
      if (options?.mimeType === WEBM_VP9_MIME) {
        return {
          state: 'recording',
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      throw new Error('Unsupported mime type');
    };
    mockConstructor.isTypeSupported = vi.fn().mockImplementation((mime) => mime === WEBM_VP9_MIME);

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = pickSupportedMimeType(mockStream);

    expect(result).toBe(WEBM_VP9_MIME);
  });

  it('should return undefined when MediaRecorder is undefined', () => {
    delete (globalThis as any).MediaRecorder;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = pickSupportedMimeType(mockStream);

    expect(result).toBeUndefined();
  });

  it('should choose MP4 without probe when no stream argument is passed', () => {
    const mockConstructor = vi.fn() as any;
    mockConstructor.isTypeSupported = vi.fn().mockImplementation((mime) => mime === MP4_MIME);

    (globalThis as any).MediaRecorder = mockConstructor;

    const result = pickSupportedMimeType();

    // Should return MP4 based on isTypeSupported alone, without constructing a probe
    expect(result).toBe(MP4_MIME);
    // Verify MediaRecorder constructor was never called (no probe was made)
    expect(mockConstructor).not.toHaveBeenCalled();
  });

  it('should return undefined when no supported mime types are found', () => {
    const mockConstructor = vi.fn() as any;
    mockConstructor.isTypeSupported = vi.fn().mockReturnValue(false);

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = pickSupportedMimeType(mockStream);

    expect(result).toBeUndefined();
  });
});

describe('canStartMp4Recorder', () => {
  let originalMediaRecorder: any;

  beforeEach(() => {
    originalMediaRecorder = globalThis.MediaRecorder;
  });

  afterEach(() => {
    if (originalMediaRecorder) {
      (globalThis as any).MediaRecorder = originalMediaRecorder;
    } else {
      delete (globalThis as any).MediaRecorder;
    }
  });

  it('should return true when probe starts successfully', () => {
    const mockConstructor = function (_stream: MediaStream, _options?: any) {
      return {
        state: 'recording',
        start: vi.fn(),
        stop: vi.fn(),
      };
    };

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = canStartMp4Recorder(mockStream, MP4_MIME);

    expect(result).toBe(true);
  });

  it('should return false when probe throws', () => {
    const mockConstructor = function (_stream: MediaStream, _options?: any) {
      const recorder = {
        state: 'recording',
        start: vi.fn().mockImplementation(() => {
          throw new DOMException('NotSupportedError', 'NotSupportedError');
        }),
        stop: vi.fn(),
      };
      return recorder;
    };

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = canStartMp4Recorder(mockStream, MP4_MIME);

    expect(result).toBe(false);
  });

  it('should stop the probe recorder even if stop throws', () => {
    const stopMock = vi.fn().mockImplementation(() => {
      throw new Error('Stop failed');
    });

    const mockConstructor = function (_stream: MediaStream, _options?: any) {
      return {
        state: 'recording',
        start: vi.fn(),
        stop: stopMock,
      };
    };

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    // Should not throw even though stop() throws
    const result = canStartMp4Recorder(mockStream, MP4_MIME);

    expect(result).toBe(true);
    expect(stopMock).toHaveBeenCalled();
  });

  it('should return true when stream is not provided', () => {
    (globalThis as any).MediaRecorder = vi.fn();

    const result = canStartMp4Recorder(null as any, MP4_MIME);

    expect(result).toBe(true);
  });

  it('should return true when MediaRecorder is undefined', () => {
    delete (globalThis as any).MediaRecorder;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = canStartMp4Recorder(mockStream, MP4_MIME);

    expect(result).toBe(true);
  });

  it('should not try to stop if recorder is null', () => {
    const stopMock = vi.fn();

    const mockConstructor = function (_stream: MediaStream, _options?: any) {
      return {
        state: 'inactive', // Already inactive, so stop() should not be called
        start: vi.fn().mockImplementation(() => {
          throw new Error('Start failed');
        }),
        stop: stopMock,
      };
    };

    (globalThis as any).MediaRecorder = mockConstructor;

    const mockStream = { getTracks: () => [] } as any as MediaStream;
    const result = canStartMp4Recorder(mockStream, MP4_MIME);

    expect(result).toBe(false);
    // stop() should not be called because state is 'inactive'
    expect(stopMock).not.toHaveBeenCalled();
  });
});
