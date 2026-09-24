ALTER TABLE "hot_sauces" DROP CONSTRAINT "hot_sauces_name_unique";--> statement-breakpoint
ALTER TABLE "hot_sauces" ADD CONSTRAINT "hot_sauces_maker_name_unique" UNIQUE("maker_id","name");