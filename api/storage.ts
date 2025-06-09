import { users, accounts, categories, tags, transactions, transactionTags, transactionSplits, recurringTransactions, budgets, savingsGoals, savingsContributions, settings, transactionTypes, accountTypes, familyMembers, balanceTransfers } from "shared/schema";
import type { User, InsertUser, Account, InsertAccount, Category, InsertCategory, Tag, InsertTag, Transaction, InsertTransaction, TransactionTag, InsertTransactionTag, TransactionSplit, InsertTransactionSplit, RecurringTransaction, InsertRecurringTransaction, Budget, InsertBudget, SavingsGoal, InsertSavingsGoal, SavingsContribution, InsertSavingsContribution, Settings, InsertSettings, FamilyMember, InsertFamilyMember, BalanceTransfer, InsertBalanceTransfer } from "shared/schema";
import type { SessionData, Store as ExpressStore } from "express-session";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStoreFactory from 'memorystore';

const PgStore = connectPgSimple(session);
const MemoryStore = MemoryStoreFactory(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Family members methods
  getFamilyMembers(userId: number): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, memberData: Partial<FamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: number): Promise<boolean>;
  
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
  
  // Balance transfers
  getBalanceTransfers(userId: number): Promise<BalanceTransfer[]>;
  createBalanceTransfer(transfer: InsertBalanceTransfer): Promise<BalanceTransfer>;
  
  // Update user balance
  updateUserBalance(userId: number, personalAmount: number, familyAmount: number): Promise<User | undefined>;
  
  // Session store
  sessionStore: ExpressStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private familyMembers: Map<number, FamilyMember>;
  private accounts: Map<number, Account>;
  private categories: Map<number, Category>;
  private tags: Map<number, Tag>;
  private transactions: Map<number, Transaction>;
  private transactionTags: Map<number, TransactionTag>; // Use auto-incrementing ID as key
  private transactionSplits: Map<number, TransactionSplit>;
  private recurringTransactions: Map<number, RecurringTransaction>;
  private budgets: Map<number, Budget>;
  private savingsGoals: Map<number, SavingsGoal>;
  private savingsContributions: Map<number, SavingsContribution>;
  private userSettings: Map<number, Settings>; // Keyed by userId for uniqueness, but Settings has its own id
  private balanceTransfers: Map<number, BalanceTransfer>;
  private txTypes: Map<number, typeof transactionTypes.$inferSelect>;
  private acctTypes: Map<number, typeof accountTypes.$inferSelect>;
  
  sessionStore: ExpressStore;

  currentId: {
    users: number;
    familyMembers: number;
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
    balanceTransfers: number;
    txTypes: number;
    acctTypes: number;
  };

  constructor() {
    this.users = new Map();
    this.familyMembers = new Map();
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
    this.balanceTransfers = new Map();
    this.txTypes = new Map();
    this.acctTypes = new Map();
    
    this.currentId = {
      users: 1,
      familyMembers: 1,
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
      balanceTransfers: 1,
      txTypes: 1, // Start from 1 for manual seeding
      acctTypes: 1 // Start from 1 for manual seeding
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Seed transaction types
    this.txTypes.set(this.currentId.txTypes++, { id: 1, name: "Ingreso" });
    this.txTypes.set(this.currentId.txTypes++, { id: 2, name: "Gasto" });
    this.txTypes.set(this.currentId.txTypes++, { id: 3, name: "Transferencia" });
    
    // Seed account types
    this.acctTypes.set(this.currentId.acctTypes++, { id: 1, name: "Efectivo" });
    this.acctTypes.set(this.currentId.acctTypes++, { id: 2, name: "Cuenta Corriente" });
    this.acctTypes.set(this.currentId.acctTypes++, { id: 3, name: "Cuenta de Ahorro" });
    this.acctTypes.set(this.currentId.acctTypes++, { id: 4, name: "Tarjeta de Crédito" });
    this.acctTypes.set(this.currentId.acctTypes++, { id: 5, name: "Préstamo" });
    this.acctTypes.set(this.currentId.acctTypes++, { id: 6, name: "Inversión" });
    
    // Seed some default categories
    const catId1 = this.currentId.categories++;
    this.categories.set(catId1, { id: catId1, name: "Ingresos", icon: "Banknote", color: "#22c55e", isIncome: true, isSystem: true, parentId: null });
    const catId2 = this.currentId.categories++;
    this.categories.set(catId2, { id: catId2, name: "Salario", icon: "Briefcase", color: "#22c55e", isIncome: true, isSystem: true, parentId: catId1 });
    const catId3 = this.currentId.categories++;
    this.categories.set(catId3, { id: catId3, name: "Intereses", icon: "DollarSign", color: "#22c55e", isIncome: true, isSystem: true, parentId: catId1 });
    const catId4 = this.currentId.categories++;
    this.categories.set(catId4, { id: catId4, name: "Gastos", icon: "Receipt", color: "#ef4444", isIncome: false, isSystem: true, parentId: null });
    const catId5 = this.currentId.categories++;
    this.categories.set(catId5, { id: catId5, name: "Alimentación", icon: "UtensilsCrossed", color: "#ef4444", isIncome: false, isSystem: true, parentId: catId4 });
    const catId6 = this.currentId.categories++;
    this.categories.set(catId6, { id: catId6, name: "Vivienda", icon: "Home", color: "#3b82f6", isIncome: false, isSystem: true, parentId: catId4 });
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password, // In a real app, hash this password
      name: insertUser.name,
      avatar: insertUser.avatar || null,
      avatarColor: insertUser.avatarColor || "#6366f1",
      incomeColor: insertUser.incomeColor || "#10b981",
      expenseColor: insertUser.expenseColor || "#ef4444",
      isAdmin: insertUser.isAdmin || false,
      householdId: insertUser.householdId || null,
      personalBalance: "0",
      familyBalance: "0",
      createdAt: now,
    };
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
  
  // Family Members methods
  async getFamilyMembers(userId: number): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values()).filter(
      (member) => member.userId === userId
    );
  }
  
  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }
  
  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const id = this.currentId.familyMembers++;
    const now = new Date();
    const newMember: FamilyMember = {
      id,
      userId: member.userId,
      name: member.name,
      email: member.email || null,
      relationship: member.relationship,
      isActive: member.isActive !== undefined ? member.isActive : true,
      canAccess: member.canAccess !== undefined ? member.canAccess : false,
      avatarUrl: member.avatarUrl || null,
      createdAt: now,
    };
    this.familyMembers.set(id, newMember);
    return newMember;
  }
  
  async updateFamilyMember(id: number, memberData: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const member = this.familyMembers.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, ...memberData };
    this.familyMembers.set(id, updatedMember);
    return updatedMember;
  }
  
  async deleteFamilyMember(id: number): Promise<boolean> {
    return this.familyMembers.delete(id);
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
    const newAccount: Account = {
      id,
      userId: account.userId,
      name: account.name,
      accountTypeId: account.accountTypeId,
      initialBalance: account.initialBalance || "0",
      currentBalance: account.currentBalance || account.initialBalance || "0",
      currency: account.currency || "UYU",
      isShared: account.isShared || false,
      institution: account.institution || null,
      accountNumber: account.accountNumber || null,
      closingDay: account.closingDay || null,
      dueDay: account.dueDay || null,
      isActive: true, // Default from schema is true
      createdAt: now,
    };
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
    const newCategory: Category = {
      id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isIncome: category.isIncome || false,
      isSystem: false, // User-created categories are not system categories
      parentId: category.parentId || null,
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    if (category.isSystem && categoryData.isSystem === false) {
        // Prevent changing isSystem for system categories
        delete categoryData.isSystem;
    }
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    const category = this.categories.get(id);
    if (category && category.isSystem) {
      return false; // Prevent deleting system categories
    }
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
    const newTag: Tag = {
      id,
      name: tag.name,
      userId: tag.userId || null,
      isSystem: false, // User-created tags are not system tags
    };
    this.tags.set(id, newTag);
    return newTag;
  }
  
  async deleteTag(id: number): Promise<boolean> {
    const tag = this.tags.get(id);
    if (tag && tag.isSystem) {
        return false;
    }
    this.transactionTags.forEach((tt, key) => {
      if (tt.tagId === id) {
        this.transactionTags.delete(key);
      }
    });
    return this.tags.delete(id);
  }
  
  // Transaction methods
  async getTransactions(userId: number, filters?: any): Promise<Transaction[]> {
    let userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId || transaction.isShared
    );
    // Apply filters (omitted for brevity, same as original)
    return userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId.transactions++;
    const now = new Date();
    const newTransaction: Transaction = {
      id,
      userId: transaction.userId,
      accountId: transaction.accountId === undefined ? null : transaction.accountId,
      categoryId: transaction.categoryId,
      transactionTypeId: transaction.transactionTypeId,
      amount: typeof transaction.amount === 'number' ? transaction.amount.toString() : transaction.amount,
      currency: transaction.currency || "UYU",
      description: transaction.description,
      date: typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date,
      time: transaction.time || null,
      isShared: transaction.isShared || false,
      isReconciled: transaction.isReconciled || false,
      isReimbursable: transaction.isReimbursable || false,
      isReimbursed: transaction.isReimbursed || false,
      notes: transaction.notes || null,
      receiptUrl: transaction.receiptUrl || null,
      createdAt: now,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    const updatedTransaction = { ...transaction, ...transactionData };
    if (transactionData.date && typeof transactionData.date === 'string') {
        updatedTransaction.date = new Date(transactionData.date);
    }
    if (transactionData.amount && typeof transactionData.amount === 'number') {
        updatedTransaction.amount = transactionData.amount.toString();
    }
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    this.transactionTags.forEach((tt, key) => {
      if (tt.transactionId === id) {
        this.transactionTags.delete(key);
      }
    });
    this.transactionSplits.forEach((split, key) => {
      if (split.transactionId === id) {
        this.transactionSplits.delete(key);
      }
    });
    return this.transactions.delete(id);
  }
  
  // TransactionTag methods
  async addTagToTransaction(transactionTag: InsertTransactionTag): Promise<TransactionTag> {
    const id = this.currentId.transactionTags++;
    const newTransactionTag: TransactionTag = { id, ...transactionTag };
    this.transactionTags.set(id, newTransactionTag);
    return newTransactionTag;
  }
  
  async removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean> {
    let deleted = false;
    this.transactionTags.forEach((value, key) => {
      if (value.transactionId === transactionId && value.tagId === tagId) {
        this.transactionTags.delete(key);
        deleted = true;
      }
    });
    return deleted;
  }
  
  // TransactionSplit methods
  async getSplitsByTransaction(transactionId: number): Promise<TransactionSplit[]> {
    return Array.from(this.transactionSplits.values()).filter(
      (split) => split.transactionId === transactionId
    );
  }
  
  async createTransactionSplit(split: InsertTransactionSplit): Promise<TransactionSplit> {
    const id = this.currentId.transactionSplits++;
    const newSplit: TransactionSplit = {
        id,
        transactionId: split.transactionId,
        categoryId: split.categoryId,
        amount: typeof split.amount === 'number' ? split.amount.toString() : split.amount,
        description: split.description || null,
    };
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
  
  async createRecurringTransaction(rt: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const id = this.currentId.recurringTransactions++;
    const newRT: RecurringTransaction = {
      id,
      userId: rt.userId,
      accountId: rt.accountId,
      categoryId: rt.categoryId,
      transactionTypeId: rt.transactionTypeId,
      amount: typeof rt.amount === 'number' ? rt.amount.toString() : rt.amount,
      currency: rt.currency || "UYU",
      description: rt.description,
      frequency: rt.frequency,
      startDate: typeof rt.startDate === 'string' ? new Date(rt.startDate) : rt.startDate,
      endDate: rt.endDate ? (typeof rt.endDate === 'string' ? new Date(rt.endDate) : rt.endDate) : null,
      nextDueDate: typeof rt.nextDueDate === 'string' ? new Date(rt.nextDueDate) : rt.nextDueDate,
      isShared: rt.isShared || false,
      isActive: rt.isActive !== undefined ? rt.isActive : true,
      reminderDays: rt.reminderDays === undefined ? 1 : rt.reminderDays,
    };
    this.recurringTransactions.set(id, newRT);
    return newRT;
  }
  
  async updateRecurringTransaction(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const rt = this.recurringTransactions.get(id);
    if (!rt) return undefined;
    const updatedRT = { ...rt, ...data };
    // Date and amount conversions (omitted for brevity, same as original)
    this.recurringTransactions.set(id, updatedRT);
    return updatedRT;
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
    const newBudget: Budget = {
      id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      name: budget.name,
      amount: typeof budget.amount === 'number' ? budget.amount.toString() : budget.amount,
      currency: budget.currency || "UYU",
      period: budget.period || "monthly",
      isRollover: budget.isRollover || false,
      isShared: budget.isShared || false,
      startDate: typeof budget.startDate === 'string' ? new Date(budget.startDate) : budget.startDate,
      endDate: budget.endDate ? (typeof budget.endDate === 'string' ? new Date(budget.endDate) : budget.endDate) : null,
      paymentType: budget.paymentType || "one-time",
      paymentDay: budget.paymentDay || null,
      installments: budget.installments || null,
      status: budget.status || "pending",
      approvalCount: budget.approvalCount || 0,
      rejectionCount: budget.rejectionCount || 0,
      createdAt: now,
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }
  
  async updateBudget(id: number, budgetData: Partial<Budget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    const updatedBudget = { ...budget, ...budgetData };
    // Date and amount conversions (omitted for brevity, same as original)
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
  
  async createSavingsGoal(sg: InsertSavingsGoal): Promise<SavingsGoal> {
    const id = this.currentId.savingsGoals++;
    const now = new Date();
    const newSG: SavingsGoal = {
      id,
      userId: sg.userId,
      name: sg.name,
      targetAmount: typeof sg.targetAmount === 'number' ? sg.targetAmount.toString() : sg.targetAmount,
      currentAmount: (sg.currentAmount && typeof sg.currentAmount === 'number' ? sg.currentAmount.toString() : sg.currentAmount) || "0",
      currency: sg.currency || "UYU",
      deadline: sg.deadline ? (typeof sg.deadline === 'string' ? new Date(sg.deadline) : sg.deadline) : null,
      isShared: sg.isShared || false,
      accountId: sg.accountId === undefined ? null : sg.accountId,
      icon: sg.icon || null,
      createdAt: now,
    };
    this.savingsGoals.set(id, newSG);
    return newSG;
  }
  
  async updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const sg = this.savingsGoals.get(id);
    if (!sg) return undefined;
    const updatedSG = { ...sg, ...data };
    // Date and amount conversions (omitted for brevity, same as original)
    this.savingsGoals.set(id, updatedSG);
    return updatedSG;
  }
  
  async deleteSavingsGoal(id: number): Promise<boolean> {
    this.savingsContributions.forEach((sc, key) => {
      if (sc.savingsGoalId === id) {
        this.savingsContributions.delete(key);
      }
    });
    return this.savingsGoals.delete(id);
  }
  
  // SavingsContribution methods
  async getContributionsBySavingsGoal(savingsGoalId: number): Promise<SavingsContribution[]> {
    return Array.from(this.savingsContributions.values()).filter(
      (c) => c.savingsGoalId === savingsGoalId
    );
  }
  
  async createSavingsContribution(sc: InsertSavingsContribution): Promise<SavingsContribution> {
    const id = this.currentId.savingsContributions++;
    const newSC: SavingsContribution = {
      id,
      savingsGoalId: sc.savingsGoalId,
      userId: sc.userId,
      amount: typeof sc.amount === 'number' ? sc.amount.toString() : sc.amount,
      date: typeof sc.date === 'string' ? new Date(sc.date) : sc.date,
      transactionId: sc.transactionId === undefined ? null : sc.transactionId,
      notes: sc.notes || null,
    };
    this.savingsContributions.set(id, newSC);
    
    const savingsGoal = this.savingsGoals.get(sc.savingsGoalId);
    if (savingsGoal) {
      const currentAmount = parseFloat(savingsGoal.currentAmount) + parseFloat(newSC.amount);
      this.savingsGoals.set(sc.savingsGoalId, {
        ...savingsGoal,
        currentAmount: currentAmount.toString()
      });
    }
    return newSC;
  }
  
  async deleteSavingsContribution(id: number): Promise<boolean> {
    const sc = this.savingsContributions.get(id);
    if (!sc) return false;
    const savingsGoal = this.savingsGoals.get(sc.savingsGoalId);
    if (savingsGoal) {
      const currentAmount = parseFloat(savingsGoal.currentAmount) - parseFloat(sc.amount);
      this.savingsGoals.set(sc.savingsGoalId, {
        ...savingsGoal,
        currentAmount: Math.max(0, currentAmount).toString()
      });
    }
    return this.savingsContributions.delete(id);
  }
  
  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    // In MemStorage, settings are keyed by userId in userSettings map for direct access
    // but the actual Settings object has its own 'id' field.
    // This implementation retrieves based on userId, which is typical.
    return Array.from(this.userSettings.values()).find(s => s.userId === userId);
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const existingSettings = await this.getSettings(settingsData.userId);
    if (existingSettings) {
      // Optionally, update existing settings or throw error
      // For now, let's update, which is more like an upsert for MemStorage
      return this.updateSettings(settingsData.userId, settingsData) as Promise<Settings>;
    }

    const id = this.currentId.settings++;
    const newSettings: Settings = {
      id,
      userId: settingsData.userId,
      defaultCurrency: settingsData.defaultCurrency || "UYU",
      theme: settingsData.theme || "light",
      language: settingsData.language || "es",
      exchangeRate: (settingsData.exchangeRate && typeof settingsData.exchangeRate === 'number' ? settingsData.exchangeRate.toString() : settingsData.exchangeRate) || "40.0",
      lastExchangeRateUpdate: settingsData.lastExchangeRateUpdate ? (typeof settingsData.lastExchangeRateUpdate === 'string' ? new Date(settingsData.lastExchangeRateUpdate) : settingsData.lastExchangeRateUpdate) : null,
    };
    this.userSettings.set(id, newSettings); // Store by its own ID, retrieval will iterate or use a secondary map if performance critical
    return newSettings;
  }
  
  async updateSettings(userId: number, data: Partial<InsertSettings>): Promise<Settings | undefined> {
    let settingsToUpdate: Settings | undefined;
    let settingsKey: number | undefined;

    // Find the settings by userId
    for (const [key, s] of this.userSettings.entries()) {
        if (s.userId === userId) {
            settingsToUpdate = s;
            settingsKey = key;
            break;
        }
    }

    if (!settingsToUpdate || settingsKey === undefined) {
        // If settings don't exist for the user, and data includes userId, consider creating new settings
        if (data.userId !== undefined) {
            return this.createSettings(data as InsertSettings);
        }
        return undefined;
    }

    const updatedSettings: Settings = { ...settingsToUpdate, ...data };
    if (data.lastExchangeRateUpdate && typeof data.lastExchangeRateUpdate === 'string') {
        updatedSettings.lastExchangeRateUpdate = new Date(data.lastExchangeRateUpdate);
    }
    if (data.exchangeRate && typeof data.exchangeRate === 'number') {
        updatedSettings.exchangeRate = data.exchangeRate.toString();
    }
    this.userSettings.set(settingsKey, updatedSettings);
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

  // Balance Transfers - Missing methods implementation
  async getBalanceTransfers(userId: number): Promise<BalanceTransfer[]> {
    return Array.from(this.balanceTransfers.values()).filter(bt => bt.userId === userId);
  }

  async createBalanceTransfer(transfer: InsertBalanceTransfer): Promise<BalanceTransfer> {
    const id = this.currentId.balanceTransfers++;
    const now = new Date();
    const newTransfer: BalanceTransfer = {
      id,
      userId: transfer.userId,
      fromPersonal: transfer.fromPersonal,
      amount: typeof transfer.amount === 'number' ? transfer.amount.toString() : transfer.amount,
      currency: transfer.currency || "UYU",
      description: transfer.description || null,
      date: typeof transfer.date === 'string' ? new Date(transfer.date) : transfer.date,
      createdAt: now,
    };
    this.balanceTransfers.set(id, newTransfer);

    // Update user balances
    const user = this.users.get(transfer.userId);
    if (user) {
      let personal = parseFloat(user.personalBalance);
      let family = parseFloat(user.familyBalance);
      const transferAmount = parseFloat(newTransfer.amount);

      if (newTransfer.fromPersonal) { // Transfer from Personal to Family
        personal -= transferAmount;
        family += transferAmount;
      } else { // Transfer from Family to Personal
        personal += transferAmount;
        family -= transferAmount;
      }
      user.personalBalance = personal.toString();
      user.familyBalance = family.toString();
      this.users.set(user.id, user); // Save updated user
    }
    return newTransfer;
  }

  async updateUserBalance(userId: number, personalAmount: number, familyAmount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    user.personalBalance = personalAmount.toString();
    user.familyBalance = familyAmount.toString();
    this.users.set(userId, user);
    return user;
  }
}

// In a real app, you might use:
// const useCloudStorage = process.env.USE_CLOUD_STORAGE === 'true';
// export const storage: IStorage = useCloudStorage ? new CloudStorage() : new DatabaseStorage(pool);
// Forcing MemStorage for this exercise and development
export const storage: IStorage = new MemStorage();
// import { DatabaseStorage } from "./database-storage"; // Keep for potential switch
// export const storage: IStorage = new DatabaseStorage();
