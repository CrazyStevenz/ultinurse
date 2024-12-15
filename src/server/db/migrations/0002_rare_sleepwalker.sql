CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "patient" ADD COLUMN "location" geometry(point) NOT NULL;--> statement-breakpoint
CREATE INDEX "spatial_index" ON "patient" USING gist ("location");
