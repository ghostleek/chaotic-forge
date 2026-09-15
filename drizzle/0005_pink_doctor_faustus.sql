ALTER TABLE `forge_jobs` ADD `room_id` text;--> statement-breakpoint
ALTER TABLE `forge_jobs` ADD `room_digest` text;--> statement-breakpoint
CREATE INDEX `forge_jobs_room` ON `forge_jobs` (`room_id`,`created`);