/**
 * Shared video utilities that multiple layers need.
 * Domain logic that should not be duplicated across services and routes.
 */

export function generateVideoTitleWithTimestamp(userTimestamp?: string): string {
  const now = userTimestamp ? new Date(userTimestamp) : new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Recording — ${timestamp}`;
}
