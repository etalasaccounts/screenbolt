import { NextResponse } from 'next/server';
import { ApiError } from './errors';

/**
 * Success response type.
 * Wraps the API response data in a typed envelope.
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Failure response type.
 * Wraps API error information in a consistent shape.
 */
export type ApiFailure = {
  success: false;
  error: {
    message: string;
    code: string;
  };
};

/**
 * Union of success and failure response types.
 * Represents any API response body.
 */
export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

/**
 * Build a successful API response.
 * Returns a NextResponse with { success: true, data } envelope.
 *
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success envelope
 */
export function ok<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Build a failure API response.
 * Returns a NextResponse with { success: false, error: { message, code } } envelope.
 *
 * @param message - Human-readable error message
 * @param code - Machine-readable error code
 * @param status - HTTP status code
 * @returns NextResponse with failure envelope
 */
export function fail(
  message: string,
  code: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  );
}

/**
 * Handle API errors and return appropriate responses.
 *
 * Maps typed ApiError subclasses to their HTTP status codes and error codes.
 * Unexpected errors are logged to console.error with context and return a
 * generic 500 response without leaking the error message (prevents exposing
 * stack traces, connection strings, or SQL).
 *
 * Expected ApiErrors (e.g., 404, 401, 400, 409) are NOT logged — these are
 * normal operational errors and would create log noise.
 *
 * @param error - The error to handle (ApiError or unknown)
 * @param context - Human-readable context for logging (e.g., "GET /api/videos")
 * @returns NextResponse with appropriate error envelope and status
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof ApiError) {
    // Known error: return its status and code without logging.
    return fail(error.message, error.code, error.status);
  }

  // Unknown error: log the real error server-side and return generic 500.
  console.error(`[${context}] Unexpected error:`, error);
  return fail(
    'An unexpected error occurred',
    'INTERNAL_SERVER_ERROR',
    500
  );
}
