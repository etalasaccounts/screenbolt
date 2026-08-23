
/**
 * Client-side API error.
 *
 * Thrown by apiFetch() when a request fails. Carries the server's error message
 * and code (from the standard envelope) or a sensible fallback for non-envelope
 * responses. The status is always set.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiClientError';
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

/**
 * Defensively parse a response body as JSON.
 *
 * Returns null if the body is empty or not valid JSON, avoiding confusing
 * SyntaxError on malformed responses (e.g., HTML error pages from proxies).
 */
function parseJsonSafely(body: string): Record<string, unknown> | null {
  if (!body.trim()) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * Internal helper that handles the three error patterns on non-2xx responses.
 *
 * Throws ApiClientError using the server's error message and code when available,
 * falling back to HTTP status codes when the response has no recognizable envelope.
 *
 * Used by both apiFetch (with strict success envelope validation) and apiFetchRaw
 * (with no success envelope validation). The failure-handling patterns are identical.
 *
 * @param res - The fetch Response object
 * @param body - The parsed JSON body (or null if not valid JSON)
 * @throws ApiClientError on any error pattern
 */
function throwForErrorResponse(
  res: Response,
  body: Record<string, unknown> | null
): never {
  // Pattern 1: Standard failure envelope
  if (
    body?.success === false &&
    typeof body?.error === 'object' &&
    body?.error !== null
  ) {
    const error = body.error as Record<string, unknown>;
    if (typeof error.message === 'string' && typeof error.code === 'string') {
      throw new ApiClientError(error.message, error.code, res.status);
    }
  }

  // Pattern 2: Frozen-contract top-level { error: "..." } shape
  // (used by extension pairing and upload routes)
  if (typeof body?.error === 'string') {
    throw new ApiClientError(body.error, 'API_ERROR', res.status);
  }

  // Pattern 3: No recognizable envelope; use HTTP status as fallback
  const statusMessage =
    res.status === 401 ? 'Unauthorized' :
    res.status === 403 ? 'Forbidden' :
    res.status === 404 ? 'Not found' :
    res.status === 409 ? 'Conflict' :
    res.status === 413 ? 'Payload too large' :
    res.status === 500 ? 'Internal server error' :
    `HTTP ${res.status}`;

  throw new ApiClientError(statusMessage, 'HTTP_ERROR', res.status);
}

/**
 * Fetch a typed JSON response from an API route.
 *
 * Unwraps the standard success envelope ({ success: true, data }) and returns data as T.
 * Throws ApiClientError on failure, with the server's error message and code preserved.
 *
 * Handles three cases:
 * 1. Standard envelope (all routes except frozen contracts):
 *    - Success: { success: true, data } → returns data
 *    - Failure: { success: false, error: { message, code } } → throws with message and code
 * 2. Frozen-contract top-level error shape (extension pairing, upload):
 *    - { error: "..." } → throws with that message
 * 3. Non-envelope error (HTML page, malformed response):
 *    - Non-OK status without envelope → throws with HTTP status message
 *
 * @param path - The API route path (e.g., "/api/videos")
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the unwrapped data, typed as T
 * @throws ApiClientError on HTTP error, failed validation, or missing envelope
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, options);
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
      0
    );
  }

  const text = await res.text();
  const json = parseJsonSafely(text);

  // On success (2xx), expect and validate the standard envelope
  if (res.ok) {
    const body = json as Record<string, unknown> | null;

    // Validate that we got the standard envelope
    if (body?.success !== true) {
      throw new ApiClientError(
        'Invalid server response: missing success envelope',
        'INVALID_RESPONSE',
        res.status
      );
    }

    if (body.data === undefined) {
      throw new ApiClientError(
        'Invalid server response: missing data field',
        'INVALID_RESPONSE',
        res.status
      );
    }

    return body.data as T;
  }

  // On error (non-2xx), try three fallback patterns in order
  const body = json as Record<string, unknown> | null;
  throwForErrorResponse(res, body);
}

/**
 * Fetch a JSON response from a frozen-contract API route (no envelope unwrapping).
 *
 * Returns the parsed top-level JSON body as T on success, with NO envelope unwrapping.
 * This exists only for the three frozen external contracts with the Chrome extension:
 * - POST /api/extension/pair/init
 * - GET /api/extension/pair/status
 * - POST /api/upload
 *
 * On failure, still throws ApiClientError with the server's error message and code,
 * handling the frozen { error: "..." } shape and HTTP-status fallbacks identically
 * to apiFetch. JSON is still parsed defensively (no raw SyntaxError escaping).
 *
 * IMPORTANT: Do not reach for this function by accident. Every other route must use
 * apiFetch() because it returns the { success: true, data } envelope. This raw mode
 * is narrowly scoped to the three frozen contracts listed above and should not be
 * extended to other routes.
 *
 * @param path - The API route path (must be one of the three frozen routes)
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the raw top-level body, typed as T (no unwrapping)
 * @throws ApiClientError on HTTP error or failed JSON parsing
 */
export async function apiFetchRaw<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, options);
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
      0
    );
  }

  const text = await res.text();
  const json = parseJsonSafely(text);

  // On success (2xx), return the raw top-level body as T (no envelope unwrapping)
  if (res.ok) {
    const body = json as Record<string, unknown> | null;
    if (!body) {
      throw new ApiClientError(
        'Invalid server response: empty or malformed JSON',
        'INVALID_RESPONSE',
        res.status
      );
    }
    return body as T;
  }

  // On error (non-2xx), try three fallback patterns in order (same as apiFetch)
  const body = json as Record<string, unknown> | null;
  throwForErrorResponse(res, body);
}

/**
 * Internal helper for POST/PUT/PATCH with JSON body.
 *
 * Sets Content-Type: application/json and JSON-serialises the body.
 * Caller-supplied headers override Content-Type if provided.
 *
 * @param method - HTTP method ('POST', 'PUT', 'PATCH')
 * @param path - The API route path
 * @param body - The request body (will be JSON.stringify'd)
 * @param options - Additional fetch options
 * @returns Promise resolving to the unwrapped response data
 * @throws ApiClientError on failure
 */
async function apiJsonMethod<T>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * POST a JSON body and unwrap the response.
 *
 * Sets Content-Type: application/json and JSON-serialises the body.
 * Otherwise identical to apiFetch(). Used for POST mutations.
 *
 * @param path - The API route path
 * @param body - The request body (will be JSON.stringify'd)
 * @param options - Additional fetch options (will not override method or body)
 * @returns Promise resolving to the unwrapped response data
 * @throws ApiClientError on failure
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiJsonMethod<T>('POST', path, body, options);
}

/**
 * PUT a JSON body and unwrap the response.
 *
 * Sets Content-Type: application/json and JSON-serialises the body.
 * Otherwise identical to apiFetch(). Used for PUT mutations.
 *
 * @param path - The API route path
 * @param body - The request body (will be JSON.stringify'd)
 * @param options - Additional fetch options (will not override method or body)
 * @returns Promise resolving to the unwrapped response data
 * @throws ApiClientError on failure
 */
export async function apiPut<T>(
  path: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiJsonMethod<T>('PUT', path, body, options);
}

/**
 * PATCH a JSON body and unwrap the response.
 *
 * Sets Content-Type: application/json and JSON-serialises the body.
 * Otherwise identical to apiFetch(). Used for PATCH mutations.
 *
 * @param path - The API route path
 * @param body - The request body (will be JSON.stringify'd)
 * @param options - Additional fetch options (will not override method or body)
 * @returns Promise resolving to the unwrapped response data
 * @throws ApiClientError on failure
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiJsonMethod<T>('PATCH', path, body, options);
}
