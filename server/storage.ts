import { users, accounts, categories, tags, transactions, transactionTags, transactionSplits, recurringTransactions, budgets, savingsGoals, savingsContributions, settings, transactionTypes, accountTypes } from "@shared/schema";
import type { User, InsertUser, Account, InsertAccount, Category, InsertCategory, Tag, InsertTag, Transaction, InsertTransaction, TransactionTag, InsertTransactionTag, TransactionSplit, InsertTransactionSplit, RecurringTransaction, InsertRecurringTransaction, Budget, InsertBudget, SavingsGoal, InsertSavingsGoal, SavingsContribution, InsertSavingsContribution, Settings, InsertSettings } from "@shared/schema";
import { eq, and, gte, lte, like, isNull, desc, asc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Account methods
  getAccounts(userId: number): Promise<Account[]>;
  getAccountsByUser(userId: number, includeShared: boolean): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Tag methods
  getTags(userId?: number): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<boolean>;
  
  // Transaction methods
  getTransactions(userId: number, filters?: any): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // TransactionTag methods
  addTagToTransaction(transactionTag: InsertTransactionTag): Promise<TransactionTag>;
  removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean>;
  
  // TransactionSplit methods
  getSplitsByTransaction(transactionId: number): Promise<TransactionSplit[]>;
  createTransactionSplit(split: InsertTransactionSplit): Promise<TransactionSplit>;
  deleteTransactionSplit(id: number): Promise<boolean>;
  
  // RecurringTransaction methods
  getRecurringTransactions(userId: number): Promise<RecurringTransaction[]>;
  getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined>;
  createRecurringTransaction(recurringTransaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction | undefined>;
  deleteRecurringTransaction(id: number): Promise<boolean>;
  
  // Budget methods
  getBudgets(userId: number): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // SavingsGoal methods
  getSavingsGoals(userId: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(savingsGoal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;
  
  // SavingsContribution methods
  getContributionsBySavingsGoal(savingsGoalId: number): Promise<SavingsContribution[]>;
  createSavingsContribution(contribution: InsertSavingsContribution): Promise<SavingsContribution>;
  deleteSavingsContribution(id: number): Promise<boolean>;
  
  // Settings methods
  getSettings(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined>;
  
  // Transaction types
  getTransactionTypes(): Promise<typeof transactionTypes.$inferSelect[]>;
  
  // Account types
  getAccountTypes(): Promise<typeof accountTypes.$inferSelect[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private accounts: Map<number, Account>;
  private categories: Map<number, Category>;
  private tags: Map<number, Tag>;
  private transactions: Map<number, Transaction>;
  private transactionTags: Map<number, TransactionTag>;
  private transactionSplits: Map<number, TransactionSplit>;
  private recurringTransactions: Map<number, RecurringTransaction>;
  private budgets: Map<number, Budget>;
  private savingsGoals: Map<number, SavingsGoal>;
  private savingsContributions: Map<number, SavingsContribution>;
  private userSettings: Map<number, Settings>;
  private txTypes: Map<number, typeof transactionTypes.$inferSelect>;
  private acctTypes: Map<number, typeof accountTypes.$inferSelect>;
  
  sessionStore: session.SessionStore;
  currentId: {
    users: number;
    accounts: number;
    categories: number;
    tags: number;
    transactions: number;
    transactionTags: number;
    transactionSplits: number;
    recurringTransactions: number;
    budgets: number;
    savingsGoals: number;
    savingsContributions: number;
    settings: number;
    txTypes: number;
    acctTypes: number;
  };

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.transactions = new Map();
    this.transactionTags = new Map();
    this.transactionSplits = new Map();
    this.recurringTransactions = new Map();
    this.budgets = new Map();
    this.savingsGoals = new Map();
    this.savingsContributions = new Map();
    this.userSettings = new Map();
    this.txTypes = new Map();
    this.acctTypes = new Map();
    
    this.currentId = {
      users: 1,
      accounts: 1,
      categories: 1,
      tags: 1,
      transactions: 1,
      transactionTags: 1,
      transactionSplits: 1,
      recurringTransactions: 1,
      budgets: 1,
      savingsGoals: 1,
      savingsContributions: 1,
      settings: 1,
      txTypes: 1,
      acctTypes: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Seed transaction types
    this.txTypes.set(1, { id: 1, name: "Ingreso" });
    this.txTypes.set(2, { id: 2, name: "Gasto" });
    this.txTypes.set(3, { id: 3, name: "Transferencia" });
    this.currentId.txTypes = 4;
    
    // Seed account types
    this.acctTypes.set(1, { id: 1, name: "Efectivo" });
    this.acctTypes.set(2, { id: 2, name: "Cuenta Corriente" });
    this.acctTypes.set(3, { id: 3, name: "Cuenta de Ahorro" });
    this.acctTypes.set(4, { id: 4, name: "Tarjeta de Crédito" });
    this.acctTypes.set(5, { id: 5, name: "Préstamo" });
    this.acctTypes.set(6, { id: 6, name: "Inversión" });
    this.currentId.acctTypes = 7;
    
    // Seed some default categories
    this.categories.set(1, { id: 1, name: "Ingresos", icon: "Banknote", color: "#22c55e", isIncome: true, isSystem: true, parentId: null });
    this.categories.set(2, { id: 2, name: "Salario", icon: "Briefcase", color: "#22c55e", isIncome: true, isSystem: true, parentId: 1 });
    this.categories.set(3, { id: 3, name: "Intereses", icon: "DollarSign", color: "#22c55e", isIncome: true, isSystem: true, parentId: 1 });
    this.categories.set(4, { id: 4, name: "Gastos", icon: "Receipt", color: "#ef4444", isIncome: false, isSystem: true, parentId: null });
    this.categories.set(5, { id: 5, name: "Alimentación", icon: "UtensilsCrossed", color: "#ef4444", isIncome: false, isSystem: true, parentId: 4 });
    this.categories.set(6, { id: 6, name: "Vivienda", icon: "Home", color: "#3b82f6", isIncome: false, isSystem: true, parentId: 4 });
    this.categories.set(7, { id: 7, name: "Transporte", icon: "Car", color: "#f59e0b", isIncome: false, isSystem: true, parentId: 4 });
    this.categories.set(8, { id: 8, name: "Servicios", icon: "Lightbulb", color: "#8b5cf6", isIncome: false, isSystem: true, parentId: 4 });
    this.categories.set(9, { id: 9, name: "Entretenimiento", icon: "Film", color: "#ec4899", isIncome: false, isSystem: true, parentId: 4 });
    this.categories.set(10, { id: 10, name: "Salud", icon: "HeartPulse", color: "#06b6d4", isIncome: false, isSystem: true, parentId: 4 });
    this.currentId.categories = 11;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Account methods
  async getAccounts(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.userId === userId
    );
  }
  
  async getAccountsByUser(userId: number, includeShared: boolean): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.userId === userId || (includeShared && account.isShared)
    );
  }
  
  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }
  
  async createAccount(account: InsertAccount): Promise<Account> {
    const id = this.currentId.accounts++;
    const now = new Date();
    const newAccount: Account = { ...account, id, isActive: true, createdAt: now };
    this.accounts.set(id, newAccount);
    return newAccount;
  }
  
  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...accountData };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteAccount(id: number): Promise<boolean> {
    return this.accounts.delete(id);
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentId.categories++;
    const newCategory: Category = { ...category, id, isSystem: false };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }
  
  // Tag methods
  async getTags(userId?: number): Promise<Tag[]> {
    const allTags = Array.from(this.tags.values());
    if (userId === undefined) return allTags;
    
    return allTags.filter(tag => tag.userId === userId || tag.isSystem);
  }
  
  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }
  
  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.currentId.tags++;
    const newTag: Tag = { ...tag, id, isSystem: false };
    this.tags.set(id, newTag);
    return newTag;
  }
  
  async deleteTag(id: number): Promise<boolean> {
    return this.tags.delete(id);
  }
  
  // Transaction methods
  async getTransactions(userId: number, filters?: any): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId || transaction.isShared
    );
    
    if (filters) {
      // Apply filters
      if (filters.startDate) {
        transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.endDate));
      }
      
      if (filters.categoryId) {
        transactions = transactions.filter(t => t.categoryId === filters.categoryId);
      }
      
      if (filters.accountId) {
        transactions = transactions.filter(t => t.accountId === filters.accountId);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        transactions = transactions.filter(t => 
          t.description.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.isShared !== undefined) {
        transactions = transactions.filter(t => t.isShared === filters.isShared);
      }
      
      if (filters.transactionTypeId) {
        transactions = transactions.filter(t => t.transactionTypeId === filters.transactionTypeId);
      }
    }
    
    // Sort by date desc by default
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId.transactions++;
    const now = new Date();
    const newTransaction: Transaction = { ...transaction, id, createdAt: now };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  // TransactionTag methods
  async addTagToTransaction(transactionTag: InsertTransactionTag): Promise<TransactionTag> {
    const id = this.currentId.transactionTags++;
    const newTransactionTag: TransactionTag = { ...transactionTag, id };
    this.transactionTags.set(id, newTransactionTag);
    return newTransactionTag;
  }
  
  async removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean> {
    const entries = Array.from(this.transactionTags.entries());
    for (const [key, value] of entries) {
      if (value.transactionId === transactionId && value.tagId === tagId) {
        return this.transactionTags.delete(key);
      }
    }
    return false;
  }
  
  // TransactionSplit methods
  async getSplitsByTransaction(transactionId: number): Promise<TransactionSplit[]> {
    return Array.from(this.transactionSplits.values()).filter(
      (split) => split.transactionId === transactionId
    );
  }
  
  async createTransactionSplit(split: InsertTransactionSplit): Promise<TransactionSplit> {
    const id = this.currentId.transactionSplits++;
    const newSplit: TransactionSplit = { ...split, id };
    this.transactionSplits.set(id, newSplit);
    return newSplit;
  }
  
  async deleteTransactionSplit(id: number): Promise<boolean> {
    return this.transactionSplits.delete(id);
  }
  
  // RecurringTransaction methods
  async getRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
    return Array.from(this.recurringTransactions.values()).filter(
      (rt) => rt.userId === userId || rt.isShared
    );
  }
  
  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    return this.recurringTransactions.get(id);
  }
  
  async createRecurringTransaction(recurringTransaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const id = this.currentId.recurringTransactions++;
    const newRecurringTransaction: RecurringTransaction = { 
      ...recurringTransaction, 
      id,
      isActive: true
    };
    this.recurringTransactions.set(id, newRecurringTransaction);
    return newRecurringTransaction;
  }
  
  async updateRecurringTransaction(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const recurringTransaction = this.recurringTransactions.get(id);
    if (!recurringTransaction) return undefined;
    
    const updated = { ...recurringTransaction, ...data };
    this.recurringTransactions.set(id, updated);
    return updated;
  }
  
  async deleteRecurringTransaction(id: number): Promise<boolean> {
    return this.recurringTransactions.delete(id);
  }
  
  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId || budget.isShared
    );
  }
  
  async getBudget(id: number): Promise<Budget | undefined> {
    return this.budgets.get(id);
  }
  
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = this.currentId.budgets++;
    const now = new Date();
    const newBudget: Budget = { ...budget, id, createdAt: now };
    this.budgets.set(id, newBudget);
    return newBudget;
  }
  
  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, ...budgetData };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }
  
  // SavingsGoal methods
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return Array.from(this.savingsGoals.values()).filter(
      (goal) => goal.userId === userId || goal.isShared
    );
  }
  
  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    return this.savingsGoals.get(id);
  }
  
  async createSavingsGoal(savingsGoal: InsertSavingsGoal): Promise<SavingsGoal> {
    const id = this.currentId.savingsGoals++;
    const now = new Date();
    const newSavingsGoal: SavingsGoal = { ...savingsGoal, id, createdAt: now };
    this.savingsGoals.set(id, newSavingsGoal);
    return newSavingsGoal;
  }
  
  async updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const savingsGoal = this.savingsGoals.get(id);
    if (!savingsGoal) return undefined;
    
    const updatedGoal = { ...savingsGoal, ...data };
    this.savingsGoals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  async deleteSavingsGoal(id: number): Promise<boolean> {
    return this.savingsGoals.delete(id);
  }
  
  // SavingsContribution methods
  async getContributionsBySavingsGoal(savingsGoalId: number): Promise<SavingsContribution[]> {
    return Array.from(this.savingsContributions.values()).filter(
      (contribution) => contribution.savingsGoalId === savingsGoalId
    );
  }
  
  async createSavingsContribution(contribution: InsertSavingsContribution): Promise<SavingsContribution> {
    const id = this.currentId.savingsContributions++;
    const newContribution: SavingsContribution = { ...contribution, id };
    this.savingsContributions.set(id, newContribution);
    
    // Update SavingsGoal currentAmount
    const savingsGoal = this.savingsGoals.get(contribution.savingsGoalId);
    if (savingsGoal) {
      const currentAmount = parseFloat(savingsGoal.currentAmount.toString()) + parseFloat(contribution.amount.toString());
      this.savingsGoals.set(contribution.savingsGoalId, {
        ...savingsGoal,
        currentAmount: currentAmount.toString()
      });
    }
    
    return newContribution;
  }
  
  async deleteSavingsContribution(id: number): Promise<boolean> {
    const contribution = this.savingsContributions.get(id);
    if (!contribution) return false;
    
    // Update SavingsGoal currentAmount
    const savingsGoal = this.savingsGoals.get(contribution.savingsGoalId);
    if (savingsGoal) {
      const currentAmount = parseFloat(savingsGoal.currentAmount.toString()) - parseFloat(contribution.amount.toString());
      this.savingsGoals.set(contribution.savingsGoalId, {
        ...savingsGoal,
        currentAmount: Math.max(0, currentAmount).toString() // Don't go below 0
      });
    }
    
    return this.savingsContributions.delete(id);
  }
  
  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    return this.userSettings.get(userId);
  }
  
  async createSettings(settings: InsertSettings): Promise<Settings> {
    const id = this.currentId.settings++;
    const newSettings: Settings = { ...settings, id, lastExchangeRateUpdate: null };
    this.userSettings.set(settings.userId, newSettings);
    return newSettings;
  }
  
  async updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined> {
    const settings = this.userSettings.get(userId);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...data };
    this.userSettings.set(userId, updatedSettings);
    return updatedSettings;
  }
  
  // Transaction types
  async getTransactionTypes(): Promise<typeof transactionTypes.$inferSelect[]> {
    return Array.from(this.txTypes.values());
  }
  
  // Account types
  async getAccountTypes(): Promise<typeof accountTypes.$inferSelect[]> {
    return Array.from(this.acctTypes.values());
  }
}

export const storage = new MemStorage();
