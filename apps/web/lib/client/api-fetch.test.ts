/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, apiFetchRaw, apiPost, apiPut, apiPatch, ApiClientError } from './api-fetch';

describe('ApiClientError', () => {
  it('is an instance of Error', () => {
    const error = new ApiClientError('Something went wrong', 'ERROR_CODE', 500);
    expect(error).toBeInstanceOf(Error);
  });

  it('carries message, code, and status', () => {
    const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('has correct name', () => {
    const error = new ApiClientError('Test', 'TEST', 400);
    expect(error.name).toBe('ApiClientError');
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('success cases', () => {
    it('returns unwrapped data from standard success envelope', async () => {
      const mockData = { id: 1, title: 'Video' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await apiFetch('/api/videos/1');
      expect(result).toEqual(mockData);
    });

    it('preserves data type (array)', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await apiFetch('/api/videos');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockData);
    });

    it('preserves data type (null)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: null }),
      });

      const result = await apiFetch('/api/endpoint');
      expect(result).toBeNull();
    });

    it('respects 201 Created status', async () => {
      const mockData = { id: 1 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await apiFetch('/api/videos');
      expect(result).toEqual(mockData);
    });
  });

  describe('standard failure envelope', () => {
    it('throws ApiClientError with server message and code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            success: false,
            error: { message: 'Video not found', code: 'NOT_FOUND' },
          }),
      });

      try {
        await apiFetch('/api/videos/999');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('Video not found');
        expect((error as ApiClientError).code).toBe('NOT_FOUND');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('preserves validation error message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            success: false,
            error: { message: 'Title is required', code: 'VALIDATION_ERROR' },
          }),
      });

      try {
        await apiFetch('/api/videos', { method: 'POST' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Title is required');
        expect((error as ApiClientError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('handles 401 unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            success: false,
            error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
          }),
      });

      try {
        await apiFetch('/api/protected');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).status).toBe(401);
        expect((error as ApiClientError).code).toBe('UNAUTHORIZED');
      }
    });

    it('handles 409 conflict', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () =>
          JSON.stringify({
            success: false,
            error: { message: 'Email already registered', code: 'CONFLICT' },
          }),
      });

      try {
        await apiFetch('/api/auth/signup', { method: 'POST' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).status).toBe(409);
        expect((error as ApiClientError).code).toBe('CONFLICT');
      }
    });
  });

  describe('frozen-contract error shape', () => {
    it('throws on frozen-contract top-level { error: "..." } shape', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'code must be a UUID' }),
      });

      try {
        await apiFetch('/api/extension/pair/init', { method: 'POST' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('code must be a UUID');
        expect((error as ApiClientError).code).toBe('API_ERROR');
        expect((error as ApiClientError).status).toBe(400);
      }
    });

    it('handles frozen-contract 404 with string error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Pairing request not found' }),
      });

      try {
        await apiFetch('/api/extension/pair/status');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe(
          'Pairing request not found'
        );
        expect((error as ApiClientError).code).toBe('API_ERROR');
      }
    });
  });

  describe('non-JSON and empty body handling', () => {
    it('throws sensible error on empty response body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      });

      try {
        await apiFetch('/api/broken');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe(
          'Internal server error'
        );
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
        expect((error as ApiClientError).status).toBe(500);
      }
    });

    it('throws sensible error on invalid JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => '<html><body>Bad Gateway</body></html>',
      });

      try {
        await apiFetch('/api/external');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(502);
        // Should use HTTP status fallback
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
      }
    });

    it('throws sensible error on whitespace-only body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => '   \n\t  ',
      });

      try {
        await apiFetch('/api/unavailable');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(503);
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
      }
    });
  });

  describe('HTTP status fallback messages', () => {
    it('uses 401 Unauthorized fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '',
      });

      try {
        await apiFetch('/api/protected');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Unauthorized');
      }
    });

    it('uses 403 Forbidden fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'null',
      });

      try {
        await apiFetch('/api/resource');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Forbidden');
      }
    });

    it('uses 404 Not found fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'null',
      });

      try {
        await apiFetch('/api/missing');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Not found');
      }
    });

    it('uses 409 Conflict fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => 'null',
      });

      try {
        await apiFetch('/api/create');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Conflict');
      }
    });

    it('uses 413 Payload too large fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => '',
      });

      try {
        await apiFetch('/api/upload');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Payload too large');
      }
    });

    it('uses 500 Internal server error fallback', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'null',
      });

      try {
        await apiFetch('/api/broken');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Internal server error');
      }
    });

    it('uses generic HTTP fallback for unknown status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 418, // I'm a teapot
        text: async () => 'null',
      });

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('HTTP 418');
      }
    });
  });

  describe('invalid response validation', () => {
    it('throws on success response missing success field', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { id: 1 } }),
      });

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
        expect((error as ApiClientError).message).toContain('envelope');
      }
    });

    it('throws on success response with success=false', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: false, error: {} }),
      });

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      }
    });

    it('throws on success response missing data field', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
        expect((error as ApiClientError).message).toContain('data');
      }
    });

    it('throws on success response with data=undefined', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: undefined }),
      });

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      }
    });
  });

  describe('network errors', () => {
    it('throws ApiClientError on fetch network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      (global.fetch as any).mockRejectedValueOnce(networkError);

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
        expect((error as ApiClientError).status).toBe(0);
      }
    });

    it('handles fetch error with generic message', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection timeout'));

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Connection timeout');
      }
    });

    it('handles non-Error fetch rejection', async () => {
      (global.fetch as any).mockRejectedValueOnce('Something failed');

      try {
        await apiFetch('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Network request failed');
      }
    });
  });

  describe('request options passthrough', () => {
    it('passes through fetch options', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: {} }),
      });

      await apiFetch('/api/endpoint', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/endpoint', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer token' },
      });
    });
  });
});

