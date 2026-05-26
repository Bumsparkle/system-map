CREATE TABLE "vendor_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"resolved_name" text,
	"domain" text,
	"logo_url" text,
	"description" text,
	"category" text,
	"maturity" text,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vendor_cache_query_unique" UNIQUE("query")
);
--> statement-breakpoint
CREATE INDEX "vendor_cache_query_idx" ON "vendor_cache" USING btree ("query");