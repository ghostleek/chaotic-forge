CREATE TABLE `party_archive_builds` (
	`archive_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`manifest` text NOT NULL,
	PRIMARY KEY(`archive_id`, `ordinal`),
	FOREIGN KEY (`archive_id`) REFERENCES `party_archives`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "party_archive_builds_ordinal" CHECK("party_archive_builds"."ordinal" BETWEEN 0 AND 3),
	CONSTRAINT "party_archive_builds_json" CHECK(json_valid("party_archive_builds"."manifest"))
);
--> statement-breakpoint
CREATE TABLE `party_archive_history` (
	`archive_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`entry` text NOT NULL,
	PRIMARY KEY(`archive_id`, `ordinal`),
	FOREIGN KEY (`archive_id`) REFERENCES `party_archives`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "party_archive_history_ordinal" CHECK("party_archive_history"."ordinal" BETWEEN 0 AND 9999),
	CONSTRAINT "party_archive_history_json" CHECK(json_valid("party_archive_history"."entry"))
);
--> statement-breakpoint
CREATE TABLE `party_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`source_room_id` text,
	`content_hash` text NOT NULL,
	`metadata` text NOT NULL,
	`provenance` text NOT NULL,
	`history_count` integer NOT NULL,
	`build_count` integer NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "party_archives_metadata_json" CHECK(json_valid("party_archives"."metadata")),
	CONSTRAINT "party_archives_history_bound" CHECK("party_archives"."history_count" BETWEEN 1 AND 10000),
	CONSTRAINT "party_archives_build_bound" CHECK("party_archives"."build_count" BETWEEN 1 AND 4),
	CONSTRAINT "party_archives_ready" CHECK("party_archives"."ready" IN (0, 1)),
	CONSTRAINT "party_archives_provenance" CHECK("party_archives"."provenance" IN ('room-authority', 'portable-import-unverified'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_archives_source_room` ON `party_archives` (`source_room_id`);--> statement-breakpoint
CREATE TABLE `party_played_builds` (
	`room_id` text NOT NULL,
	`build_id` text NOT NULL,
	`manifest` text NOT NULL,
	PRIMARY KEY(`room_id`, `build_id`),
	FOREIGN KEY (`room_id`) REFERENCES `party_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "party_played_builds_json" CHECK(json_valid("party_played_builds"."manifest"))
);
