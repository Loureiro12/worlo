ALTER TABLE `devices` ADD `push_token` text;--> statement-breakpoint
ALTER TABLE `devices` ADD `language` text DEFAULT 'pt-BR' NOT NULL;