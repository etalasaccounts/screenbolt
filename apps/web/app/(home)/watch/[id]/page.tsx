import { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoService } from "@/lib/services/video.service";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { formatDate, formatDuration, getUserInitials } from "@/lib/client/format";
import { VideoPlayer } from "@/components/shell/video-player";
import { ViewTracker } from "@/components/shell/view-tracker";
import { CommentSection, type SerializedComment } from "@/components/shell/comment-section";
import { CopyLinkButton } from "@/components/shell/copy-link-button";
import { VideoTitle } from "@/components/shell/video-title";
import { PublicToggle } from "@/components/shell/public-toggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await VideoService.getVideo(id);

  if (!video) {
    return {
      title: "Recording Not Found - Screenbolt",
    };
  }

  if (video.isPublic) {
    return {
      title: `${video.title} - Screenbolt`,
      description: "Watch this screen recording on Screenbolt.",
      alternates: {
        canonical: `https://screenbolt.app/watch/${video.id}`,
      },
      openGraph: {
        title: video.title,
        description: "Watch this screen recording on Screenbolt.",
        type: "video.other",
        images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  return {
    title: "Shared Recording - Screenbolt",
    robots: {
      index: false,
      follow: false,
    },
  };
}

type CommentUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type RawCommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  user: CommentUser;
};

type RawTopLevelComment = RawCommentRow & { replies: RawCommentRow[] };

function serializeComments(comments: RawTopLevelComment[]): SerializedComment[] {
  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
      replies: [],
    })),
  }));
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, user] = await Promise.all([VideoService.getVideoWithComments(id), getCurrentUser()]);

  if (!video) notFound();

  const playbackUrl = video.videoUrl;

  return (
    <div className="mx-auto max-w-4xl">
      <ViewTracker videoId={video.id} />

      <VideoPlayer src={playbackUrl} poster={video.thumbnailUrl ?? undefined} title={video.title} />

      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <VideoTitle videoId={video.id} title={video.title} editable={user?.id === video.user.id} />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-[#090b0c]/50">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#090b0c] text-[0.5625rem] font-medium text-white">
                  {getUserInitials(video.user.name ?? video.user.email ?? "?")}
                </span>
                {video.user.name ?? video.user.email ?? "Unknown"}
              </span>
              <span>·</span>
              <span>{formatDate(video.createdAt)}</span>
              {video.duration ? (
                <>
                  <span>·</span>
                  <span>{formatDuration(video.duration)}</span>
                </>
              ) : null}
              <span>·</span>
              <span>
                {video.videoViews.length} {video.videoViews.length === 1 ? "view" : "views"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton videoId={video.id} />
            {user?.id === video.user.id && (
              <PublicToggle videoId={video.id} initialIsPublic={video.isPublic} />
            )}
          </div>
        </div>
      </div>

      <CommentSection videoId={video.id} comments={serializeComments(video.comments)} isAuthenticated={!!user} />
    </div>
  );
}