describe('apiPost', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets method to POST and Content-Type header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    await apiPost('/api/videos', { title: 'New Video' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('serializes body to JSON', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    const body = { title: 'New Video', duration: 1234 };
    await apiPost('/api/videos', body);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos',
      expect.objectContaining({
        body: JSON.stringify(body),
      })
    );
  });

  it('returns unwrapped data', async () => {
    const mockData = { id: 1, title: 'Created' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ success: true, data: mockData }),
    });

    const result = await apiPost('/api/videos', { title: 'New' });
    expect(result).toEqual(mockData);
  });

  it('throws on error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: 'Invalid title', code: 'VALIDATION_ERROR' },
        }),
    });

    try {
      await apiPost('/api/videos', { title: '' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as ApiClientError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('preserves additional headers', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ success: true, data: {} }),
    });

    await apiPost('/api/videos', { title: 'New' }, {
      headers: { 'X-Custom-Header': 'value' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom-Header': 'value',
        }),
      })
    );
  });
});

describe('apiPut', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets method to PUT and Content-Type header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    await apiPut('/api/videos/1', { title: 'Updated' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos/1',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('serializes body to JSON', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    const body = { title: 'Updated Title' };
    await apiPut('/api/videos/1', body);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos/1',
      expect.objectContaining({
        body: JSON.stringify(body),
      })
    );
  });

  it('returns unwrapped data', async () => {
    const mockData = { id: 1, title: 'Updated' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: mockData }),
    });

    const result = await apiPut('/api/videos/1', { title: 'Updated' });
    expect(result).toEqual(mockData);
  });

  it('throws on error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: 'Video not found', code: 'NOT_FOUND' },
        }),
    });

    try {
      await apiPut('/api/videos/999', { title: 'Updated' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as ApiClientError).code).toBe('NOT_FOUND');
    }
  });
});

describe('apiPatch', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets method to PATCH and Content-Type header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    await apiPatch('/api/videos/1', { title: 'Patched' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos/1',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('serializes body to JSON', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });

    const body = { title: 'Patched Title' };
    await apiPatch('/api/videos/1', body);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/videos/1',
      expect.objectContaining({
        body: JSON.stringify(body),
      })
    );
  });

  it('returns unwrapped data', async () => {
    const mockData = { id: 1, title: 'Patched' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: mockData }),
    });

    const result = await apiPatch('/api/videos/1', { title: 'Patched' });
    expect(result).toEqual(mockData);
  });

  it('throws on error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: 'Conflict', code: 'CONFLICT' },
        }),
    });

    try {
      await apiPatch('/api/videos/1', { title: 'Patched' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as ApiClientError).code).toBe('CONFLICT');
    }
  });
});

