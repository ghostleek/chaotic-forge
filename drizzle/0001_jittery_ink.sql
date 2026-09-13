CREATE TABLE `party_command_receipts` (
	`room_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`command_id` text NOT NULL,
	`receipt` text NOT NULL,
	PRIMARY KEY(`room_id`, `actor_id`, `command_id`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "party_command_receipts_json" CHECK(json_valid("party_command_receipts"."receipt"))
);
--> statement-breakpoint
CREATE TABLE `party_participants` (
	`room_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`capability_hash` text NOT NULL,
	`command_id` text NOT NULL,
	`last_seen_at` integer NOT NULL,
	PRIMARY KEY(`room_id`, `participant_id`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "party_participants_last_seen_nonnegative" CHECK("party_participants"."last_seen_at" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_participants_room_capability` ON `party_participants` (`room_id`,`capability_hash`);--> statement-breakpoint
CREATE TABLE `party_room_creations` (
	`capability_hash` text NOT NULL,
	`command_id` text NOT NULL,
	`room_id` text NOT NULL,
	`participant_id` text NOT NULL,
	PRIMARY KEY(`capability_hash`, `command_id`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_room_creations_room` ON `party_room_creations` (`room_id`);--> statement-breakpoint
CREATE TABLE `party_room_history` (
	`room_id` text NOT NULL,
	`revision` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`entry` text NOT NULL,
	PRIMARY KEY(`room_id`, `revision`, `ordinal`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "party_room_history_revision_positive" CHECK("party_room_history"."revision" > 0),
	CONSTRAINT "party_room_history_ordinal_nonnegative" CHECK("party_room_history"."ordinal" >= 0),
	CONSTRAINT "party_room_history_entry_json" CHECK(json_valid("party_room_history"."entry"))
);
--> statement-breakpoint
ALTER TABLE `party_rooms` ADD `internal_state` text;--> statement-breakpoint
ALTER TABLE `party_rooms` ADD `write_token` text;