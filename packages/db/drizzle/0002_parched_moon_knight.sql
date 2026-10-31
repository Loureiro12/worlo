CREATE TABLE `_sync_rejected` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`payload` text NOT NULL,
	`error` text NOT NULL,
	`rejected_at` text NOT NULL
);
