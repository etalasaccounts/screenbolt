import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";

export async function createComment(data: { content: string; videoId: string; userId: string; parentId?: string | null }) {
  const [comment] = await db
    .insert(comments)
    .values({
      content: data.content,
      videoId: data.videoId,
      userId: data.userId,
      parentId: data.parentId ?? null,
    })
    .returning();
  return comment;
}
