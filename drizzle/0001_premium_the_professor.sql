CREATE TABLE `portal_magic_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portal_magic_email` ON `portal_magic_tokens` (`email`);--> statement-breakpoint
CREATE TABLE `portal_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portal_sessions_email` ON `portal_sessions` (`email`);--> statement-breakpoint
CREATE TABLE `portal_users` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'Cliente' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`email_verified_at` text,
	`onboarding_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portal_users_onboarding_id` ON `portal_users` (`onboarding_id`);