CREATE TABLE `catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `catalog_kind_idx` ON `catalog` (`kind`,`sort`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`item_ids` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`title` text NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`flag` text DEFAULT '' NOT NULL,
	`dates` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '' NOT NULL,
	`suggestion_key` text DEFAULT 'generic' NOT NULL,
	`days` text NOT NULL,
	`source_recommendation_id` text
);
--> statement-breakpoint
CREATE TABLE `live_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`detail` text,
	`photo` text,
	`time` text DEFAULT '' NOT NULL,
	`author` text DEFAULT 'me' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `live_logs_session_idx` ON `live_logs` (`session_id`);--> statement-breakpoint
CREATE TABLE `live_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`itinerary_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`day` integer DEFAULT 1 NOT NULL,
	`done` text NOT NULL,
	`spent` real DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outbox_record_idx` ON `_outbox` (`table_name`,`record_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text DEFAULT '' NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_url` text,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`units` text DEFAULT 'metric' NOT NULL,
	`privacy` text DEFAULT 'friends' NOT NULL,
	`privacy_detail` text NOT NULL,
	`notification_prefs` text NOT NULL,
	`auto_organize_photos` integer DEFAULT true NOT NULL,
	`onboarded_at` text
);
--> statement-breakpoint
CREATE TABLE `saved_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`ref_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`flag` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '' NOT NULL,
	`rating` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_items_ref_idx` ON `saved_items` (`ref_id`);--> statement-breakpoint
CREATE TABLE `_sync_cursors` (
	`table_name` text PRIMARY KEY NOT NULL,
	`updated_at` text NOT NULL,
	`record_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`trip_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`amount_label` text DEFAULT '' NOT NULL,
	`split` text NOT NULL,
	`receipt` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trip_expenses_trip_idx` ON `trip_expenses` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`title` text NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`country_iso` text,
	`flag` text DEFAULT '' NOT NULL,
	`period` text DEFAULT '' NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`days` integer DEFAULT 1 NOT NULL,
	`photos` integer DEFAULT 0 NOT NULL,
	`places` integer DEFAULT 0 NOT NULL,
	`companions` text NOT NULL,
	`people` text DEFAULT '' NOT NULL,
	`total` text DEFAULT '' NOT NULL,
	`tint` text DEFAULT '' NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `visited_countries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`country_iso` text NOT NULL,
	`years` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visited_countries_iso_idx` ON `visited_countries` (`country_iso`);--> statement-breakpoint
CREATE TABLE `wish_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`country_iso` text,
	`name` text NOT NULL,
	`flag` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`companions` text NOT NULL,
	`tint` text DEFAULT '' NOT NULL
);
