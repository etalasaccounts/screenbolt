/**
 * AuthService - Business logic for authentication operations.
 *
 * Handles signup, password validation, and OAuth management.
 * Delegates database operations to lib/db/auth.ts.
 */

import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  findUserById,
  createUserWithPassword,
  updateGoogleTokens,
  clearGoogleTokens,
  updateDropboxTokens,
  clearDropboxTokens,
  updateUserProfile,
} from '@/lib/db/auth';
import { createUserWithWorkspace } from '@/lib/db/users';
import {
  ValidationError,
  ConflictError,
} from '@/lib/shared/errors';
import {
  generateGoogleDriveAuthUrl,
  exchangeGoogleDriveCode,
  isDriveConfigured,
} from '@/lib/integrations/google-drive';
import {
  generateDropboxAuthUrl,
  exchangeDropboxCode,
  isDropboxConfigured,
} from '@/lib/integrations/dropbox';

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
}

export interface AuthUserData {
  id: string;
  email: string;
  name: string | null;
}

/**
 * An existing user's profile. Unlike {@link AuthUserData}, email is optional:
 * accounts created through an OAuth provider may have no email on record.
 */
export type UserProfileData = Omit<AuthUserData, 'email'> & {
  email: string | null;
};

export class AuthService {
  /**
   * Sign up a new user with email and password.
   *
   * @throws ValidationError if email or password is invalid
   * @throws ConflictError if email already registered
   */
  static async signup(input: SignupInput): Promise<AuthUserData> {
    const { email, password, name = '' } = input;

    // Validate email
    if (!email || !email.includes('@')) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check for existing user
    const existing = await findUserByEmail(email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUserWithPassword(email, hashedPassword, name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * Sign up a new user and create a default "Personal" workspace.
   * Performs both operations in a single database transaction.
   *
   * @throws ValidationError if email or password is invalid
   * @throws ConflictError if email already registered
   */
  static async signupWithWorkspace(
    input: SignupInput,
  ): Promise<AuthUserData & { activeWorkspaceId: string }> {
    const { email, password, name = '' } = input;

    // Validate email
    if (!email || !email.includes('@')) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check for existing user
    const existing = await findUserByEmail(email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user + workspace in transaction (handled at db layer)
    const result = await createUserWithWorkspace(email, hashedPassword, name);

    return {
      id: result.id,
      email: result.email as string,
      name: result.name,
      activeWorkspaceId: result.activeWorkspaceId,
    };
  }

  /**
   * Verify a password against a stored hash.
   */
  static async verifyPassword(
    storedHash: string,
    inputPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(inputPassword, storedHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate Google Drive OAuth authorization URL.
   */
  static getGoogleAuthUrl(redirectUri: string, state: string): string {
    return generateGoogleDriveAuthUrl(redirectUri, state);
  }

  /**
   * Generate Dropbox OAuth authorization URL.
   */
  static getDropboxAuthUrl(redirectUri: string, state: string): string {
    return generateDropboxAuthUrl(redirectUri, state);
  }

  /**
   * Check if Google Drive is configured.
   */
  static isGoogleDriveConfigured(): boolean {
    return isDriveConfigured();
  }

  /**
   * Check if Dropbox is configured.
   */
  static isDropboxConfigured(): boolean {
    return isDropboxConfigured();
  }

  /**
   * Connect user's Google Drive account by exchanging OAuth code for tokens.
   */
  static async connectGoogleDrive(
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<void> {
    const user = await findUserById(userId);
    if (!user) throw new ValidationError('User not found');

    const tokens = await exchangeGoogleDriveCode(code, redirectUri);
    await updateGoogleTokens(userId, tokens.access_token, tokens.refresh_token ?? null, tokens.expires_in);
  }

  /**
   * Disconnect user's Google Drive.
   */
  static async disconnectGoogleDrive(userId: string): Promise<void> {
    const user = await findUserById(userId);
    if (!user) throw new ValidationError('User not found');

    await clearGoogleTokens(userId);
  }

  /**
   * Connect user's Dropbox account by exchanging OAuth code for tokens.
   */
  static async connectDropbox(
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<void> {
    const user = await findUserById(userId);
    if (!user) throw new ValidationError('User not found');

    const tokens = await exchangeDropboxCode(code, redirectUri);
    await updateDropboxTokens(userId, tokens.access_token, tokens.refresh_token ?? null, tokens.expires_in);
  }

  /**
   * Disconnect user's Dropbox.
   */
  static async disconnectDropbox(userId: string): Promise<void> {
    const user = await findUserById(userId);
    if (!user) throw new ValidationError('User not found');

    await clearDropboxTokens(userId);
  }

  /**
   * Update user profile.
   */
  static async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<UserProfileData> {
    const user = await findUserById(userId);
    if (!user) throw new ValidationError('User not found');

    if (data.email && data.email !== user.email) {
      const existing = await findUserByEmail(data.email);
      if (existing) throw new ConflictError('Email already in use');
    }

    const updated = await updateUserProfile(userId, data);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
    };
  }
}
