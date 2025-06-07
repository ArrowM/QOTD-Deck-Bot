CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decks_name_guild_id_unique` ON `decks` (`name`,`guild_id`);--> statement-breakpoint
CREATE TABLE `privileged_roles` (
	`guild_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`guild_id`, `role_id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`question` text NOT NULL,
	`order` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_question_deck_id_unique` ON `questions` (`question`,`deck_id`);--> statement-breakpoint
CREATE TABLE `subscription_decks` (
	`subscription_id` integer NOT NULL,
	`deck_id` integer NOT NULL,
	`current_question_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`subscription_id`, `deck_id`),
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`cron_schedule` text NOT NULL,
	`current_deck_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_channel_id_unique` ON `subscriptions` (`channel_id`);