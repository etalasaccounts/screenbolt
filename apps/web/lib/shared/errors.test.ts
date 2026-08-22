import { describe, it, expect } from 'vitest';
import {
  ApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  BadGatewayError,
} from './errors';

describe('ApiError', () => {
  it('creates an error with message, status, and code', () => {
    const error = new ApiError('Test error', 500, 'INTERNAL_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('is an instance of Error', () => {
    const error = new ApiError('Test error', 500, 'INTERNAL_ERROR');
    expect(error).toBeInstanceOf(Error);
  });

  it('has proper stack trace', () => {
    const error = new ApiError('Test error', 500, 'INTERNAL_ERROR');
    expect(error.stack).toBeTruthy();
    expect(error.stack).toContain('ApiError');
  });

  it('can be thrown and caught', () => {
    expect(() => {
      throw new ApiError('Test error', 500, 'INTERNAL_ERROR');
    }).toThrow(ApiError);
  });
});

describe('UnauthorizedError', () => {
  it('extends ApiError with 401 status and UNAUTHORIZED code', () => {
    const error = new UnauthorizedError('Access denied');
    expect(error.message).toBe('Access denied');
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('is an instance of ApiError and Error', () => {
    const error = new UnauthorizedError('Access denied');
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
  });

  it('has custom message', () => {
    const error = new UnauthorizedError('Custom unauthorized message');
    expect(error.message).toBe('Custom unauthorized message');
    expect(error.status).toBe(401);
  });

  it('can be caught as ApiError', () => {
    expect(() => {
      throw new UnauthorizedError('Unauthorized');
    }).toThrow(ApiError);
  });
});

describe('NotFoundError', () => {
  it('extends ApiError with 404 status and NOT_FOUND code', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.message).toBe('Resource not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('is an instance of ApiError and Error', () => {
    const error = new NotFoundError('Resource not found');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
  });

  it('has custom message', () => {
    const error = new NotFoundError('Custom not found message');
    expect(error.message).toBe('Custom not found message');
    expect(error.status).toBe(404);
  });

  it('can be caught as ApiError', () => {
    expect(() => {
      throw new NotFoundError('Not found');
    }).toThrow(ApiError);
  });
});

describe('ValidationError', () => {
  it('extends ApiError with 400 status and VALIDATION_ERROR code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('stores optional details', () => {
    const details = { field: 'email', reason: 'Invalid format' };
    const error = new ValidationError('Invalid input', details);
    expect(error.details).toEqual(details);
  });

  it('has undefined details when not provided', () => {
    const error = new ValidationError('Invalid input');
    expect(error.details).toBeUndefined();
  });

  it('details can be an array of errors', () => {
    const details = [
      { field: 'email', message: 'Invalid format' },
      { field: 'password', message: 'Too short' },
    ];
    const error = new ValidationError('Multiple validation errors', details);
    expect(error.details).toEqual(details);
  });

  it('is an instance of ApiError and Error', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
  });

  it('can be caught as ApiError', () => {
    expect(() => {
      throw new ValidationError('Validation failed');
    }).toThrow(ApiError);
  });

  it('preserves details when caught', () => {
    const details = { field: 'username', reason: 'Already exists' };
    try {
      throw new ValidationError('Duplicate user', details);
    } catch (error) {
      if (error instanceof ValidationError) {
        expect(error.details).toEqual(details);
      } else {
        throw new Error('Should be ValidationError');
      }
    }
  });
});

describe('ForbiddenError', () => {
  it('extends ApiError with 403 status and FORBIDDEN code', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.message).toBe('Access denied');
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('has default message', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('is an instance of ApiError and Error', () => {
    const error = new ForbiddenError('Access denied');
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
  });

  it('can be caught as ApiError', () => {
    expect(() => {
      throw new ForbiddenError('Forbidden');
    }).toThrow(ApiError);
  });
});

describe('BadGatewayError', () => {
  it('extends ApiError with 502 status and BAD_GATEWAY code', () => {
    const error = new BadGatewayError('External service failed');
    expect(error.message).toBe('External service failed');
    expect(error.status).toBe(502);
    expect(error.code).toBe('BAD_GATEWAY');
  });

  it('has default message', () => {
    const error = new BadGatewayError();
    expect(error.message).toBe('Bad gateway');
    expect(error.status).toBe(502);
    expect(error.code).toBe('BAD_GATEWAY');
  });

  it('is an instance of ApiError and Error', () => {
    const error = new BadGatewayError('External service failed');
    expect(error).toBeInstanceOf(BadGatewayError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
  });

  it('can be caught as ApiError', () => {
    expect(() => {
      throw new BadGatewayError('Bad gateway');
    }).toThrow(ApiError);
  });
});
