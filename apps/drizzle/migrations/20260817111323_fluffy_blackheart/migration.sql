CREATE TABLE "posts" (
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY,
	"metadata" json,
	"slug" varchar(200) NOT NULL CONSTRAINT "posts_slug_unique" UNIQUE,
	"title" varchar(200) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts_to_tags" (
	"post_id" serial,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "posts_to_tags_unique" UNIQUE("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(200) NOT NULL CONSTRAINT "tags_name_unique" UNIQUE
);
--> statement-breakpoint
DROP TABLE "todo";--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" ("created_at");--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_tag_id_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;