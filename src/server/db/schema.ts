import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

export const posts = pgTable(
  "post",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: varchar({ length: 255 }),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  },
  (example) => ({
    userIdIdx: index("user_id_idx").on(example.userId),
    nameIndex: index("name_idx").on(example.name),
  }),
);

export const users = pgTable("user", {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull(),
  emailVerified: timestamp({
    mode: "date",
    withTimezone: true,
  }).defaultNow(),
  image: varchar({ length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = pgTable(
  "account",
  {
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: varchar({ length: 255 }).notNull(),
    providerAccountId: varchar({ length: 255 }).notNull(),

    // These need an underscore, due to the adapter property naming of auth.js
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: varchar({ length: 255 }),
    scope: varchar({ length: 255 }),
    id_token: text(),
    session_state: varchar({ length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = pgTable(
  "session",
  {
    sessionToken: varchar({ length: 255 }).notNull().primaryKey(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp({
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    expires: timestamp({
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
