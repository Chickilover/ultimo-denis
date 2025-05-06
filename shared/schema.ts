import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, varchar, jsonb, index } from "drizzle-orm/pg-core";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and household members
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(), // Email para invitaciones y recuperación de contraseña
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"), // URL o ruta a la imagen de avatar
  avatarColor: text("avatar_color").default("#6366f1"), // Color para las iniciales cuando no hay avatar
  incomeColor: text("income_color").default("#10b981"), // Color para los ingresos
  expenseColor: text("expense_color").default("#ef4444"), // Color para los gastos
  isAdmin: boolean("is_admin").notNull().default(false),
  householdId: integer("household_id"), // ID del grupo familiar al que pertenece
  personalBalance: numeric("personal_balance").notNull().default("0"), // Balance personal (privado)
  familyBalance: numeric("family_balance").notNull().default("0"), // Balance familiar (compartido)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para grupos de hogar
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHouseholdSchema = createInsertSchema(households).pick({
  name: true,
  createdByUserId: true,
});

export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;

// Invitaciones a hogares
export const householdInvitations = pgTable("household_invitations", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  invitedByUserId: integer("invited_by_user_id").references(() => users.id).notNull(),
  invitedUsername: text("invited_username").notNull(), // Ahora usamos username en lugar de email
  invitedUserId: integer("invited_user_id").references(() => users.id), // Usuario invitado (si se encuentra)
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertHouseholdInvitationSchema = createInsertSchema(householdInvitations).pick({
  householdId: true,
  invitedByUserId: true,
  invitedUsername: true, // Cambiado de invitedEmail a invitedUsername
  expiresAt: true,
});

export type InsertHouseholdInvitation = z.infer<typeof insertHouseholdInvitationSchema>;
export type HouseholdInvitation = typeof householdInvitations.$inferSelect;

// Actualización del esquema de usuario para incluir email
// Base schema para usuarios
const baseUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  isAdmin: true,
  householdId: true,
});

// Esquema extendido para incluir el campo de código de invitación opcional
export const insertUserSchema = baseUserSchema.extend({
  invitationCode: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Account types: Cash, Checking, Savings, Credit Card, Loan, Investment
export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Financial accounts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  accountTypeId: integer("account_type_id").references(() => accountTypes.id).notNull(),
  initialBalance: numeric("initial_balance").notNull().default("0"),
  currentBalance: numeric("current_balance").notNull().default("0"),
  currency: text("currency").notNull().default("UYU"), // UYU or USD
  isShared: boolean("is_shared").notNull().default(false),
  institution: text("institution"),
  accountNumber: text("account_number"),
  closingDay: integer("closing_day"), // For credit cards
  dueDay: integer("due_day"), // For credit cards
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  userId: true,
  name: true,
  accountTypeId: true,
  initialBalance: true,
  currentBalance: true,
  currency: true,
  isShared: true,
  institution: true,
  accountNumber: true,
  closingDay: true,
  dueDay: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Categories and subcategories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  isIncome: boolean("is_income").notNull().default(false),
  isSystem: boolean("is_system").notNull().default(false),
  parentId: integer("parent_id").references(() => categories.id),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
  color: true,
  isIncome: true,
  parentId: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Tags for transactions
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  isSystem: boolean("is_system").notNull().default(false),
});

