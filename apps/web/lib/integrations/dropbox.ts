const APP_KEY = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;

export function isDropboxConfigured(): boolean {
  return !!(APP_KEY && APP_SECRET);
}

export function generateDropboxAuthUrl(redirectUri: string, state: string): string {
  if (!APP_KEY) throw new Error("Dropbox is not configured");
  const params = new URLSearchParams({
    client_id: APP_KEY,
    redirect_uri: redirectUri,
    response_type: "code",
    token_access_type: "offline",
    state,
  });
  return `https://www.dropbox.com/oauth2/authorize?${params}`;
}

interface DropboxTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function tokenRequest(params: Record<string, string>): Promise<DropboxTokenResponse> {
  if (!APP_KEY || !APP_SECRET) throw new Error("Dropbox is not configured");
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    throw new Error(`Dropbox token exchange failed: ${await res.text()}`);
  }
  return res.json();
}

export async function exchangeDropboxCode(code: string, redirectUri: string): Promise<DropboxTokenResponse> {
  return tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export async function refreshDropboxAccessToken(refreshToken: string): Promise<DropboxTokenResponse> {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function uploadFileToDropbox(options: {
  accessToken: string;
  path: string;
  body: ArrayBuffer;
}): Promise<string> {
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: options.path,
        mode: "add",
        autorename: true,
        mute: false,
      }),
    },
    body: options.body,
  });

  if (!res.ok) {
    throw new Error(`Dropbox upload failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.id as string;
}
