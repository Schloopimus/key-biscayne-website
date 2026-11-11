CREATE TABLE `market_admin` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_admin_email_unique` ON `market_admin` (`email`);--> statement-breakpoint
CREATE TABLE `market_booking` (
	`id` text PRIMARY KEY NOT NULL,
	`market_date` text NOT NULL,
	`stall_id` integer NOT NULL,
	`reservation_id` text,
	`vendor_id` text,
	`walk_in` text DEFAULT '' NOT NULL,
	`plan` text NOT NULL,
	`amount` integer NOT NULL,
	`tent` integer DEFAULT false NOT NULL,
	`tables` integer DEFAULT 0 NOT NULL,
	`electricity` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'due' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `market_reservation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_booking_active_unique` ON `market_booking` (`market_date`,`stall_id`) WHERE "market_booking"."status" in ('due', 'confirming', 'paid', 'waived');--> statement-breakpoint
CREATE INDEX `market_booking_vendor_idx` ON `market_booking` (`vendor_id`,`market_date`);--> statement-breakpoint
CREATE INDEX `market_booking_reservation_idx` ON `market_booking` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `market_cancellation` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`cancelled_at` integer NOT NULL,
	`late` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `market_closure` (
	`market_date` text NOT NULL,
	`stall_id` integer NOT NULL,
	PRIMARY KEY(`market_date`, `stall_id`)
);
--> statement-breakpoint
CREATE TABLE `market_document` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`kind` text NOT NULL,
	`file_name` text NOT NULL,
	`stored_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_document_kind_unique` ON `market_document` (`vendor_id`,`kind`);--> statement-breakpoint
CREATE TABLE `market_hold` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`reason` text NOT NULL,
	`placed_at` integer NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `market_reservation` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`plan` text NOT NULL,
	`stall_id` integer NOT NULL,
	`per_saturday` integer NOT NULL,
	`tent` integer DEFAULT false NOT NULL,
	`tables` integer DEFAULT 0 NOT NULL,
	`electricity` integer DEFAULT false NOT NULL,
	`other_extras` text DEFAULT '' NOT NULL,
	`addons_held` integer DEFAULT false NOT NULL,
	`current` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `market_reservation_vendor_idx` ON `market_reservation` (`vendor_id`,`current`);--> statement-breakpoint
CREATE TABLE `market_session` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_session_subject_idx` ON `market_session` (`kind`,`subject_id`);--> statement-breakpoint
CREATE TABLE `market_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly` text NOT NULL,
	`seasonal` text NOT NULL,
	`tent` text NOT NULL,
	`table_each` text NOT NULL,
	`electricity` text NOT NULL,
	`stock_tables` integer NOT NULL,
	`stock_electricity` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `market_token` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `market_vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `market_vendor` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`business` text NOT NULL,
	`phone` text NOT NULL,
	`category` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`details_done` integer DEFAULT false NOT NULL,
	`documents_done` integer DEFAULT false NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`products` text DEFAULT '' NOT NULL,
	`price_range` text DEFAULT '' NOT NULL,
	`target_market` text DEFAULT '' NOT NULL,
	`insurance_provider` text DEFAULT '' NOT NULL,
	`policy_number` text DEFAULT '' NOT NULL,
	`acks_json` text DEFAULT '[]' NOT NULL,
	`approved_until` integer,
	`expiry_reason` text DEFAULT '' NOT NULL,
	`space_lost` integer DEFAULT false NOT NULL,
	`notice` text DEFAULT '' NOT NULL,
	`submitted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_vendor_email_unique` ON `market_vendor` (`email`);