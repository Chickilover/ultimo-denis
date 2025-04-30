import { users, accounts, categories, tags, transactions, transactionTags, transactionSplits, recurringTransactions, budgets, savingsGoals, savingsContributions, settings, transactionTypes, accountTypes, familyMembers } from "@shared/schema";
import type { User, InsertUser, Account, InsertAccount, Category, InsertCategory, Tag, InsertTag, Transaction, InsertTransaction, TransactionTag, InsertTransactionTag, TransactionSplit, InsertTransactionSplit, RecurringTransaction, InsertRecurringTransaction, Budget, InsertBudget, SavingsGoal, InsertSavingsGoal, SavingsContribution, InsertSavingsContribution, Settings, InsertSettings, FamilyMember, InsertFamilyMember } from "@shared/schema";
import { eq, and, gte, lte, like, isNull, desc, asc, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  
  // Family Member methods
  async getFamilyMembers(userId: number): Promise<FamilyMember[]> {
    return db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    const result = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return result[0];
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const result = await db.insert(familyMembers).values(member).returning();
    return result[0];
  }

  async updateFamilyMember(id: number, memberData: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const result = await db
      .update(familyMembers)
      .set(memberData)
      .where(eq(familyMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteFamilyMember(id: number): Promise<boolean> {
    const result = await db.delete(familyMembers).where(eq(familyMembers.id, id));
    return result.rowCount > 0;
  }

  // Account methods
  async getAccounts(userId: number): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccountsByUser(userId: number, includeShared: boolean): Promise<Account[]> {
    if (includeShared) {
      return db
        .select()
        .from(accounts)
        .where(or(eq(accounts.userId, userId), eq(accounts.isShared, true)));
    }
    return this.getAccounts(userId);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values(account).returning();
    return result[0];
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const result = await db
      .update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return result.rowCount > 0;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const result = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount > 0;
  }

  // Tag methods
  async getTags(userId?: number): Promise<Tag[]> {
    if (userId) {
      return db
        .select()
        .from(tags)
        .where(or(eq(tags.userId, userId), isNull(tags.userId)));
    }
    return db.select().from(tags);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const result = await db.select().from(tags).where(eq(tags.id, id));
    return result[0];
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const result = await db.insert(tags).values(tag).returning();
    return result[0];
  }

  async deleteTag(id: number): Promise<boolean> {
    const result = await db.delete(tags).where(eq(tags.id, id));
    return result.rowCount > 0;
  }

  // Transaction methods
  async getTransactions(userId: number, filters?: any): Promise<Transaction[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(transactions);
    
    if (user && user.householdId) {
      // Si el usuario pertenece a un hogar, obtener sus transacciones y las compartidas del mismo hogar
      const householdUsers = await db.select().from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      
      // Obtener las transacciones del usuario o las compartidas de su hogar
      query = query.where(
        or(
          eq(transactions.userId, userId),
          and(
            eq(transactions.isShared, true),
            inArray(transactions.userId, householdUserIds)
          )
        )
      );
    } else {
      // Si no tiene hogar, solo obtener sus propias transacciones
      query = query.where(eq(transactions.userId, userId));
    }

    if (filters) {
      if (filters.startDate) {
        query = query.where(gte(transactions.date, filters.startDate));
      }
      if (filters.endDate) {
        query = query.where(lte(transactions.date, filters.endDate));
      }
      if (filters.categoryId) {
        query = query.where(eq(transactions.categoryId, filters.categoryId));
      }
      if (filters.accountId) {
        query = query.where(eq(transactions.accountId, filters.accountId));
      }
      if (filters.search) {
        query = query.where(like(transactions.description, `%${filters.search}%`));
      }
      if (filters.isShared !== undefined) {
        query = query.where(eq(transactions.isShared, filters.isShared));
      }
      if (filters.transactionTypeId) {
        query = query.where(eq(transactions.transactionTypeId, filters.transactionTypeId));
      }
    }

    return query.orderBy(desc(transactions.date));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const result = await db
      .update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return result.rowCount > 0;
  }

  // TransactionTag methods
  async addTagToTransaction(transactionTag: InsertTransactionTag): Promise<TransactionTag> {
    const result = await db.insert(transactionTags).values(transactionTag).returning();
    return result[0];
  }

  async removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean> {
    const result = await db
      .delete(transactionTags)
      .where(
        and(
          eq(transactionTags.transactionId, transactionId),
          eq(transactionTags.tagId, tagId)
        )
      );
    return result.rowCount > 0;
  }

  // TransactionSplit methods
  async getSplitsByTransaction(transactionId: number): Promise<TransactionSplit[]> {
    return db
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.transactionId, transactionId));
  }

  async createTransactionSplit(split: InsertTransactionSplit): Promise<TransactionSplit> {
    const result = await db.insert(transactionSplits).values(split).returning();
    return result[0];
  }

  async deleteTransactionSplit(id: number): Promise<boolean> {
    const result = await db.delete(transactionSplits).where(eq(transactionSplits.id, id));
    return result.rowCount > 0;
  }

  // RecurringTransaction methods
  async getRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(recurringTransactions);
    
    if (user && user.householdId) {
      // Si el usuario pertenece a un hogar, obtener sus transacciones recurrentes y las compartidas del mismo hogar
      const householdUsers = await db.select().from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      
      // Obtener las transacciones recurrentes del usuario o las compartidas de su hogar
      query = query.where(
        or(
          eq(recurringTransactions.userId, userId),
          and(
            eq(recurringTransactions.isShared, true),
            inArray(recurringTransactions.userId, householdUserIds)
          )
        )
      );
    } else {
      // Si no tiene hogar, solo obtener sus propias transacciones recurrentes
      query = query.where(eq(recurringTransactions.userId, userId));
    }
    
    return query;
  }

  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    const result = await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, id));
    return result[0];
  }

  async createRecurringTransaction(recurringTransaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const result = await db
      .insert(recurringTransactions)
      .values(recurringTransaction)
      .returning();
    return result[0];
  }

  async updateRecurringTransaction(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const result = await db
      .update(recurringTransactions)
      .set(data)
      .where(eq(recurringTransactions.id, id))
      .returning();
    return result[0];
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    const result = await db
      .delete(recurringTransactions)
      .where(eq(recurringTransactions.id, id));
    return result.rowCount > 0;
  }

  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(budgets);
    
    if (user && user.householdId) {
      // Si el usuario pertenece a un hogar, obtener sus presupuestos y los compartidos del mismo hogar
      const householdUsers = await db.select().from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      
      // Obtener los presupuestos del usuario o los compartidos de su hogar
      query = query.where(
        or(
          eq(budgets.userId, userId),
          and(
            eq(budgets.isShared, true),
            inArray(budgets.userId, householdUserIds)
          )
        )
      );
    } else {
      // Si no tiene hogar, solo obtener sus propios presupuestos
      query = query.where(eq(budgets.userId, userId));
    }
    
    return query;
  }

  async getBudget(id: number): Promise<Budget | undefined> {
    const result = await db.select().from(budgets).where(eq(budgets.id, id));
    return result[0];
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const result = await db.insert(budgets).values(budget).returning();
    return result[0];
  }

  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const result = await db
      .update(budgets)
      .set(budgetData)
      .where(eq(budgets.id, id))
      .returning();
    return result[0];
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return result.rowCount > 0;
  }

  // SavingsGoal methods
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(savingsGoals);
    
    if (user && user.householdId) {
      // Si el usuario pertenece a un hogar, obtener sus metas de ahorro y las compartidas del mismo hogar
      const householdUsers = await db.select().from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      
      // Obtener las metas de ahorro del usuario o las compartidas de su hogar
      query = query.where(
        or(
          eq(savingsGoals.userId, userId),
          and(
            eq(savingsGoals.isShared, true),
            inArray(savingsGoals.userId, householdUserIds)
          )
        )
      );
    } else {
      // Si no tiene hogar, solo obtener sus propias metas de ahorro
      query = query.where(eq(savingsGoals.userId, userId));
    }
    
    return query;
  }

  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    const result = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
    return result[0];
  }

  async createSavingsGoal(savingsGoal: InsertSavingsGoal): Promise<SavingsGoal> {
    const result = await db.insert(savingsGoals).values(savingsGoal).returning();
    return result[0];
  }

  async updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const result = await db
      .update(savingsGoals)
      .set(data)
      .where(eq(savingsGoals.id, id))
      .returning();
    return result[0];
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    const result = await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
    return result.rowCount > 0;
  }

  // SavingsContribution methods
  async getContributionsBySavingsGoal(savingsGoalId: number): Promise<SavingsContribution[]> {
    return db
      .select()
      .from(savingsContributions)
      .where(eq(savingsContributions.savingsGoalId, savingsGoalId));
  }

  async createSavingsContribution(contribution: InsertSavingsContribution): Promise<SavingsContribution> {
    const result = await db
      .insert(savingsContributions)
      .values(contribution)
      .returning();
    return result[0];
  }

  async deleteSavingsContribution(id: number): Promise<boolean> {
    const result = await db
      .delete(savingsContributions)
      .where(eq(savingsContributions.id, id));
    return result.rowCount > 0;
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId));
    return result[0];
  }

  async createSettings(setting: InsertSettings): Promise<Settings> {
    const result = await db.insert(settings).values(setting).returning();
    return result[0];
  }

  async updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined> {
    try {
      console.log(`Actualizando configuración para usuario ${userId}:`, data);
      
      // Asegurar que lastExchangeRateUpdate sea de tipo Date si está presente
      let processedData = { ...data };
      
      if (processedData.lastExchangeRateUpdate && typeof processedData.lastExchangeRateUpdate === 'string') {
        try {
          // Si es una cadena ISO, convertir a Date
          processedData.lastExchangeRateUpdate = new Date(processedData.lastExchangeRateUpdate);
        } catch (err) {
          console.error("Error al convertir lastExchangeRateUpdate a Date:", err);
          // Si falla, usamos la fecha actual
          processedData.lastExchangeRateUpdate = new Date();
        }
      }
      
      console.log("Datos procesados:", processedData);
      
      const result = await db
        .update(settings)
        .set(processedData)
        .where(eq(settings.userId, userId))
        .returning();
        
      console.log("Resultado de actualización:", result[0]);
      
      return result[0];
    } catch (error) {
      console.error("Error al actualizar la configuración:", error);
      throw error;
    }
  }

  // Transaction types
  async getTransactionTypes(): Promise<typeof transactionTypes.$inferSelect[]> {
    return db.select().from(transactionTypes);
  }

  // Account types
  async getAccountTypes(): Promise<typeof accountTypes.$inferSelect[]> {
    return db.select().from(accountTypes);
  }
}