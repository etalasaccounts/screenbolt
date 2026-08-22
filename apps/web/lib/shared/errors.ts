/**
 * Base API error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'ApiError';
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Unauthorized error (401)
 * Thrown when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Not found error (404)
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 * Thrown when input validation fails
 */
export class ValidationError extends ApiError {
  constructor(
    message: string = 'Validation failed',
    public details?: Record<string, unknown> | Array<Record<string, unknown>>
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Conflict error (409)
 * Thrown when a resource already exists or state conflict occurs
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Forbidden error (403)
 * Thrown when a user does not have permission to access a resource
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Bad Gateway error (502)
 * Thrown when an external service fails
 */
export class BadGatewayError extends ApiError {
  constructor(message: string = 'Bad gateway') {
    super(message, 502, 'BAD_GATEWAY');
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

/**
 * Internal server error (500)
 * Thrown for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
