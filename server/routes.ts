import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertSavingsGoalSchema, insertSavingsContributionSchema, insertCategorySchema, insertTagSchema, insertSettingsSchema, insertRecurringTransactionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Accounts
  app.get("/api/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const includeShared = req.query.shared === "true";
      const accounts = await storage.getAccountsByUser(req.user.id, includeShared);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las cuentas" });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const account = await storage.getAccount(parseInt(req.params.id));
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      if (account.userId !== req.user.id && !account.isShared) {
        return res.status(403).json({ message: "No tienes permiso para ver esta cuenta" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la cuenta" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const accountData = await insertAccountSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ message: "Datos de cuenta inválidos", error });
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const account = await storage.getAccount(parseInt(req.params.id));
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      if (account.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar esta cuenta" });
      }
      
      const accountData = req.body;
      const updatedAccount = await storage.updateAccount(parseInt(req.params.id), accountData);
      res.json(updatedAccount);
    } catch (error) {
      res.status(400).json({ message: "Datos de cuenta inválidos", error });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const account = await storage.getAccount(parseInt(req.params.id));
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      if (account.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta cuenta" });
      }
      
      await storage.deleteAccount(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la cuenta" });
    }
  });

  // Get account types
  app.get("/api/account-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const accountTypes = await storage.getAccountTypes();
      res.json(accountTypes);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los tipos de cuenta" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las categorías" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const categoryData = await insertCategorySchema.parseAsync(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Datos de categoría inválidos", error });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }
      if (category.isSystem) {
        return res.status(403).json({ message: "No se puede modificar una categoría del sistema" });
      }
      
      const categoryData = req.body;
      const updatedCategory = await storage.updateCategory(parseInt(req.params.id), categoryData);
      res.json(updatedCategory);
    } catch (error) {
      res.status(400).json({ message: "Datos de categoría inválidos", error });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }
      if (category.isSystem) {
        return res.status(403).json({ message: "No se puede eliminar una categoría del sistema" });
      }
      
      await storage.deleteCategory(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la categoría" });
    }
  });

  // Tags
  app.get("/api/tags", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tags = await storage.getTags(req.user.id);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las etiquetas" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tagData = await insertTagSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ message: "Datos de etiqueta inválidos", error });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tag = await storage.getTag(parseInt(req.params.id));
      if (!tag) {
        return res.status(404).json({ message: "Etiqueta no encontrada" });
      }
      if (tag.isSystem) {
        return res.status(403).json({ message: "No se puede eliminar una etiqueta del sistema" });
      }
      if (tag.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta etiqueta" });
      }
      
      await storage.deleteTag(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la etiqueta" });
    }
  });

  // Transaction types
  app.get("/api/transaction-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionTypes = await storage.getTransactionTypes();
      res.json(transactionTypes);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los tipos de transacción" });
    }
  });

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
        accountId: req.query.accountId ? parseInt(req.query.accountId as string) : undefined,
        search: req.query.search as string,
        isShared: req.query.isShared === "true" ? true : req.query.isShared === "false" ? false : undefined,
        transactionTypeId: req.query.transactionTypeId ? parseInt(req.query.transactionTypeId as string) : undefined
      };
      
      const transactions = await storage.getTransactions(req.user.id, filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las transacciones" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) {
        return res.status(404).json({ message: "Transacción no encontrada" });
      }
      if (transaction.userId !== req.user.id && !transaction.isShared) {
        return res.status(403).json({ message: "No tienes permiso para ver esta transacción" });
      }
      
      // Get splits if any
      const splits = await storage.getSplitsByTransaction(transaction.id);
      
      res.json({ ...transaction, splits });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la transacción" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionData = await insertTransactionSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      
      const transaction = await storage.createTransaction(transactionData);
      
      // Handle splits if present
      if (req.body.splits && Array.isArray(req.body.splits)) {
        for (const split of req.body.splits) {
          await storage.createTransactionSplit({
            transactionId: transaction.id,
            categoryId: split.categoryId,
            amount: split.amount,
            description: split.description
          });
        }
      }
      
      // Handle tags if present
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tagId of req.body.tags) {
          await storage.addTagToTransaction({
            transactionId: transaction.id,
            tagId
          });
        }
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Datos de transacción inválidos", error });
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) {
        return res.status(404).json({ message: "Transacción no encontrada" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar esta transacción" });
      }
      
      const transactionData = req.body;
      const updatedTransaction = await storage.updateTransaction(parseInt(req.params.id), transactionData);
      res.json(updatedTransaction);
    } catch (error) {
      res.status(400).json({ message: "Datos de transacción inválidos", error });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) {
        return res.status(404).json({ message: "Transacción no encontrada" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta transacción" });
      }
      
      await storage.deleteTransaction(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la transacción" });
    }
  });

  // Recurring transactions
  app.get("/api/recurring-transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recurringTransactions = await storage.getRecurringTransactions(req.user.id);
      res.json(recurringTransactions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las transacciones recurrentes" });
    }
  });

  app.post("/api/recurring-transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recurringTransactionData = await insertRecurringTransactionSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const recurringTransaction = await storage.createRecurringTransaction(recurringTransactionData);
      res.status(201).json(recurringTransaction);
    } catch (error) {
      res.status(400).json({ message: "Datos de transacción recurrente inválidos", error });
    }
  });

  app.put("/api/recurring-transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recurringTransaction = await storage.getRecurringTransaction(parseInt(req.params.id));
      if (!recurringTransaction) {
        return res.status(404).json({ message: "Transacción recurrente no encontrada" });
      }
      if (recurringTransaction.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar esta transacción recurrente" });
      }
      
      const recurringTransactionData = req.body;
      const updatedRecurringTransaction = await storage.updateRecurringTransaction(parseInt(req.params.id), recurringTransactionData);
      res.json(updatedRecurringTransaction);
    } catch (error) {
      res.status(400).json({ message: "Datos de transacción recurrente inválidos", error });
    }
  });

  app.delete("/api/recurring-transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recurringTransaction = await storage.getRecurringTransaction(parseInt(req.params.id));
      if (!recurringTransaction) {
        return res.status(404).json({ message: "Transacción recurrente no encontrada" });
      }
      if (recurringTransaction.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta transacción recurrente" });
      }
      
      await storage.deleteRecurringTransaction(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la transacción recurrente" });
    }
  });

  // Budgets
  app.get("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budgets = await storage.getBudgets(req.user.id);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los presupuestos" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budgetData = await insertBudgetSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const budget = await storage.createBudget(budgetData);
      res.status(201).json(budget);
    } catch (error) {
      res.status(400).json({ message: "Datos de presupuesto inválidos", error });
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budget = await storage.getBudget(parseInt(req.params.id));
      if (!budget) {
        return res.status(404).json({ message: "Presupuesto no encontrado" });
      }
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar este presupuesto" });
      }
      
      const budgetData = req.body;
      const updatedBudget = await storage.updateBudget(parseInt(req.params.id), budgetData);
      res.json(updatedBudget);
    } catch (error) {
      res.status(400).json({ message: "Datos de presupuesto inválidos", error });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budget = await storage.getBudget(parseInt(req.params.id));
      if (!budget) {
        return res.status(404).json({ message: "Presupuesto no encontrado" });
      }
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar este presupuesto" });
      }
      
      await storage.deleteBudget(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el presupuesto" });
    }
  });

  // Savings goals
  app.get("/api/savings-goals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoals = await storage.getSavingsGoals(req.user.id);
      res.json(savingsGoals);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las metas de ahorro" });
    }
  });

  app.post("/api/savings-goals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoalData = await insertSavingsGoalSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const savingsGoal = await storage.createSavingsGoal(savingsGoalData);
      res.status(201).json(savingsGoal);
    } catch (error) {
      res.status(400).json({ message: "Datos de meta de ahorro inválidos", error });
    }
  });

  app.put("/api/savings-goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (!savingsGoal) {
        return res.status(404).json({ message: "Meta de ahorro no encontrada" });
      }
      if (savingsGoal.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar esta meta de ahorro" });
      }
      
      const savingsGoalData = req.body;
      const updatedSavingsGoal = await storage.updateSavingsGoal(parseInt(req.params.id), savingsGoalData);
      res.json(updatedSavingsGoal);
    } catch (error) {
      res.status(400).json({ message: "Datos de meta de ahorro inválidos", error });
    }
  });

  app.delete("/api/savings-goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (!savingsGoal) {
        return res.status(404).json({ message: "Meta de ahorro no encontrada" });
      }
      if (savingsGoal.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta meta de ahorro" });
      }
      
      await storage.deleteSavingsGoal(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la meta de ahorro" });
    }
  });

  // Savings contributions
  app.get("/api/savings-goals/:id/contributions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (!savingsGoal) {
        return res.status(404).json({ message: "Meta de ahorro no encontrada" });
      }
      if (savingsGoal.userId !== req.user.id && !savingsGoal.isShared) {
        return res.status(403).json({ message: "No tienes permiso para ver esta meta de ahorro" });
      }
      
      const contributions = await storage.getContributionsBySavingsGoal(parseInt(req.params.id));
      res.json(contributions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las contribuciones" });
    }
  });

  app.post("/api/savings-goals/:id/contributions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const savingsGoal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (!savingsGoal) {
        return res.status(404).json({ message: "Meta de ahorro no encontrada" });
      }
      if (savingsGoal.userId !== req.user.id && !savingsGoal.isShared) {
        return res.status(403).json({ message: "No tienes permiso para contribuir a esta meta de ahorro" });
      }
      
      const contributionData = await insertSavingsContributionSchema.parseAsync({
        ...req.body,
        savingsGoalId: parseInt(req.params.id),
        userId: req.user.id
      });
      
      const contribution = await storage.createSavingsContribution(contributionData);
      res.status(201).json(contribution);
    } catch (error) {
      res.status(400).json({ message: "Datos de contribución inválidos", error });
    }
  });

  app.delete("/api/savings-contributions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contribution = await storage.savingsContributions.get(parseInt(req.params.id));
      if (!contribution) {
        return res.status(404).json({ message: "Contribución no encontrada" });
      }
      if (contribution.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar esta contribución" });
      }
      
      await storage.deleteSavingsContribution(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la contribución" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const settings = await storage.getSettings(req.user.id);
      if (!settings) {
        // Create default settings if not found
        const defaultSettings = await storage.createSettings({
          userId: req.user.id,
          defaultCurrency: "UYU",
          theme: "light",
          language: "es",
          exchangeRate: "40.0"
        });
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la configuración" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const settingsData = req.body;
      const settings = await storage.getSettings(req.user.id);
      
      if (!settings) {
        // Create settings if not found
        const newSettings = await storage.createSettings({
          ...settingsData,
          userId: req.user.id
        });
        return res.json(newSettings);
      }
      
      const updatedSettings = await storage.updateSettings(req.user.id, settingsData);
      res.json(updatedSettings);
    } catch (error) {
      res.status(400).json({ message: "Datos de configuración inválidos", error });
    }
  });

  // Simple OCR API simulation for receipt scanning
  app.post("/api/ocr/scan", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Simulate OCR processing time
    setTimeout(() => {
      // Mock OCR response with random data (this would be replaced with a real OCR API call)
      const mockOcrResult = {
        success: true,
        data: {
          merchant: "Supermercado Devoto",
          date: new Date().toISOString().split('T')[0],
          amount: (Math.random() * 5000 + 500).toFixed(2),
          currency: "UYU",
          items: [
            { description: "Frutas y verduras", amount: (Math.random() * 1000 + 100).toFixed(2) },
            { description: "Carnes", amount: (Math.random() * 1500 + 300).toFixed(2) },
            { description: "Artículos de limpieza", amount: (Math.random() * 800 + 200).toFixed(2) }
          ]
        }
      };
      
      res.json(mockOcrResult);
    }, 1500); // Simulate a 1.5 second processing delay
  });

  const httpServer = createServer(app);
  return httpServer;
}
