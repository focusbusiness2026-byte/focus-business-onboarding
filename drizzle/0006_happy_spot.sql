CREATE TABLE `sandbox_runtime_state` (
	`bucket` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`sha256` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
