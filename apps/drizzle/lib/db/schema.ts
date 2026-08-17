import { relations } from "drizzle-orm/_relations";
import {
  index,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const posts = pgTable(
  "posts",
  {
    content: text("content").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),

    metadata: json("metadata"),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    slugUnique: unique("posts_slug_unique").on(table.slug),
  }),
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
  },
  (table) => ({
    nameUnique: unique("tags_name_unique").on(table.name),
  }),
);

export const postsToTags = pgTable(
  "posts_to_tags",
  {
    postId: serial("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),

    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: unique("posts_to_tags_unique").on(table.postId, table.tagId),
  }),
);

export const postsRelations = relations(posts, ({ many }) => ({
  tags: many(postsToTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postsToTags),
}));

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}));
