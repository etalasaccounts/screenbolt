import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ok,
  fail,
  handleApiError,
  ApiSuccess,
  ApiFailure,
  ApiResponseBody,
} from './api-response';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalServerError,
} from './errors';

describe('ok()', () => {
  it('produces { success: true, data } with status 200 by default', async () => {
    const response = ok({ message: 'Hello' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { message: 'Hello' } });
  });

  it('honours a custom status code', async () => {
    const response = ok({ id: 1 }, 201);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { id: 1 } });
  });

  it('handles various data types', async () => {
    const response = ok([1, 2, 3], 200);
    const body = await response.json();
    expect(body.data).toEqual([1, 2, 3]);
  });

  it('handles null data', async () => {
    const response = ok(null, 200);
    const body = await response.json();
    expect(body.data).toBeNull();
  });
});

describe('fail()', () => {
  it('produces { success: false, error: { message, code } } with given status', async () => {
    const response = fail('Not found', 'NOT_FOUND', 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Not found', code: 'NOT_FOUND' },
    });
  });

  it('works with different status codes', async () => {
    const response = fail('Unauthorized', 'UNAUTHORIZED', 401);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('works with validation errors', async () => {
    const response = fail('Invalid input', 'VALIDATION_ERROR', 400);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('handleApiError()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps UnauthorizedError to 401', async () => {
    const error = new UnauthorizedError('Invalid credentials');
    const response = handleApiError(error, 'POST /api/login');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' },
    });
  });

  it('maps NotFoundError to 404', async () => {
    const error = new NotFoundError('Video not found');
    const response = handleApiError(error, 'GET /api/videos/123');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Video not found', code: 'NOT_FOUND' },
    });
  });

  it('maps ValidationError to 400', async () => {
    const error = new ValidationError('Invalid email');
    const response = handleApiError(error, 'POST /api/auth/signup');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Invalid email', code: 'VALIDATION_ERROR' },
    });
  });

  it('maps ConflictError to 409', async () => {
    const error = new ConflictError('Email already registered');
    const response = handleApiError(error, 'POST /api/auth/signup');
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Email already registered', code: 'CONFLICT' },
    });
  });

  it('maps InternalServerError to 500', async () => {
    const error = new InternalServerError('Database connection failed');
    const response = handleApiError(error, 'GET /api/videos');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: { message: 'Database connection failed', code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('maps plain Error to 500 with generic message', async () => {
    const error = new Error('boom');
    const response = handleApiError(error, 'GET /api/videos');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    // Most important: the response does NOT contain the original error message
    expect(body.error.message).not.toContain('boom');
  });

  it('does NOT leak unknown error message to client', async () => {
    const sensitiveError = new Error('SELECT * FROM users WHERE password = "secret123"');
    const response = handleApiError(sensitiveError, 'POST /api/data');
    const body = await response.json();
    expect(body.error.message).toBe('An unexpected error occurred');
    expect(body.error.message).not.toContain('SELECT');
    expect(body.error.message).not.toContain('secret123');
  });

  it('calls console.error for unknown errors with context', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Connection timeout');
    handleApiError(error, 'GET /api/videos');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[GET /api/videos] Unexpected error:',
      error
    );
    consoleErrorSpy.mockRestore();
  });

  it('does NOT log expected ApiErrors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new NotFoundError('Resource not found');
    handleApiError(error, 'GET /api/videos/999');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('Type exports', () => {
  it('ApiSuccess type is exported', () => {
    // Type-only test; ensures the type is available for consumers
    const success: ApiSuccess<{ foo: string }> = {
      success: true,
      data: { foo: 'bar' },
    };
    expect(success.success).toBe(true);
  });

  it('ApiFailure type is exported', () => {
    const failure: ApiFailure = {
      success: false,
      error: { message: 'Error', code: 'ERROR' },
    };
    expect(failure.success).toBe(false);
  });

  it('ApiResponseBody type works as a union', () => {
    const success: ApiResponseBody<string> = {
      success: true,
      data: 'hello',
    };
    const failure: ApiResponseBody<string> = {
      success: false,
      error: { message: 'Error', code: 'ERROR' },
    };
    expect(success.success).toBe(true);
    expect(failure.success).toBe(false);
  });
});
