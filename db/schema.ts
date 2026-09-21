import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const assistantState = sqliteTable('assistant_state', {owner: text('owner').primaryKey(), payload: text('payload').notNull(), revision: integer('revision').notNull().default(0)});
