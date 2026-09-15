CREATE TABLE `party_pixel_jobs` (
	`room_id` text NOT NULL,
	`recipe_key` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`room_id`, `recipe_key`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "party_pixel_jobs_status" CHECK("party_pixel_jobs"."status" IN ('running','complete','failed'))
);