describe('apiFetchRaw', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('raw success cases (frozen contract shapes)', () => {
    it('returns top-level body for POST /api/extension/pair/init success shape', async () => {
      const mockResponse = {
        success: true,
        code: '550e8400-e29b-41d4-a716-446655440000',
        expiresAt: '2026-08-21T19:13:45.123Z',
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await apiFetchRaw('/api/extension/pair/init', {
        method: 'POST',
      })) as typeof mockResponse;
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.code).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('returns top-level body for GET /api/extension/pair/status success shape', async () => {
      const mockResponse = {
        status: 'approved',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await apiFetchRaw('/api/extension/pair/status')) as typeof mockResponse;
      expect(result).toEqual(mockResponse);
      expect(result.status).toBe('approved');
      expect(result.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    });

    it('returns top-level body for POST /api/upload success shape', async () => {
      const mockResponse = {
        success: true,
        url: 'https://cdn.bunny.com/videos/abc123.mp4',
        video: {
          id: 'video-uuid',
          title: 'My Recording',
          duration: 1234,
          workspaceId: 'workspace-uuid',
        },
        service: 'bunny',
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await apiFetchRaw('/api/upload', { method: 'POST' })) as typeof mockResponse;
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.url).toContain('bunny.com');
      expect(result.video.id).toBe('video-uuid');
    });

    it('respects 201 Created status for raw responses', async () => {
      const mockResponse = { status: 'pending' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await apiFetchRaw('/api/endpoint');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('raw failure cases (frozen contract error shapes)', () => {
    it('throws ApiClientError on frozen { error: string } shape', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'code must be a UUID' }),
      });

      try {
        await apiFetchRaw('/api/extension/pair/init', { method: 'POST' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('code must be a UUID');
        expect((error as ApiClientError).code).toBe('API_ERROR');
        expect((error as ApiClientError).status).toBe(400);
      }
    });

    it('throws on frozen 404 with string error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Pairing request not found' }),
      });

      try {
        await apiFetchRaw('/api/extension/pair/status');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Pairing request not found');
        expect((error as ApiClientError).code).toBe('API_ERROR');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('throws on standard failure envelope (pattern 1)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            success: false,
            error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
          }),
      });

      try {
        await apiFetchRaw('/api/frozen-route');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Validation failed');
        expect((error as ApiClientError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws sensible error on empty response body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      });

      try {
        await apiFetchRaw('/api/frozen-route');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
        expect((error as ApiClientError).message).toBe('Internal server error');
      }
    });

    it('throws sensible error on invalid JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => '<html><body>Bad Gateway</body></html>',
      });

      try {
        await apiFetchRaw('/api/frozen-route');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(502);
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
      }
    });

    it('uses HTTP status fallback for 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '',
      });

      try {
        await apiFetchRaw('/api/upload');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ApiClientError).message).toBe('Unauthorized');
        expect((error as ApiClientError).code).toBe('HTTP_ERROR');
        expect((error as ApiClientError).status).toBe(401);
      }
    });

    it('uses HTTP status fallback for 413 Payload too large', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => JSON.stringify({ error: 'File too large' }),
      });

      try {
        await apiFetchRaw('/api/upload');
        expect.fail('Should have thrown');
      } catch (error) {
        // Should match frozen error shape first
        expect((error as ApiClientError).message).toBe('File too large');
        expect((error as ApiClientError).code).toBe('API_ERROR');
      }
    });
  });

  describe('raw mode with network errors', () => {
    it('throws ApiClientError on fetch network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      (global.fetch as any).mockRejectedValueOnce(networkError);

      try {
        await apiFetchRaw('/api/endpoint');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
        expect((error as ApiClientError).status).toBe(0);
      }
    });
  });

  describe('raw mode edge cases', () => {
    it('throws on empty/null JSON body on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      });

      try {
        await apiFetchRaw('/api/frozen-route');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      }
    });

    it('throws on malformed JSON on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'not valid json',
      });

      try {
        await apiFetchRaw('/api/frozen-route');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      }
    });
  });
});

describe('apiFetch strict envelope validation (regression)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('still rejects success without standard envelope', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'pending', token: 'xyz' }),
    });

    try {
      await apiFetch('/api/standard-route');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      expect((error as ApiClientError).message).toContain('envelope');
    }
  });

  it('still rejects success with success=true but wrong data shape', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          code: 'uuid',
          expiresAt: 'timestamp',
        }),
    });

    try {
      await apiFetch('/api/standard-route');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
      expect((error as ApiClientError).message).toContain('data');
    }
  });
});
