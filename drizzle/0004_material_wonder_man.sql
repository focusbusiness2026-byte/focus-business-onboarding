CREATE TABLE `short_invitations` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`submitted_at` text,
	`activated_at` text,
	`payload_json` text,
	`onboarding_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_short_invitations_email` ON `short_invitations` (`email`);