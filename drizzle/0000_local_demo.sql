CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_kind` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `booking` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`event_stall_id` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`price_cents` integer NOT NULL,
	`reserved_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_stall_id`) REFERENCES `event_stall`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_active_stall_unique` ON `booking` (`event_stall_id`) WHERE "booking"."status" = 'reserved';--> statement-breakpoint
CREATE INDEX `booking_vendor_idx` ON `booking` (`vendor_id`,`status`);--> statement-breakpoint
CREATE TABLE `event_stall` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`stall_id` text NOT NULL,
	`tier` text DEFAULT 'standard' NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `market_event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stall_id`) REFERENCES `stall`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_stall_unique` ON `event_stall` (`event_id`,`stall_id`);--> statement-breakpoint
CREATE INDEX `event_stall_event_idx` ON `event_stall` (`event_id`);--> statement-breakpoint
CREATE TABLE `form_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`submitter_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`topic` text,
	`subject` text,
	`message` text,
	`details_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_submission_type_created_idx` ON `form_submission` (`type`,`created_at`);--> statement-breakpoint
CREATE TABLE `market_event` (
	`id` text PRIMARY KEY NOT NULL,
	`market_date` text NOT NULL,
	`label` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_event_date_unique` ON `market_event` (`market_date`);--> statement-breakpoint
CREATE TABLE `stall` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stall_code_unique` ON `stall` (`code`);--> statement-breakpoint
CREATE TABLE `vendor_application` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`business_name` text NOT NULL,
	`product_category` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`details` text NOT NULL,
	`certificate_file_name` text NOT NULL,
	`certificate_stored_name` text NOT NULL,
	`certificate_mime` text NOT NULL,
	`certificate_size` integer NOT NULL,
	`rejection_reason` text,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_application_revision_unique` ON `vendor_application` (`vendor_id`,`revision`);--> statement-breakpoint
CREATE INDEX `vendor_application_status_idx` ON `vendor_application` (`status`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `vendor` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`contact_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_email_unique` ON `vendor` (`email`);