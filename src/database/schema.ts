import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const decks = sqliteTable("decks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	guildId: text("guild_id").notNull(),
	name: text("name").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
	// Name should be unique within a guild
	nameGuildIndex: unique().on(table.name, table.guildId),
}));

export const questions = sqliteTable("questions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
	question: text("question").notNull(),
	order: integer("order").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
	// Question should be unique within a deck
	questionDeckIndex: unique().on(table.question, table.deckId),
}));

export const subscriptions = sqliteTable("subscriptions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	channelId: text("channel_id").notNull().unique(),
	guildId: text("guild_id").notNull(),
	cronSchedule: text("cron_schedule").notNull(),
	currentDeckIndex: integer("current_deck_index").notNull().default(0), // Which deck to use next
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const subscriptionDecks = sqliteTable("subscription_decks", {
	subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
	deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
	currentQuestionIndex: integer("current_question_index").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
	pk: primaryKey({ columns: [table.subscriptionId, table.deckId] }),
}));

export const privilegedRoles = sqliteTable("privileged_roles", {
	guildId: text("guild_id").notNull(),
	roleId: text("role_id").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
	pk: primaryKey({ columns: [table.guildId, table.roleId] }),
}));