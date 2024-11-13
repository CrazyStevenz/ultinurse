import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
};

export const accounts = pgTable(
  "account",
  {
    userId: uuid()
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

    ...timestamps,
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("account_user_id_idx").on(account.userId),
  ],
);
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const caregivers = pgTable(
  "caregiver",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: varchar({ length: 255 }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (caregiver) => [
    index("user_id_idx").on(caregiver.userId),
    index("name_idx").on(caregiver.name),
  ],
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: varchar({ length: 255 }).notNull().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    expires: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (session) => [index("session_user_id_idx").on(session.userId)],
);
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const users = pgTable("user", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull(),
  emailVerified: timestamp({ withTimezone: true }).defaultNow(),
  image: varchar({ length: 255 }),
  ...timestamps,
});
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);
