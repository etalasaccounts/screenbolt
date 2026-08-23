"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { getUserInitials, formatDate } from "@/lib/client/format";
import { ApiClientError, apiPost } from "@/lib/client/api-fetch";

export interface SerializedComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; avatarUrl: string | null };
  replies: SerializedComment[];
}

export function CommentSection({
  videoId,
  comments,
  isAuthenticated,
}: {
  videoId: string;
  comments: SerializedComment[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function postComment(parentId?: string) {
    const text = (parentId ? replyContent : content).trim();
    if (!text || busy) return;

    setBusy(true);
    try {
      await apiPost(`/api/videos/${videoId}/comments`, parentId ? { content: text, parentId } : { content: text });
      toast.success(parentId ? "Reply added" : "Comment added");
      setContent("");
      setReplyContent("");
      setReplyTo(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not post comment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border-t border-black/[.08] pt-8">
      <h2 className="mb-5 text-lg font-medium">
        Comments <span className="text-[#090b0c]/40">({comments.length})</span>
      </h2>

      {isAuthenticated ? (
        <div className="mb-8 flex gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-black/[.12] bg-white px-4 py-3 text-[0.9375rem] outline-none focus:border-black/30"
          />
          <button
            type="button"
            onClick={() => postComment()}
            disabled={!content.trim() || busy}
            className="self-end flex h-11 items-center rounded-full bg-[#090b0c] px-5 text-[0.875rem] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            Post
          </button>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-black/[.08] bg-white px-5 py-4 text-[0.9375rem] text-[#090b0c]/60">
          <a href="/login" className="font-medium text-[#090b0c] underline underline-offset-2">
            Log in
          </a>{" "}
          to join the conversation.
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-[0.9375rem] text-[#090b0c]/45">No comments yet.</p>
      ) : (
        <ul className="space-y-5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[.06] text-[0.75rem] font-medium">
                {getUserInitials(comment.user.name ?? comment.user.email ?? "?")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-medium">{comment.user.name ?? "Anonymous"}</span>
                  <span className="text-[0.75rem] text-[#090b0c]/40">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] text-[#090b0c]/80">{comment.content}</p>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(replyTo === comment.id ? null : comment.id);
                      setReplyContent("");
                    }}
                    className="mt-1.5 text-[0.8125rem] font-medium text-[#090b0c]/50 hover:text-[#090b0c]"
                  >
                    Reply
                  </button>
                )}

                {comment.replies.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-black/[.06] pl-4">
                    {comment.replies.map((reply) => (
                      <li key={reply.id} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[.06] text-[0.6875rem] font-medium">
                          {getUserInitials(reply.user.name ?? reply.user.email ?? "?")}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[0.8125rem] font-medium">{reply.user.name ?? "Anonymous"}</span>
                            <span className="text-[0.75rem] text-[#090b0c]/40">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] text-[#090b0c]/80">{reply.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {replyTo === comment.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && postComment(comment.id)}
                      placeholder="Write a reply…"
                      autoFocus
                      className="h-10 flex-1 rounded-xl border border-black/[.12] bg-white px-3 text-[0.875rem] outline-none focus:border-black/30"
                    />
                    <button
                      type="button"
                      onClick={() => postComment(comment.id)}
                      disabled={!replyContent.trim() || busy}
                      className="flex h-10 items-center rounded-full bg-[#090b0c] px-4 text-[0.8125rem] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                    >
                      <Icon icon="solar:arrow-right-up-linear" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
