import { users, accounts, categories, tags, transactions, transactionTags, transactionSplits, recurringTransactions, budgets, savingsGoals, savingsContributions, settings, transactionTypes, accountTypes, familyMembers, balanceTransfers } from "@shared/schema";
import type { User, InsertUser, Account, InsertAccount, Category, InsertCategory, Tag, InsertTag, Transaction, InsertTransaction, TransactionTag, InsertTransactionTag, TransactionSplit, InsertTransactionSplit, RecurringTransaction, InsertRecurringTransaction, Budget, InsertBudget, SavingsGoal, InsertSavingsGoal, SavingsContribution, InsertSavingsContribution, Settings, InsertSettings, FamilyMember, InsertFamilyMember, BalanceTransfer, InsertBalanceTransfer } from "@shared/schema";
import { eq, and, gte, lte, like, isNull, desc, asc, or, inArray, SQL } from "drizzle-orm"; // Removed sql import
import session, { Store } from "express-session"; // Corrected import
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: Store; // Corrected type

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: false // Kept original value
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0] as User | undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Ensure all required fields for User type are returned by relying on DB defaults or explicit values
    const result = await db.insert(users).values({
      username: user.username,
      email: user.email,
      password: user.password,
      name: user.name,
      isAdmin: user.isAdmin ?? false, // Ensure boolean, default to false
      householdId: user.householdId,
      // avatar, avatarColor, etc., will use DB defaults if not provided
      // personalBalance, familyBalance, createdAt also use DB defaults
    }).returning();
    return result[0] as User;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0] as User | undefined;
  }
  
  // Family Member methods
  async getFamilyMembers(userId: number): Promise<FamilyMember[]> {
    return db.select().from(familyMembers).where(eq(familyMembers.userId, userId)) as Promise<FamilyMember[]>;
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    const result = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return result[0] as FamilyMember | undefined;
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const result = await db.insert(familyMembers).values(member).returning();
    return result[0] as FamilyMember;
  }

  async updateFamilyMember(id: number, memberData: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const result = await db
      .update(familyMembers)
      .set(memberData)
      .where(eq(familyMembers.id, id))
      .returning();
    return result[0] as FamilyMember | undefined;
  }

  async deleteFamilyMember(id: number): Promise<boolean> {
    const result = await db.delete(familyMembers).where(eq(familyMembers.id, id));
    return (result.rowCount ?? 0) > 0; // Handle null rowCount
  }

  // Account methods
  async getAccounts(userId: number): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.userId, userId)) as Promise<Account[]>;
  }

  async getAccountsByUser(userId: number, includeShared: boolean): Promise<Account[]> {
    if (includeShared) {
      return db
        .select()
        .from(accounts)
        .where(or(eq(accounts.userId, userId), eq(accounts.isShared, true))) as Promise<Account[]>;
    }
    return this.getAccounts(userId);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0] as Account | undefined;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const valuesToInsert = {
        ...account,
        initialBalance: (account.initialBalance ?? "0").toString(),
        currentBalance: (account.currentBalance ?? account.initialBalance ?? "0").toString(),
    };
    const result = await db.insert(accounts).values(valuesToInsert).returning();
    return result[0] as Account;
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const dataToUpdate = { ...accountData };
    if (typeof accountData.initialBalance !== 'undefined') dataToUpdate.initialBalance = accountData.initialBalance.toString();
    if (typeof accountData.currentBalance !== 'undefined') dataToUpdate.currentBalance = accountData.currentBalance.toString();

    const result = await db
      .update(accounts)
      .set(dataToUpdate)
      .where(eq(accounts.id, id))
      .returning();
    return result[0] as Account | undefined;
  }

  async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return (result.rowCount ?? 0) > 0; // Handle null rowCount
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories) as Promise<Category[]>;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0] as Category | undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    // isSystem defaults to false in schema, DB should handle it.
    // id is serial, DB handles it.
    const categoryValues: InsertCategory = {
      name: category.name,
      icon: category.icon,
      color: category.color,
      isIncome: category.isIncome ?? false,
      parentId: category.parentId,
    };
    const result = await db.insert(categories).values(categoryValues).returning();
    return result[0] as Category;
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    // Add logic to prevent isSystem change if needed
    const result = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return result[0] as Category | undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const cat = await this.getCategory(id);
    if (cat && cat.isSystem) {
        return false; // Prevent deleting system categories
    }
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0; // Handle null rowCount
  }

  // Tag methods
  async getTags(userId?: number): Promise<Tag[]> {
    if (userId) {
      return db.select().from(tags).where(or(eq(tags.userId, userId), eq(tags.isSystem, true))) as Promise<Tag[]>; // System tags are global
    }
    return db.select().from(tags) as Promise<Tag[]>;
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const result = await db.select().from(tags).where(eq(tags.id, id));
    return result[0] as Tag | undefined;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    // isSystem defaults to false in DB if not provided and column allows null or has default
    const result = await db.insert(tags).values(tag).returning();
    return result[0] as Tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const tagToDelete = await this.getTag(id);
    if (tagToDelete && tagToDelete.isSystem) {
        return false; // Prevent deleting system tags
    }
    // Cascade delete: remove associations from transaction_tags
    await db.delete(transactionTags).where(eq(transactionTags.tagId, id));
    const result = await db.delete(tags).where(eq(tags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Transaction methods
  async getTransactions(userId: number, filters?: any): Promise<Transaction[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(transactions); // Will be reassigned if where is called
    const conditions: (SQL | undefined)[] = [];

    if (user?.householdId) {
      const householdUsers = await db.select({id: users.id}).from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      conditions.push(or(eq(transactions.userId, userId), and(eq(transactions.isShared, true), inArray(transactions.userId, householdUserIds))));
    } else {
      conditions.push(eq(transactions.userId, userId));
    }

    if (filters) {
      if (filters.startDate) conditions.push(gte(transactions.date, filters.startDate as string));
      if (filters.endDate) conditions.push(lte(transactions.date, filters.endDate as string));
      if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId as number));
      if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId as number));
      if (filters.search) conditions.push(like(transactions.description, `%${filters.search}%`));
      if (filters.isShared !== undefined) conditions.push(eq(transactions.isShared, filters.isShared as boolean));
      if (filters.transactionTypeId) conditions.push(eq(transactions.transactionTypeId, filters.transactionTypeId as number));
    }

    const finalConditions = conditions.filter((c): c is SQL => c !== undefined);
    if (finalConditions.length > 0) {
      // Reassign query if where clause is added
      query = query.where(and(...finalConditions));
    }

    const result = await query.orderBy(desc(transactions.date)).execute();
    return result as Transaction[];
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0] as Transaction | undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const valuesToInsert = {
        ...transaction,
        date: transaction.date, // Drizzle handles Date object for 'date' SQL type
        amount: transaction.amount.toString(), // Numeric handled as string
        // DB defaults for currency, isReconciled, etc., if not in transaction object
    };
    const result = await db.insert(transactions).values(valuesToInsert).returning();
    return result[0] as Transaction;
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const dataToUpdate = { ...transactionData } as any; // Use any for partial update flexibility
    if (typeof transactionData.amount !== 'undefined') {
        dataToUpdate.amount = transactionData.amount.toString();
    }
    // Drizzle handles Date objects if transactionData.date is a Date object
    const result = await db.update(transactions).set(dataToUpdate).where(eq(transactions.id, id)).returning();
    return result[0] as Transaction | undefined;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    // Cascade delete related entities first
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
    await db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id));
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // TransactionTag methods
  async addTagToTransaction(transactionTag: InsertTransactionTag): Promise<TransactionTag> {
    const result = await db.insert(transactionTags).values(transactionTag).returning();
    return result[0] as TransactionTag;
  }

  async removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean> {
    const result = await db.delete(transactionTags)
      .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId)));
    return (result.rowCount ?? 0) > 0;
  }

  // TransactionSplit methods
  async getSplitsByTransaction(transactionId: number): Promise<TransactionSplit[]> {
    return db.select().from(transactionSplits)
      .where(eq(transactionSplits.transactionId, transactionId)) as Promise<TransactionSplit[]>;
  }

  async createTransactionSplit(split: InsertTransactionSplit): Promise<TransactionSplit> {
    const valuesToInsert = { ...split, amount: split.amount.toString() };
    const result = await db.insert(transactionSplits).values(valuesToInsert).returning();
    return result[0] as TransactionSplit;
  }

  async deleteTransactionSplit(id: number): Promise<boolean> {
    const result = await db.delete(transactionSplits).where(eq(transactionSplits.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // RecurringTransaction methods
  async getRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
    // Obtener primero el usuario para verificar su householdId
    const user = await this.getUser(userId);
    
    let query = db.select().from(recurringTransactions);
    const conditions: (SQL | undefined)[] = [];

    if (user?.householdId) {
      const householdUsers = await db.select({id: users.id}).from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      conditions.push(or(eq(recurringTransactions.userId, userId), and(eq(recurringTransactions.isShared, true), inArray(recurringTransactions.userId, householdUserIds))));
    } else {
      conditions.push(eq(recurringTransactions.userId, userId));
    }
    
    const finalConditions = conditions.filter((c): c is SQL => c !== undefined);
    if (finalConditions.length > 0) {
      query = query.where(and(...finalConditions));
    }
    const result = await query.orderBy(desc(recurringTransactions.nextDueDate)).execute();
    return result as RecurringTransaction[];
  }

  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    const result = await db.select().from(recurringTransactions).where(eq(recurringTransactions.id, id));
    return result[0] as RecurringTransaction | undefined;
  }

  async createRecurringTransaction(rt: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const valuesToInsert = { ...rt, amount: rt.amount.toString() }; // isActive defaults in DB if schema allows
    const result = await db.insert(recurringTransactions).values(valuesToInsert).returning();
    return result[0] as RecurringTransaction;
  }

  async updateRecurringTransaction(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const dataToUpdate = { ...data } as any;
    if (typeof data.amount !== 'undefined') dataToUpdate.amount = data.amount.toString();
    const result = await db.update(recurringTransactions).set(dataToUpdate).where(eq(recurringTransactions.id, id)).returning();
    return result[0] as RecurringTransaction | undefined;
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    const result = await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    const user = await this.getUser(userId);
    let query = db.select().from(budgets);
    const conditions: (SQL | undefined)[] = [];

    if (user?.householdId) {
      const householdUsers = await db.select({id: users.id}).from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      conditions.push(or(eq(budgets.userId, userId), and(eq(budgets.isShared, true), inArray(budgets.userId, householdUserIds))));
    } else {
      conditions.push(eq(budgets.userId, userId));
    }
    
    const finalConditions = conditions.filter((c): c is SQL => c !== undefined);
    if (finalConditions.length > 0) {
      query = query.where(and(...finalConditions));
    }
    const result = await query.orderBy(desc(budgets.createdAt)).execute();
    return result as Budget[];
  }

  async getBudget(id: number): Promise<Budget | undefined> {
    const result = await db.select().from(budgets).where(eq(budgets.id, id));
    return result[0] as Budget | undefined;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const valuesToInsert = { ...budget, amount: budget.amount.toString() }; // DB defaults for currency, period etc.
    const result = await db.insert(budgets).values(valuesToInsert).returning();
    return result[0] as Budget;
  }

  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const dataToUpdate = { ...budgetData } as any;
    if (typeof budgetData.amount !== 'undefined') dataToUpdate.amount = budgetData.amount.toString();
    const result = await db.update(budgets).set(dataToUpdate).where(eq(budgets.id, id)).returning();
    return result[0] as Budget | undefined;
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // SavingsGoal methods
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    const user = await this.getUser(userId);
    let query = db.select().from(savingsGoals);
    const conditions: (SQL | undefined)[] = [];

    if (user?.householdId) {
      const householdUsers = await db.select({id: users.id}).from(users).where(eq(users.householdId, user.householdId));
      const householdUserIds = householdUsers.map(u => u.id);
      conditions.push(or(eq(savingsGoals.userId, userId), and(eq(savingsGoals.isShared, true), inArray(savingsGoals.userId, householdUserIds))));
    } else {
      conditions.push(eq(savingsGoals.userId, userId));
    }
    
    const finalConditions = conditions.filter((c): c is SQL => c !== undefined);
    if (finalConditions.length > 0) {
      query = query.where(and(...finalConditions));
    }
    const result = await query.orderBy(desc(savingsGoals.createdAt)).execute();
    return result as SavingsGoal[];
  }

  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    const result = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
    return result[0] as SavingsGoal | undefined;
  }

  async createSavingsGoal(sg: InsertSavingsGoal): Promise<SavingsGoal> {
    const valuesToInsert = { ...sg, targetAmount: sg.targetAmount.toString(), currentAmount: (sg.currentAmount ?? "0").toString() };
    const result = await db.insert(savingsGoals).values(valuesToInsert).returning();
    return result[0] as SavingsGoal;
  }

  async updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const dataToUpdate = { ...data } as any;
    if (typeof data.targetAmount !== 'undefined') dataToUpdate.targetAmount = data.targetAmount.toString();
    if (typeof data.currentAmount !== 'undefined') dataToUpdate.currentAmount = data.currentAmount.toString();
    const result = await db.update(savingsGoals).set(dataToUpdate).where(eq(savingsGoals.id, id)).returning();
    return result[0] as SavingsGoal | undefined;
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    // Cascade delete related contributions
    await db.delete(savingsContributions).where(eq(savingsContributions.savingsGoalId, id));
    const result = await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // SavingsContribution methods
  async getContributionsBySavingsGoal(savingsGoalId: number): Promise<SavingsContribution[]> {
    return db.select().from(savingsContributions)
      .where(eq(savingsContributions.savingsGoalId, savingsGoalId)).orderBy(desc(savingsContributions.date)) as Promise<SavingsContribution[]>;
  }

  async createSavingsContribution(sc: InsertSavingsContribution): Promise<SavingsContribution> {
    const valuesToInsert = { ...sc, amount: sc.amount.toString() };
    const result = await db.insert(savingsContributions).values(valuesToInsert).returning();
    const newContribution = result[0] as SavingsContribution;

    if (newContribution) {
        const goal = await this.getSavingsGoal(newContribution.savingsGoalId);
        if (goal) {
            const currentAmountNum = parseFloat(goal.currentAmount ?? "0");
            const contributionAmountNum = parseFloat(newContribution.amount);
            await this.updateSavingsGoal(goal.id, { currentAmount: (currentAmountNum + contributionAmountNum).toString() });
        }
    }
    return newContribution;
  }

  async deleteSavingsContribution(id: number): Promise<boolean> {
    const contribToDelete = await db.select().from(savingsContributions).where(eq(savingsContributions.id, id)).then(r => r[0]);
    if (!contribToDelete) return false;

    const result = await db.delete(savingsContributions).where(eq(savingsContributions.id, id));
    if ((result.rowCount ?? 0) > 0) {
        const goal = await this.getSavingsGoal(contribToDelete.savingsGoalId);
        if (goal) {
            const currentAmountNum = parseFloat(goal.currentAmount ?? "0");
            const deletedAmountNum = parseFloat(contribToDelete.amount);
            await this.updateSavingsGoal(goal.id, { currentAmount: Math.max(0, currentAmountNum - deletedAmountNum).toString() });
        }
    }
    return (result.rowCount ?? 0) > 0;
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    const result = await db.select().from(settings).where(eq(settings.userId, userId));
    return result[0] as Settings | undefined;
  }

  async createSettings(setting: InsertSettings): Promise<Settings> {
    const valuesToInsert = {
        ...setting,
        exchangeRate: (setting.exchangeRate ?? "40.0").toString(), // Ensure string
        lastExchangeRateUpdate: setting.lastExchangeRateUpdate ? new Date(setting.lastExchangeRateUpdate) : null
    };
    const result = await db.insert(settings).values(valuesToInsert).returning();
    return result[0] as Settings;
  }

  async updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined> {
    const dataToUpdate = { ...data } as any;
    if (typeof data.exchangeRate !== 'undefined') {
        dataToUpdate.exchangeRate = data.exchangeRate.toString();
    }
    if (data.lastExchangeRateUpdate && typeof data.lastExchangeRateUpdate === 'string') {
      dataToUpdate.lastExchangeRateUpdate = new Date(data.lastExchangeRateUpdate);
    } // null is also a valid value for lastExchangeRateUpdate, Date object is also fine

    const result = await db.update(settings).set(dataToUpdate).where(eq(settings.userId, userId)).returning();
    return result[0] as Settings | undefined;
  }

  // Transaction types
  async getTransactionTypes(): Promise<typeof transactionTypes.$inferSelect[]> {
    return db.select().from(transactionTypes);
  }

  // Account types
  async getAccountTypes(): Promise<typeof accountTypes.$inferSelect[]> {
    return db.select().from(accountTypes);
  }
  
  // Balance transfers
  async getBalanceTransfers(userId: number): Promise<BalanceTransfer[]> {
    return db.select().from(balanceTransfers)
      .where(eq(balanceTransfers.userId, userId)).orderBy(desc(balanceTransfers.date)) as Promise<BalanceTransfer[]>;
  }
  
  async createBalanceTransfer(transfer: InsertBalanceTransfer): Promise<BalanceTransfer> {
    const valuesToInsert = { ...transfer, amount: transfer.amount.toString() };
    const result = await db.insert(balanceTransfers).values(valuesToInsert).returning();
    const createdTransfer = result[0] as BalanceTransfer;

    if (createdTransfer) {
        const userToUpdate = await this.getUser(createdTransfer.userId);
        if (userToUpdate) {
            let personalBal = parseFloat(userToUpdate.personalBalance ?? "0");
            let familyBal = parseFloat(userToUpdate.familyBalance ?? "0");
            const transferAmountNum = parseFloat(createdTransfer.amount);

            if (createdTransfer.fromPersonal) {
                personalBal -= transferAmountNum;
                familyBal += transferAmountNum;
            } else {
                personalBal += transferAmountNum;
                familyBal -= transferAmountNum;
            }
            await this.updateUser(userToUpdate.id, {
                personalBalance: personalBal.toString(),
                familyBalance: familyBal.toString()
            });
        }
    }
    return createdTransfer;
  }
  
  async updateUserBalance(userId: number, personalAmount: number, familyAmount: number): Promise<User | undefined> {
    // This method SETS the balance to the provided amounts.
    const result = await db.update(users)
      .set({ personalBalance: personalAmount.toString(), familyBalance: familyAmount.toString() })
      .where(eq(users.id, userId))
      .returning();
    return result[0] as User | undefined;
  }
}