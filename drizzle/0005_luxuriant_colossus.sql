CREATE TABLE `public_short_signup_limits` (
	`visitor_hash` text PRIMARY KEY NOT NULL,
	`window_start` text NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_short_invitations_pending_email` ON `short_invitations` (`email`) WHERE "short_invitations"."submitted_at" IS NOT NULL AND "short_invitations"."activated_at" IS NULL;