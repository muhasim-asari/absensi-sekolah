import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('student'), // 'teacher' or 'student'
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendanceLogs = pgTable('attendance_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:MM:SS
  latitude: decimal('latitude').notNull(),
  longitude: decimal('longitude').notNull(),
  imageUrl: text('image_url'), // Can be base64 string
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  attendance: many(attendanceLogs),
}));

export const attendanceLogsRelations = relations(attendanceLogs, ({ one }) => ({
  user: one(users, {
    fields: [attendanceLogs.userId],
    references: [users.id],
  }),
}));
