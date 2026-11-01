CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`tour_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`date` text NOT NULL,
	`people` integer NOT NULL,
	`total` real NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`cancelled_at` text,
	`reminded_at` text
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`city` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tour_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`tour_id` text NOT NULL,
	`date` text NOT NULL,
	`capacity` integer NOT NULL,
	`booked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tour_slots_tour_idx` ON `tour_slots` (`tour_id`,`date`);