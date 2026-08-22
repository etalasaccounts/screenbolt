import { getGoogleAccessToken, getDropboxAccessToken } from "@/lib/db/users";
import { isDriveConfigured } from "@/lib/integrations/google-drive";
import { isDropboxConfigured } from "@/lib/integrations/dropbox";

export interface CloudConfig {
  drive: { configured: boolean; connected: boolean };
  dropbox: { configured: boolean; connected: boolean };
}

export class CloudService {
  static async getCloudConnections(userId: string): Promise<CloudConfig> {
    const [googleToken, dropboxToken] = await Promise.all([
      getGoogleAccessToken(userId),
      getDropboxAccessToken(userId),
    ]);

    return {
      drive: {
        configured: isDriveConfigured(),
        connected: !!googleToken,
      },
      dropbox: {
        configured: isDropboxConfigured(),
        connected: !!dropboxToken,
      },
    };
  }
}
