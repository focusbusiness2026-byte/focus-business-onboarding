import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const onboardingSubmissions = sqliteTable(
  "onboarding_submissions",
  {
    id: text("id").primaryKey(),
    submittedAt: text("submitted_at").notNull(),
    status: text("status").notNull().default("Nuevo"),
    companyName: text("company_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (table) => [
    index("idx_onboarding_submitted_at").on(table.submittedAt),
    index("idx_onboarding_contact_email").on(table.contactEmail),
  ],
);

export const portalUsers = sqliteTable(
  "portal_users",
  {
    email: text("email").primaryKey(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull().default(600000),
    role: text("role").notNull().default("Cliente"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    emailVerifiedAt: text("email_verified_at"),
    onboardingId: text("onboarding_id"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: text("locked_until"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_portal_users_onboarding_id").on(table.onboardingId)],
);

export const portalSessions = sqliteTable(
  "portal_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [index("idx_portal_sessions_email").on(table.email)],
);

export const portalVerificationTokens = sqliteTable(
  "portal_verification_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    purpose: text("purpose").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_portal_verification_email").on(table.email)],
);
