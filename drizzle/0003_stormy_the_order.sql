CREATE TABLE `radar_guide_history` (
	`execution_id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`generated_at` text NOT NULL,
	`item_id` text NOT NULL,
	`goal` text NOT NULL,
	`title` text NOT NULL,
	`producer` text,
	`network` text,
	`reference_url` text NOT NULL,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_radar_guide_client_date` ON `radar_guide_history` (`client_id`,`generated_at`);