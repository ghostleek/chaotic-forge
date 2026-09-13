CREATE TABLE `party_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`snapshot` text NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "party_rooms_revision_nonnegative" CHECK("party_rooms"."revision" >= 0),
	CONSTRAINT "party_rooms_snapshot_json" CHECK(json_valid("party_rooms"."snapshot"))
);
