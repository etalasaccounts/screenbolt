export function generateOAuthState(): string {
  return crypto.randomUUID();
}

export function validateOAuthState(received: string | null, stored: string | null): boolean {
  return !!received && !!stored && received === stored;
}
