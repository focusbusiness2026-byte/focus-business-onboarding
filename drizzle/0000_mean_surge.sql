CREATE TABLE `onboarding_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`submitted_at` text NOT NULL,
	`status` text DEFAULT 'Nuevo' NOT NULL,
	`company_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_onboarding_submitted_at` ON `onboarding_submissions` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_contact_email` ON `onboarding_submissions` (`contact_email`);