export const insertTagSchema = createInsertSchema(tags).pick({
  name: true,
  userId: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

// Transaction types: Income, Expense, Transfer
export const transactionTypes = pgTable("transaction_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id), // Cuenta opcional - asegurarse de que esto sea NULL
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  transactionTypeId: integer("transaction_type_id").references(() => transactionTypes.id).notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("UYU"), // UYU or USD
  description: text("description").notNull(),
  date: date("date").notNull(),
  time: text("time"),
  isShared: boolean("is_shared").notNull().default(false),
  isReconciled: boolean("is_reconciled").notNull().default(false),
  isReimbursable: boolean("is_reimbursable").notNull().default(false),
  isReimbursed: boolean("is_reimbursed").notNull().default(false),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create a more flexible transaction schema with proper transformation
const baseInsertTransactionSchema = createInsertSchema(transactions, {
  amount: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === "string" ? val : val.toString()
  ),
  date: z.union([z.string(), z.date()]).transform((val) => 
    val instanceof Date ? val : new Date(val)
  )
}).pick({
  userId: true,
  accountId: true,
  categoryId: true,
  transactionTypeId: true,
  amount: true,
  currency: true,
  description: true,
  date: true,
  time: true,
  isShared: true,
  isReconciled: true,
  isReimbursable: true,
  isReimbursed: true,
  notes: true,
  receiptUrl: true,
});

// Make certain fields optional with defaults
export const insertTransactionSchema = baseInsertTransactionSchema.extend({
  accountId: z.number().nullish(), // Make account optional
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Transaction Tags Relation
export const transactionTags = pgTable("transaction_tags", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
});

export const insertTransactionTagSchema = createInsertSchema(transactionTags).pick({
  transactionId: true,
  tagId: true,
});

export type InsertTransactionTag = z.infer<typeof insertTransactionTagSchema>;
export type TransactionTag = typeof transactionTags.$inferSelect;

// Split transactions
export const transactionSplits = pgTable("transaction_splits", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
});

export const insertTransactionSplitSchema = createInsertSchema(transactionSplits).pick({
  transactionId: true,
  categoryId: true,
  amount: true,
  description: true,
});

export type InsertTransactionSplit = z.infer<typeof insertTransactionSplitSchema>;
export type TransactionSplit = typeof transactionSplits.$inferSelect;

// Recurring transactions
export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  transactionTypeId: integer("transaction_type_id").references(() => transactionTypes.id).notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("UYU"),
  description: text("description").notNull(),
  frequency: text("frequency").notNull(), // daily, weekly, biweekly, monthly, yearly
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  nextDueDate: date("next_due_date").notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  reminderDays: integer("reminder_days").default(1),
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).pick({
  userId: true,
  accountId: true,
  categoryId: true,
  transactionTypeId: true,
  amount: true,
  currency: true,
  description: true,
  frequency: true,
  startDate: true,
  endDate: true,
  nextDueDate: true,
  isShared: true,
  reminderDays: true,
});

export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;

// Budgets
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("UYU"),
  period: text("period").notNull().default("monthly"), // monthly, weekly, biweekly, yearly
  isRollover: boolean("is_rollover").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(false),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  paymentType: text("payment_type").default("one-time"), // one-time, installments
  paymentDay: integer("payment_day"), // Día del mes para pagos recurrentes
  installments: integer("installments"), // Número de cuotas
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvalCount: integer("approval_count").default(0), // Conteo de votos positivos
  rejectionCount: integer("rejection_count").default(0), // Conteo de votos negativos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetSchema = createInsertSchema(budgets).pick({
  userId: true,
  categoryId: true,
  name: true,
  amount: true,
  currency: true,
  period: true,
  isRollover: true,
  isShared: true,
  startDate: true,
  endDate: true,
  paymentType: true,
  paymentDay: true,
  installments: true,
  status: true,
  approvalCount: true,
  rejectionCount: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Savings goals
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount").notNull(),
  currentAmount: numeric("current_amount").notNull().default("0"),
  currency: text("currency").notNull().default("UYU"),
  deadline: date("deadline"),
  isShared: boolean("is_shared").notNull().default(false),
  accountId: integer("account_id").references(() => accounts.id),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).pick({
  userId: true,
  name: true,
  targetAmount: true,
  currentAmount: true,
  currency: true,
  deadline: true,
  isShared: true,
  accountId: true,
  icon: true,
});

export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type SavingsGoal = typeof savingsGoals.$inferSelect;

// Savings goal contributions
export const savingsContributions = pgTable("savings_contributions", {
  id: serial("id").primaryKey(),
  savingsGoalId: integer("savings_goal_id").references(() => savingsGoals.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  transactionId: integer("transaction_id").references(() => transactions.id),
  notes: text("notes"),
});

export const insertSavingsContributionSchema = createInsertSchema(savingsContributions).pick({
  savingsGoalId: true,
  userId: true,
  amount: true,
  date: true,
  transactionId: true,
  notes: true,
});

export type InsertSavingsContribution = z.infer<typeof insertSavingsContributionSchema>;
export type SavingsContribution = typeof savingsContributions.$inferSelect;

// Family members
export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // El usuario al que pertenece este miembro
  name: text("name").notNull(),
  email: text("email"), // Email para invitaciones si puede acceder a la app
  relationship: text("relationship").notNull(), // Esposo/a, Hijo/a, Padre/Madre, etc.
  isActive: boolean("is_active").notNull().default(true),
  canAccess: boolean("can_access").notNull().default(false), // Si puede tener acceso a la aplicación
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).pick({
  userId: true,
  name: true,
  email: true,
  relationship: true,
  isActive: true,
  canAccess: true,
  avatarUrl: true,
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  defaultCurrency: text("default_currency").notNull().default("UYU"),
  theme: text("theme").notNull().default("light"),
  language: text("language").notNull().default("es"),
  exchangeRate: numeric("exchange_rate").default("40.0"),
  lastExchangeRateUpdate: timestamp("last_exchange_rate_update"),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  defaultCurrency: true,
  theme: true,
  language: true,
  exchangeRate: true,
  lastExchangeRateUpdate: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Transferencias de balance entre personal y familiar
export const balanceTransfers = pgTable("balance_transfers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fromPersonal: boolean("from_personal").notNull(), // true si es de personal a familiar, false si es de familiar a personal
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("UYU"),
  description: text("description"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBalanceTransferSchema = createInsertSchema(balanceTransfers).pick({
  userId: true,
  fromPersonal: true,
  amount: true,
  currency: true,
  description: true,
  date: true,
});

export type InsertBalanceTransfer = z.infer<typeof insertBalanceTransferSchema>;
export type BalanceTransfer = typeof balanceTransfers.$inferSelect;
