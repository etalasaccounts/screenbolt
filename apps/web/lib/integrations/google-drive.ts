const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function isDriveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function generateGoogleDriveAuthUrl(redirectUri: string, state: string): string {
  if (!CLIENT_ID) throw new Error("Google Drive is not configured");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Google Drive is not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return res.json();
}

export async function exchangeGoogleDriveCode(code: string, redirectUri: string): Promise<TokenResponse> {
  return tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

/**
 * Resumable upload of a file to Google Drive, returning the created file id.
 */
export async function uploadFileToGoogleDrive(options: {
  accessToken: string;
  name: string;
  mimeType: string;
  body: ArrayBuffer;
}): Promise<string> {
  const metadata = JSON.stringify({ name: options.name });

  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": options.mimeType,
        "X-Upload-Content-Length": String(options.body.byteLength),
      },
      body: metadata,
    },
  );

  if (!initRes.ok) {
    throw new Error(`Drive upload init failed: ${await initRes.text()}`);
  }

  const location = initRes.headers.get("location");
  if (!location) throw new Error("Drive upload did not return a location");

  const uploadRes = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": options.mimeType },
    body: options.body,
  });

  if (!uploadRes.ok) {
    throw new Error(`Drive upload failed: ${await uploadRes.text()}`);
  }

  const data = await uploadRes.json();
  return data.id as string;
}
