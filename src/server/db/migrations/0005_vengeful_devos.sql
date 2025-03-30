ALTER TABLE "caregiver" DROP CONSTRAINT "caregiver_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "caregiver_user_id_idx";--> statement-breakpoint
DROP INDEX "spatial_index";--> statement-breakpoint
ALTER TABLE "caregiver" ADD COLUMN "prefers_nights" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "caregiver" ADD COLUMN "prefers_weekends" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "caregiver" ADD COLUMN "skills" integer[] DEFAULT ARRAY[]::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "caregiver" ADD COLUMN "location" geometry(point) DEFAULT ST_SetSRID(ST_MakePoint(40.636721, 22.94486), 4326) NOT NULL;--> statement-breakpoint
CREATE INDEX "caregiver_spatial_index" ON "caregiver" USING gist ("location");--> statement-breakpoint
CREATE INDEX "patient_spatial_index" ON "patient" USING gist ("location");--> statement-breakpoint
CREATE INDEX "shift_caregiver_id_idx" ON "shift" USING btree ("caregiver_id");--> statement-breakpoint
ALTER TABLE "caregiver" DROP COLUMN "user_id";
INSERT INTO public.caregiver (name, created_at, updated_at, prefers_nights, prefers_weekends, skills, location)
VALUES
  ('Dimitrios Papadopoulos'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.642480,22.948253), 4326)),
  ('Eleni Karadimitriou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.637064,22.947696), 4326)),
  ('Giorgos Konstantinidis'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.639756,22.939905), 4326)),
  ('Maria Vasileiadou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.629958,22.951077), 4326)),
  ('Nikolaos Christodoulou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.644345,22.964067), 4326)),
  ('Anastasia Ioannidou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.660638,22.963444), 4326)),
  ('Theodoros Makridis'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.689271,22.954450), 4326)),
  ('Katerina Alexiou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.712822,22.930555), 4326)),
  ('Panagiotis Spanopoulos'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.600125,22.961625), 4326)),
  ('Sofia Papageorgiou'::varchar(255), NOW(), NOW(), DEFAULT, DEFAULT, DEFAULT,
    ST_SetSRID(ST_MakePoint(40.603855,22.973577), 4326));
