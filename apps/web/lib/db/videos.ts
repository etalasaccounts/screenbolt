import { desc, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { videos, videoViews, comments } from "@/lib/db/schema";

export type VideoSource = "local" | "bunny" | "drive" | "dropbox";

export async function getVideos(workspaceId: string) {
  return db.query.videos.findMany({
    where: eq(videos.workspaceId, workspaceId),
    orderBy: desc(videos.createdAt),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true },
      },
      workspace: {
        columns: { id: true, name: true },
      },
      videoViews: {
        columns: { id: true },
      },
    },
  });
}

export async function getVideo(id: string) {
  return (
    (await db.query.videos.findFirst({
      where: eq(videos.id, id),
      with: {
        user: {
          columns: { id: true, name: true, email: true, avatarUrl: true },
        },
        workspace: {
          columns: { id: true, name: true },
        },
        videoViews: {
          columns: { id: true },
        },
      },
    })) ?? null
  );
}

export async function getVideoWithComments(id: string) {
  const video = await getVideo(id);
  if (!video) return null;
  const videoComments = await getCommentsForVideo(id);
  return { ...video, comments: videoComments };
}

export async function getCommentsForVideo(videoId: string) {
  const all = await db.query.comments.findMany({
    where: eq(comments.videoId, videoId),
    orderBy: asc(comments.createdAt),
    with: {
      user: { columns: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  // Nest replies under their parent (top-level = parentId null).
  const topLevel = all.filter((c) => !c.parentId);
  const byParent = new Map<string, typeof all>();
  for (const c of all) {
    if (c.parentId) {
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
  }
  return topLevel.map((c) => ({ ...c, replies: byParent.get(c.id) ?? [] }));
}

export async function createVideo(data: {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  source?: VideoSource;
  userId: string;
  workspaceId: string;
}) {
  const [video] = await db
    .insert(videos)
    .values({
      title: data.title,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      duration: data.duration ?? null,
      source: data.source ?? "bunny",
      userId: data.userId,
      workspaceId: data.workspaceId,
    })
    .returning();
  return video;
}

export async function updateVideoTitle(id: string, title: string) {
  const [video] = await db
    .update(videos)
    .set({ title, updatedAt: new Date() })
    .where(eq(videos.id, id))
    .returning();
  return video;
}

export async function updateVideo(
  id: string,
  data: {
    videoUrl?: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    source?: VideoSource;
    title?: string;
  },
) {
  const [video] = await db
    .update(videos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(videos.id, id))
    .returning();
  return video;
}

export async function deleteVideo(id: string) {
  await db.delete(videos).where(eq(videos.id, id));
}

export async function getVideoViewCount(videoId: string) {
  const rows = await db.select({ id: videoViews.id }).from(videoViews).where(eq(videoViews.videoId, videoId));
  return rows.length;
}

export async function recordVideoView(data: {
  videoId: string;
  userId?: string | null;
  sessionId?: string | null;
}) {
  // De-duplicate: a given user/session only counts once per video.
  if (data.userId || data.sessionId) {
    const existing = await db.query.videoViews.findFirst({
      where: (view, { eq, and }) =>
        and(
          eq(view.videoId, data.videoId),
          data.userId ? eq(view.userId, data.userId) : eq(view.sessionId, data.sessionId ?? ""),
        ),
    });
    if (existing) return existing;
  }

  const [view] = await db
    .insert(videoViews)
    .values({
      videoId: data.videoId,
      userId: data.userId ?? null,
      sessionId: data.sessionId ?? null,
    })
    .returning();
  return view;
}
