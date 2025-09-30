import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originalUrl: text('original_url').unique().notNull(),
  shortCode: text('short_code').unique().notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(
    () => new Date()
  ),
  clickCount: integer('click_count').default(0),
});
