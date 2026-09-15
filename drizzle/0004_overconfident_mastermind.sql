CREATE TABLE `forge_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_key` text NOT NULL,
	`digest` text NOT NULL,
	`cards` text NOT NULL,
	`parent` text,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`lease` text,
	`lease_until` integer,
	`session_id` text,
	`turn_id` text,
	`artifact_hash` text,
	`evidence` text,
	`model` text,
	`error` text,
	`billing` text DEFAULT 'legacy' NOT NULL,
	`key_ciphertext` text,
	CONSTRAINT "forge_jobs_cards_json" CHECK(json_valid("forge_jobs"."cards"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forge_job_request` ON `forge_jobs` (`owner`,`request_key`);--> statement-breakpoint
CREATE TABLE `forge_keys` (
	`owner` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forge_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forge_runner` (
	`id` text PRIMARY KEY NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forge_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`csrf` text NOT NULL,
	`epoch` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forge_trials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL,
	`max_jobs` integer NOT NULL
);
