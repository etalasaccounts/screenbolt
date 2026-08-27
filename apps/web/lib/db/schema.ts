import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  primaryKey,
  doublePrecision,
  boolean,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Screenbolt database schema (Drizzle + Postgres/Neon).
 *
 * The first four tables (users, accounts, sessions, verificationTokens)
 * follow the Auth.js (@auth/drizzle-adapter) contract so NextAuth can
 * persist OAuth identities. The rest are Screenbolt's application tables,
 * mirroring the data model of the original Screenbolt app (users, workspaces,
 * videos, video views, comments).
 */

// ---------------------------------------------------------------------------
// Auth.js tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Auth.js fields
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  // Application fields
  password: text("password"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  activeWorkspaceId: text("active_workspace_id"),
  // Google Drive OAuth tokens
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry", { withTimezone: true, mode: "date" }),
  // Dropbox OAuth tokens
  dropboxAccessToken: text("dropbox_access_token"),
  dropboxRefreshToken: text("dropbox_refresh_token"),
  dropboxTokenExpiry: timestamp("dropbox_token_expiry", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "member"]);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

export const inviteStatusEnum = pgEnum("invite_status", ["active", "revoked"]);

/**
 * Multi-use, expiring, token-based invite links (Discord/Slack-style):
 * anyone with the link joins the workspace while it's active and unexpired.
 * No email is sent — the owner copies the link and shares it manually.
 */
export const workspaceInvites = pgTable("workspace_invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: inviteStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const sourceEnum = pgEnum("source", ["local", "bunny", "drive", "dropbox"]);

export const planEnum = pgEnum("plan", ["free", "pro", "business"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelling", "expired", "cancelled"]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  midtransOrderId: text("midtrans_order_id").unique(),
  midtransTransactionId: text("midtrans_transaction_id"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: "date" }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const pairingStatusEnum = pgEnum("pairing_status", ["pending", "approved", "expired"]);

export const videos = pgTable("videos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull().default(""),
  thumbnailUrl: text("thumbnail_url"),
  duration: doublePrecision("duration"), // duration in seconds
  source: sourceEnum("source").default("bunny").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const videoViews = pgTable(
  "video_views",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id"),
    viewedAt: timestamp("viewed_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
);

export const comments = pgTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Extension device pairing (sub-project 4)
// ---------------------------------------------------------------------------

/**
 * Long-lived opaque API tokens issued to a paired extension/device. We store
 * only the sha256 of the token (never the plaintext), scoped to a user +
 * workspace at pairing time.
 */
export const deviceTokens = pgTable("device_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
});

/**
 * Short-lived pairing handoff records. `id` is the pairing code the
 * extension generates and registers via /api/extension/pair/init; it becomes
 * bound to a user/workspace only once the user approves it.
 *
 * `token` holds the raw device token transiently: approve mints the token and
 * stores it here so the extension's status poll can retrieve it exactly once
 * (then it's cleared). The durable record in deviceTokens stores only the
 * sha256. The row itself expires ~10 minutes after init.
 */
export const pairingRequests = pgTable("pairing_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  status: pairingStatusEnum("status").default("pending").notNull(),
  token: text("token"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

// Auth.js adapter schema mapping
export const authSchema = {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
};

// ---------------------------------------------------------------------------
// Relational query API (db.query.*)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  workspaces: many(workspaces),
  videos: many(videos),
  videoViews: many(videoViews),
  comments: many(comments),
  subscription: one(subscriptions, { fields: [users.id], references: [subscriptions.userId] }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, { fields: [workspaces.userId], references: [users.id] }),
  videos: many(videos),
  members: many(workspaceMembers),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  workspace: one(workspaces, { fields: [videos.workspaceId], references: [workspaces.id] }),
  videoViews: many(videoViews),
  comments: many(comments),
}));

export const videoViewsRelations = relations(videoViews, ({ one }) => ({
  video: one(videos, { fields: [videoViews.videoId], references: [videos.id] }),
  user: one(users, { fields: [videoViews.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  video: one(videos, { fields: [comments.videoId], references: [videos.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id], relationName: "comment_replies" }),
  replies: many(comments, { relationName: "comment_replies" }),
}));

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, { fields: [deviceTokens.userId], references: [users.id] }),
  workspace: one(workspaces, { fields: [deviceTokens.workspaceId], references: [workspaces.id] }),
}));

export const pairingRequestsRelations = relations(pairingRequests, ({ one }) => ({
  user: one(users, { fields: [pairingRequests.userId], references: [users.id] }),
  workspace: one(workspaces, { fields: [pairingRequests.workspaceId], references: [workspaces.id] }),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceInvites.workspaceId], references: [workspaces.id] }),
  invitedBy: one(users, { fields: [workspaceInvites.invitedByUserId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type VideoView = typeof videoViews.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type PairingRequest = typeof pairingRequests.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
