import { findUserById, updateUserProfile } from "@/lib/db/auth";
import { ValidationError } from "@/lib/shared/errors";

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
}

export class UserService {
  static async getCurrentUser(userId: string): Promise<UserData> {
    const user = await findUserById(userId);

    if (!user) {
      throw new ValidationError("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string | null },
  ): Promise<UserData> {
    const user = await findUserById(userId);
    if (!user) {
      throw new ValidationError("User not found");
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updated = await updateUserProfile(
      userId,
      updateData as { name?: string; email?: string },
    );

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      createdAt: updated.createdAt,
    };
  }
}
