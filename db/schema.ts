import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
