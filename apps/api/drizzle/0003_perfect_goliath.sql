ALTER TABLE "companies" ADD COLUMN "owner_id" text;--> statement-breakpoint
CREATE INDEX "companies_owner_id_idx" ON "companies" USING btree ("owner_id");