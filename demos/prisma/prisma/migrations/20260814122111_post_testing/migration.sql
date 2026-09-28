-- AlterTable
CREATE SEQUENCE posts_id_seq;
ALTER TABLE "posts" ALTER COLUMN "id" SET DEFAULT nextval('posts_id_seq');
ALTER SEQUENCE posts_id_seq OWNED BY "posts"."id";
