CREATE TABLE IF NOT EXISTS `portal_access_permissions` (
	`email` text PRIMARY KEY NOT NULL,
	`prospection_allowed` integer DEFAULT true NOT NULL,
	`radar_allowed` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
