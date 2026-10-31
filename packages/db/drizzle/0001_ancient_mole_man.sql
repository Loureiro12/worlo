CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activities_entity_idx` ON `activities` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `chat_members` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` text
);
--> statement-breakpoint
CREATE INDEX `chat_members_thread_idx` ON `chat_members` (`thread_id`);--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`kind` text NOT NULL,
	`last_message_at` text
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`platform` text DEFAULT '' NOT NULL,
	`session_id` text,
	`last_seen_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`followee_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `follows_followee_idx` ON `follows` (`followee_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`role` text DEFAULT 'collaborator' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text
);
--> statement-breakpoint
CREATE INDEX `memberships_entity_idx` ON `memberships` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_thread_idx` ON `messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_id` text,
	`entity_type` text,
	`entity_id` text,
	`data` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text DEFAULT '' NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_url` text,
	`expert_role` text,
	`expert_area` text,
	`searchable` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `_photo_files` (
	`photo_id` text PRIMARY KEY NOT NULL,
	`local_uri` text NOT NULL,
	`mime_type` text DEFAULT 'image/jpeg' NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`trip_id` text,
	`storage_path` text NOT NULL,
	`width` integer,
	`height` integer,
	`taken_at` text,
	`lat` real,
	`lng` real,
	`caption` text,
	`uploaded` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `photos_trip_idx` ON `photos` (`trip_id`);--> statement-breakpoint
ALTER TABLE `trip_expenses` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `trips` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `wish_destinations` ADD `user_id` text;--> statement-breakpoint
-- Shared rows now carry their owner/author (user_id): pull them again.
DELETE FROM `_sync_cursors` WHERE `table_name` IN ('trips', 'wish_destinations', 'trip_expenses');
