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
CREATE TABLE `_sync_cursors` (
	`table_name` text PRIMARY KEY NOT NULL,
	`updated_at` text NOT NULL,
	`record_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `tasks_deleted_at_idx` ON `tasks` (`deleted_at`);