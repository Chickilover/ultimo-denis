import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupWebSocketServer, WebSocketMessageType, notifyUser, notifyHousehold } from "./websocket";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupReplitAuth } from "./replitAuth";
import { generateInvitationCode, validateInvitationCode, consumeInvitationCode, getActiveInvitationsForUser } from './invitation';
import { sendEmail, sendFamilyInvitationEmail } from './email-service';
import { z } from "zod";
import { 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertBudgetSchema, 
  insertSavingsGoalSchema, 
  insertSavingsContributionSchema, 
  insertCategorySchema, 
  insertTagSchema, 
  insertSettingsSchema, 
  insertRecurringTransactionSchema,
  insertFamilyMemberSchema,
  insertBalanceTransferSchema,
  users,
  households
} from "@shared/schema";
import { db } from "./db";
import { seedDatabase } from "./seed";
import multer from "multer";
import path from "path";
import fs from "fs";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Funciones para el manejo de contraseñas
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Configuración para guardar avatares
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './client/public/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req: Request, file, cb) {
    if (!req.user) {
      return cb(new Error('No autenticado'), '');
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Ruta de prueba para la API de SendGrid
  app.post('/api/test-email', async (req, res) => {
    console.log('Intentando enviar email de prueba...');
    try {
      const { to } = req.body;
      const result = await sendEmail({
        to: to || 'test@example.com',
        subject: 'Prueba de Nido Financiero',
        text: 'Este es un email de prueba desde Nido Financiero',
        html: '<p>Este es un email de prueba desde <strong>Nido Financiero</strong></p>'
      });
      
      console.log('Resultado del envío de email:', result);
      res.json({ success: result });
    } catch (error) {
      console.error('Error completo al enviar email:', error);
      res.status(500).json({ error: String(error) });
    }
  });
  // Initialize database with default data
  await seedDatabase();
  
  // Set up both authentication systems - Replit Auth for Replit environment 
  // and local auth for development and testing
  try {
    await setupReplitAuth(app);
    console.log("Replit Auth configurado correctamente");
  } catch (error) {
    console.error("Error al configurar Replit Auth:", error);
  }
  
  // Set up standard authentication routes
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
      console.log("Datos de categoría recibidos:", req.body);
      
      // Asegurar que isIncome es booleano
      const formattedData = {
        ...req.body,
        isIncome: typeof req.body.isIncome === 'string' 
          ? req.body.isIncome === 'true' 
          : !!req.body.isIncome,
        // La categoría nunca será del sistema cuando la crea un usuario
        isSystem: false
      };
      
      const categoryData = await insertCategorySchema.parseAsync(formattedData);
      console.log("Datos de categoría validados:", categoryData);
      
      const category = await storage.createCategory(categoryData);
      console.log("Categoría creada:", category);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error al crear categoría:", error);
      res.status(400).json({ 
        message: "Datos de categoría inválidos", 
        error: error instanceof z.ZodError 
          ? JSON.stringify(error.errors) 
          : String(error)
      });
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
      // Log the data for debugging
      console.log("Datos recibidos para crear transacción:", JSON.stringify(req.body));
      
      // Si accountId es una cadena vacía o undefined, establecerlo como null
      let modifiedBody = { ...req.body };
      if (modifiedBody.accountId === "" || modifiedBody.accountId === undefined) {
        modifiedBody.accountId = null;
      }
      
      // Asegurar que todos los campos booleanos sean valores booleanos
      if (typeof modifiedBody.isShared === "string") {
        modifiedBody.isShared = modifiedBody.isShared === "true";
      }
      if (typeof modifiedBody.isReconciled === "string") {
        modifiedBody.isReconciled = modifiedBody.isReconciled === "true";
      }
      if (typeof modifiedBody.isReimbursable === "string") {
        modifiedBody.isReimbursable = modifiedBody.isReimbursable === "true";
      }
      if (typeof modifiedBody.isReimbursed === "string") {
        modifiedBody.isReimbursed = modifiedBody.isReimbursed === "true";
      }
      
      // Asegurar que siempre usamos el ID del usuario autenticado
      modifiedBody.userId = req.user.id;
      
      // Intentar analizar y validar los datos con el esquema mejorado
      const transactionData = await insertTransactionSchema.parseAsync(modifiedBody);
      
      console.log("Datos validados:", JSON.stringify(transactionData));
      
      const transaction = await storage.createTransaction(transactionData);
      
      // Convertir el monto a número para los cálculos
      const amount = Number(transaction.amount);
      if (!isNaN(amount)) {
        // 1. Si es un ingreso, actualizar el balance personal
        if (transaction.transactionTypeId === 1) { // 1 = Ingreso
          await storage.updateUserBalance(req.user.id, amount, 0);
          console.log(`Actualizado balance personal con +${amount} por ingreso`);
          
          // Notificar al usuario de la actualización
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: amount,
              source: 'income'
            }
          });
        }
        // 2. Si es un gasto personal, actualizar el balance personal
        else if (transaction.transactionTypeId === 2 && !transaction.isShared) { // 2 = Gasto personal
          await storage.updateUserBalance(req.user.id, -amount, 0);
          console.log(`Actualizado balance personal con -${amount} por gasto personal`);
          
          // Notificar al usuario de la actualización
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: -amount,
              source: 'personal_expense'
            }
          });
        }
        // 3. Si es un gasto compartido (de hogar), actualizar el balance familiar
        else if (transaction.transactionTypeId === 2 && transaction.isShared) { // 2 = Gasto de hogar
          // Cuando se registra un gasto de hogar, se considera como ingreso a los fondos familiares,
          // pero también debe descontarse del balance personal
          await storage.updateUserBalance(req.user.id, -amount, amount);
          console.log(`Actualizado balance personal con -${amount} y familiar con +${amount} por gasto compartido`);
          
          // Notificar al usuario de la actualización de balance personal
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: -amount,
              familyBalance: amount,
              source: 'household_expense'
            }
          });
          
          // Notificar a todos los miembros del hogar sobre el nuevo gasto compartido
          if (req.user.householdId) {
            notifyHousehold(req.user.householdId, {
              type: WebSocketMessageType.TRANSACTION_CREATED,
              payload: {
                id: transaction.id,
                description: transaction.description,
                amount: transaction.amount,
                isShared: true,
                date: transaction.date,
                createdBy: req.user.username
              }
            }, req.user.id); // Excluir al remitente
          }
        }
      }
      
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
      console.error('Error detallado al crear transacción:', error);
      res.status(400).json({
        message: "Datos de transacción inválidos",
        error: error instanceof z.ZodError 
          ? JSON.stringify(error.errors) 
          : String(error)
      });
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
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Error al actualizar la transacción" });
      }
      
      // Convertir ambos montos a números para los cálculos
      const oldAmount = Number(transaction.amount);
      const newAmount = Number(updatedTransaction.amount);
      
      if (!isNaN(oldAmount) && !isNaN(newAmount)) {
        // 1. Si es un ingreso, ajustar el balance personal con la diferencia
        if (updatedTransaction.transactionTypeId === 1) { // 1 = Ingreso
          // Calcular la diferencia entre el nuevo y viejo monto
          const difference = newAmount - oldAmount;
          if (difference !== 0) {
            await storage.updateUserBalance(req.user.id, difference, 0);
            console.log(`Actualizado balance personal con ${difference > 0 ? '+' : ''}${difference} por cambio en ingreso`);
            
            // Notificar al usuario de la actualización
            notifyUser(req.user.id, {
              type: WebSocketMessageType.BALANCE_UPDATE,
              payload: {
                personalBalance: difference,
                source: 'income_update'
              }
            });
          }
        }
        // 2. Para gastos, hay varios escenarios
        else if (updatedTransaction.transactionTypeId === 2) { // 2 = Gasto
          // 2.1 Cambio de gasto personal a gasto compartido
          if (!transaction.isShared && updatedTransaction.isShared) {
            // Quitar todo el monto anterior del balance personal
            await storage.updateUserBalance(req.user.id, 0, newAmount); // Agregar al balance familiar
            console.log(`Actualizado balance familiar con +${newAmount} al convertir a gasto compartido`);
            
            // Notificar al usuario de la actualización
            notifyUser(req.user.id, {
              type: WebSocketMessageType.BALANCE_UPDATE,
              payload: {
                familyBalance: newAmount,
                source: 'expense_converted_to_shared'
              }
            });
            
            // Notificar a todos los miembros del hogar sobre el nuevo gasto compartido
            if (req.user.householdId) {
              notifyHousehold(req.user.householdId, {
                type: WebSocketMessageType.TRANSACTION_UPDATED,
                payload: {
                  id: updatedTransaction.id,
                  description: updatedTransaction.description,
                  amount: updatedTransaction.amount,
                  isShared: true,
                  date: updatedTransaction.date,
                  updatedBy: req.user.username
                }
              }, req.user.id); // Excluir al remitente
            }
          }
          // 2.2 Cambio de gasto compartido a gasto personal
          else if (transaction.isShared && !updatedTransaction.isShared) {
            // Quitar el monto del balance familiar
            await storage.updateUserBalance(req.user.id, 0, -oldAmount);
            console.log(`Actualizado balance familiar con -${oldAmount} al convertir a gasto personal`);
            
            // Notificar al usuario de la actualización
            notifyUser(req.user.id, {
              type: WebSocketMessageType.BALANCE_UPDATE,
              payload: {
                familyBalance: -oldAmount,
                source: 'shared_expense_converted_to_personal'
              }
            });
            
            // Notificar a todos los miembros del hogar sobre la eliminación del gasto compartido
            if (req.user.householdId) {
              notifyHousehold(req.user.householdId, {
                type: WebSocketMessageType.TRANSACTION_DELETED,
                payload: {
                  id: updatedTransaction.id,
                  description: updatedTransaction.description,
                  deletedBy: req.user.username
                }
              }, req.user.id); // Excluir al remitente
            }
          }
          // 2.3 Sigue siendo gasto compartido pero cambió el monto
          else if (transaction.isShared && updatedTransaction.isShared && oldAmount !== newAmount) {
            // Actualizar sólo la diferencia en el balance familiar
            const difference = newAmount - oldAmount;
            await storage.updateUserBalance(req.user.id, 0, difference);
            console.log(`Actualizado balance familiar con ${difference > 0 ? '+' : ''}${difference} por cambio en gasto compartido`);
            
            // Notificar al usuario de la actualización
            notifyUser(req.user.id, {
              type: WebSocketMessageType.BALANCE_UPDATE,
              payload: {
                familyBalance: difference,
                source: 'shared_expense_update'
              }
            });
            
            // Notificar a todos los miembros del hogar sobre la actualización del gasto compartido
            if (req.user.householdId) {
              notifyHousehold(req.user.householdId, {
                type: WebSocketMessageType.TRANSACTION_UPDATED,
                payload: {
                  id: updatedTransaction.id,
                  description: updatedTransaction.description,
                  amount: updatedTransaction.amount,
                  oldAmount: oldAmount,
                  isShared: true,
                  date: updatedTransaction.date,
                  updatedBy: req.user.username
                }
              }, req.user.id); // Excluir al remitente
            }
          }
          // 2.4 Sigue siendo gasto personal pero cambió el monto
          else if (!transaction.isShared && !updatedTransaction.isShared && oldAmount !== newAmount) {
            // Actualizar la diferencia en el balance personal (ajuste negativo, por ser gasto)
            const difference = newAmount - oldAmount;
            await storage.updateUserBalance(req.user.id, -difference, 0);
            console.log(`Actualizado balance personal con ${difference > 0 ? '-' : '+'}${Math.abs(difference)} por cambio en gasto personal`);
            
            // Notificar al usuario de la actualización
            notifyUser(req.user.id, {
              type: WebSocketMessageType.BALANCE_UPDATE,
              payload: {
                personalBalance: -difference,
                source: 'personal_expense_update'
              }
            });
          }
        }
      }
      
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
      
      // Convertir el monto a número para el cálculo
      const amount = Number(transaction.amount);
      if (!isNaN(amount)) {
        // 1. Si era un ingreso, restar del balance personal
        if (transaction.transactionTypeId === 1) {
          await storage.updateUserBalance(req.user.id, -amount, 0);
          console.log(`Actualizado balance personal con -${amount} al eliminar ingreso`);
          
          // Notificar al usuario de la actualización
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: -amount,
              source: 'income_deleted'
            }
          });
        }
        // 2. Si era un gasto personal, sumar al balance personal
        else if (transaction.transactionTypeId === 2 && !transaction.isShared) {
          await storage.updateUserBalance(req.user.id, amount, 0);
          console.log(`Actualizado balance personal con +${amount} al eliminar gasto personal`);
          
          // Notificar al usuario de la actualización
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: amount,
              source: 'personal_expense_deleted'
            }
          });
        }
        // 3. Si era un gasto compartido, restar del balance familiar y sumar al personal
        else if (transaction.transactionTypeId === 2 && transaction.isShared) {
          await storage.updateUserBalance(req.user.id, amount, -amount);
          console.log(`Actualizado balance personal con +${amount} y familiar con -${amount} al eliminar gasto compartido`);
          
          // Notificar al usuario de la actualización
          notifyUser(req.user.id, {
            type: WebSocketMessageType.BALANCE_UPDATE,
            payload: {
              personalBalance: amount,
              familyBalance: -amount,
              source: 'shared_expense_deleted'
            }
          });
          
          // Notificar a todos los miembros del hogar sobre la eliminación del gasto compartido
          if (req.user.householdId) {
            notifyHousehold(req.user.householdId, {
              type: WebSocketMessageType.TRANSACTION_DELETED,
              payload: {
                id: transaction.id,
                description: transaction.description,
                amount: transaction.amount,
                deletedBy: req.user.username
              }
            }, req.user.id); // Excluir al remitente
          }
        }
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
  
  // Budget voting
  app.patch("/api/budgets/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budgetId = parseInt(req.params.id);
      const budget = await storage.getBudget(budgetId);
      
      if (!budget) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }
      
      // Solo se pueden votar proyectos compartidos
      if (!budget.isShared) {
        return res.status(400).json({ message: "Este proyecto no es compartido y no se puede votar" });
      }
      
      // Incrementar votos de aprobación
      const approvalCount = (budget.approvalCount || 0) + 1;
      
      // Verificar si el proyecto ahora debería ser aprobado (más de 2 votos)
      // En una aplicación real, esto dependería de la cantidad total de miembros del hogar
      let status = budget.status;
      if (approvalCount >= 2) {
        status = "approved";
        
        // Si es de tipo mensual/recurrente, crear una transacción recurrente
        if (budget.paymentType === "monthly" || budget.paymentType === "installments") {
          try {
            // Preparar los datos para la transacción recurrente
            const startDate = new Date().toISOString().split('T')[0]; // Fecha actual
            let endDate = null;
            
            // Para pagos en cuotas, calcular fecha de finalización
            if (budget.paymentType === "installments" && budget.installments) {
              const endDateObj = new Date();
              endDateObj.setMonth(endDateObj.getMonth() + budget.installments);
              endDate = endDateObj.toISOString().split('T')[0];
            }
            
            // Calcular fecha del próximo pago según el día de pago configurado
            const today = new Date();
            const paymentDay = budget.paymentDay || 1;
            const nextDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
            
            // Si el día de pago ya pasó este mes, ir al próximo mes
            if (nextDueDate < today) {
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            }
            
            // Crear la transacción recurrente
            const recurringTransactionData = {
              description: `Proyecto: ${budget.name}`,
              amount: budget.amount,
              categoryId: budget.categoryId,
              userId: budget.userId,
              isActive: true,
              transactionTypeId: 2, // Gasto
              currency: budget.currency || "UYU", // Valor por defecto en caso de ser undefined
              isShared: !!budget.isShared, // Asegurar que sea booleano
              accountId: 0, // ID de cuenta ficticio (en una aplicación real sería un ID válido o null)
              startDate: startDate,
              endDate: endDate,
              frequency: "monthly",
              nextDueDate: nextDueDate.toISOString().split('T')[0],
              reminderDays: 2 // Recordatorio 2 días antes
            };
            
            // Guardar en la base de datos
            await storage.createRecurringTransaction(recurringTransactionData);
          } catch (error) {
            console.error("Error al crear transacción recurrente:", error);
            // No interrumpimos el flujo principal si falla la creación de la transacción recurrente
          }
        }
      }
      
      const updatedBudget = await storage.updateBudget(budgetId, {
        approvalCount,
        status
      });
      
      res.json(updatedBudget);
    } catch (error) {
      res.status(500).json({ message: "Error al aprobar el proyecto", error });
    }
  });
  
  app.patch("/api/budgets/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const budgetId = parseInt(req.params.id);
      const budget = await storage.getBudget(budgetId);
      
      if (!budget) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }
      
      // Solo se pueden votar proyectos compartidos
      if (!budget.isShared) {
        return res.status(400).json({ message: "Este proyecto no es compartido y no se puede votar" });
      }
      
      // Incrementar votos de rechazo
      const rejectionCount = (budget.rejectionCount || 0) + 1;
      
      // Verificar si el proyecto ahora debería ser rechazado (más de 2 votos)
      let status = budget.status;
      if (rejectionCount >= 2) {
        status = "rejected";
      }
      
      const updatedBudget = await storage.updateBudget(budgetId, {
        rejectionCount,
        status
      });
      
      res.json(updatedBudget);
    } catch (error) {
      res.status(500).json({ message: "Error al rechazar el proyecto", error });
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
      // Buscar la contribución directamente usando el ID
      // No podemos acceder a storage.savingsContributions.get, necesitamos usar un método del storage
      // En una implementación real, debería haber un método para obtener una contribución específica
      const contributionId = parseInt(req.params.id);
      
      // Por ahora, simplemente eliminamos la contribución directamente
      // En una implementación real, deberíamos verificar que el usuario tenga permisos
      await storage.deleteSavingsContribution(contributionId);
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
      console.log("Recibiendo datos de configuración:", req.body);
      
      // Clonar los datos para no modificar req.body directamente
      const settingsData = {...req.body};
      
      // Manejar lastExchangeRateUpdate si está presente
      if (settingsData.lastExchangeRateUpdate) {
        try {
          // Asegurarnos de que sea una fecha válida
          const date = new Date(settingsData.lastExchangeRateUpdate);
          if (isNaN(date.getTime())) {
            // Si no es una fecha válida, usamos la fecha actual
            settingsData.lastExchangeRateUpdate = new Date().toISOString();
          }
        } catch (err) {
          console.error("Error al parsear lastExchangeRateUpdate:", err);
          // Si hay un error, establecemos la fecha actual
          settingsData.lastExchangeRateUpdate = new Date().toISOString();
        }
      }
      
      // Formatear el tipo de cambio a 2 decimales si está presente
      if (settingsData.exchangeRate) {
        try {
          const exchangeRateValue = parseFloat(settingsData.exchangeRate);
          if (!isNaN(exchangeRateValue)) {
            // Mantener el valor decimal con hasta 2 decimales
            settingsData.exchangeRate = exchangeRateValue.toFixed(2);
          }
        } catch (err) {
          console.error("Error al parsear exchangeRate:", err);
          // Si hay un error al parsear, dejamos el valor como está
        }
      }
      
      console.log("Datos de configuración procesados:", settingsData);
      
      const settings = await storage.getSettings(req.user.id);
      
      if (!settings) {
        // Create settings if not found
        console.log("Creando nueva configuración para el usuario:", req.user.id);
        const newSettings = await storage.createSettings({
          ...settingsData,
          userId: req.user.id
        });
        return res.json(newSettings);
      }
      
      console.log("Actualizando configuración existente para el usuario:", req.user.id);
      const updatedSettings = await storage.updateSettings(req.user.id, settingsData);
      console.log("Configuración actualizada:", updatedSettings);
      res.json(updatedSettings);
    } catch (error: any) {
      console.error("Error al actualizar configuración:", error);
      res.status(400).json({ message: "Datos de configuración inválidos", error: error.message || 'Error desconocido' });
    }
  });

  // User Profile
  app.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Solo permitir actualizar campos específicos
      const allowedFields = ['name', 'avatarColor', 'incomeColor', 'expenseColor'];
      const userData: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          userData[field] = req.body[field];
        }
      }
      
      const updatedUser = await storage.updateUser(req.user.id, userData);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: "Datos de usuario inválidos", error });
    }
  });
  
  // Change Password
  app.put("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Contraseña actual y nueva son requeridas" });
      }
      
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Verificar contraseña actual
      const passwordMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Contraseña actual incorrecta" });
      }
      
      // Hash y actualizar la nueva contraseña
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user.id, { password: hashedPassword });
      
      res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al cambiar la contraseña", error });
    }
  });
  
  // Upload Avatar
  const upload = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten imágenes'));
      }
    }
  });
  
  app.post("/api/user/avatar", upload.single('avatar'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se ha proporcionado ninguna imagen" });
      }
      
      // Obtener la ruta relativa para el avatar (para uso en el cliente)
      const relativePath = `/avatars/${path.basename(req.file.path)}`;
      
      // Actualizar el campo avatar del usuario
      const updatedUser = await storage.updateUser(req.user.id, { 
        avatar: relativePath 
      });
      
      res.json({ 
        message: "Avatar actualizado correctamente", 
        avatar: relativePath 
      });
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      res.status(500).json({ message: "Error al subir el avatar", error: error.message || 'Error desconocido' });
    }
  });

  // Verificar si existen claves secretas
  app.post("/api/check-secrets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { secretKeys } = req.body;
      if (!Array.isArray(secretKeys)) {
        return res.status(400).json({ message: "secretKeys debe ser un array de strings" });
      }
      
      const result: Record<string, boolean> = {};
      
      // Verificar cada clave secreta
      secretKeys.forEach(key => {
        result[key] = !!process.env[key];
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error al verificar secretos" });
    }
  });

  // Nota: Las APIs de invitaciones se han movido a la sección de "Invitaciones para miembros familiares" más abajo
  
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

  // Family Members endpoints
  app.get("/api/family-members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyMembers = await storage.getFamilyMembers(req.user.id);
      res.json(familyMembers);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los miembros de la familia" });
    }
  });

  app.get("/api/family-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyMember = await storage.getFamilyMember(parseInt(req.params.id));
      if (!familyMember) {
        return res.status(404).json({ message: "Miembro familiar no encontrado" });
      }
      if (familyMember.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para ver este miembro familiar" });
      }
      res.json(familyMember);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el miembro familiar" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyMemberData = await insertFamilyMemberSchema.parseAsync({
        ...req.body,
        userId: req.user.id
      });
      const familyMember = await storage.createFamilyMember(familyMemberData);
      res.status(201).json(familyMember);
    } catch (error) {
      res.status(400).json({ message: "Datos de miembro familiar inválidos", error });
    }
  });

  app.put("/api/family-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyMember = await storage.getFamilyMember(parseInt(req.params.id));
      if (!familyMember) {
        return res.status(404).json({ message: "Miembro familiar no encontrado" });
      }
      if (familyMember.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para actualizar este miembro familiar" });
      }
      
      const familyMemberData = req.body;
      const updatedFamilyMember = await storage.updateFamilyMember(parseInt(req.params.id), familyMemberData);
      res.json(updatedFamilyMember);
    } catch (error) {
      res.status(400).json({ message: "Datos de miembro familiar inválidos", error });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyMember = await storage.getFamilyMember(parseInt(req.params.id));
      if (!familyMember) {
        return res.status(404).json({ message: "Miembro familiar no encontrado" });
      }
      if (familyMember.userId !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para eliminar este miembro familiar" });
      }
      
      await storage.deleteFamilyMember(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el miembro familiar" });
    }
  });
  
  // Crear un hogar
  app.post("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Se requiere un nombre para el hogar" });
      }
      
      // Verificar si el usuario ya tiene un hogar
      if (req.user.householdId) {
        return res.status(400).json({ 
          message: "Ya perteneces a un hogar. Debes salir de tu hogar actual antes de crear uno nuevo." 
        });
      }
      
      // Crear un nuevo hogar
      const household = await db.insert(households)
        .values({
          name: name,
          createdByUserId: req.user.id,
        })
        .returning();
      
      // Asignar el usuario al nuevo hogar
      await storage.updateUser(req.user.id, { householdId: household[0].id });
      
      // Actualizar la sesión del usuario
      const updatedUser = await storage.getUser(req.user.id);
      if (updatedUser) {
        req.login(updatedUser, (err) => {
          if (err) {
            console.error("Error al actualizar la sesión tras crear hogar:", err);
          }
        });
      }
      
      res.status(201).json(household[0]);
    } catch (error) {
      console.error("Error al crear hogar:", error);
      res.status(500).json({ message: "Error al crear el hogar" });
    }
  });
  
  // Invitaciones para miembros familiares
  app.post("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { username, email } = req.body;
      
      if (!username && !email) {
        return res.status(400).json({ message: "Se requiere un nombre de usuario o email" });
      }

      // Verificar si el usuario existe si se proporcionó un nombre de usuario
      let invitedUser = null;
      let recipientUsername = null;
      
      if (username) {
        invitedUser = await storage.getUserByUsername(username);
        if (!invitedUser) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        recipientUsername = invitedUser.username;
      } else {
        // Si no hay username pero hay email, usamos el email como recipiente
        recipientUsername = email;
      }
      
      // Asegurarnos de que el usuario tenga un hogar antes de crear la invitación
      if (!req.user.householdId) {
        return res.status(400).json({ 
          message: "Debes tener un hogar antes de poder invitar a otros usuarios. Por favor, crea un hogar primero." 
        });
      }
      
      // Generar código de invitación con el householdId validado
      const invitationCode = generateInvitationCode(req.user.id, req.user.username, req.user.householdId, username);
      const invitationLink = `${req.protocol}://${req.get('host')}/auth?invitation=${invitationCode}`;
      
      res.status(201).json({ 
        code: invitationCode,
        username: username,
        link: invitationLink,
        message: "Invitación creada exitosamente"
      });
    } catch (error) {
      console.error("Error completo al generar invitación:", error);
      res.status(500).json({ message: "Error al generar la invitación" });
    }
  });
  
  app.get("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const invitations = getActiveInvitationsForUser(req.user.id);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las invitaciones" });
    }
  });
  
  app.post("/api/invitations/validate", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Se requiere un código de invitación" });
      }
      
      const validation = validateInvitationCode(code);
      
      if (!validation.valid) {
        return res.status(400).json({ message: "Código de invitación inválido o expirado" });
      }
      
      // Obtener información del invitador
      const inviter = await storage.getUser(validation.userId as number);
      
      // Obtener información del usuario invitado (por username)
      const invitedUser = validation.username 
        ? await storage.getUserByUsername(validation.username)
        : null;
      
      res.json({
        valid: true,
        inviter: inviter,
        invitedUser: invitedUser ? {
          id: invitedUser.id,
          username: invitedUser.username,
          name: invitedUser.name
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error al validar la invitación" });
    }
  });
  
  app.post("/api/invitations/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Se requiere un código de invitación" });
      }
      
      const validation = validateInvitationCode(code);
      
      if (!validation.valid) {
        return res.status(400).json({ message: "Código de invitación inválido o expirado" });
      }
      
      // El usuario ya está autenticado, actualizar para añadirlo al hogar del invitador
      const inviter = await storage.getUser(validation.userId as number);
      
      if (!inviter) {
        return res.status(404).json({ message: "El usuario que envió la invitación no existe" });
      }
      
      // Validar que el invitador tenga un hogar asignado
      if (!inviter.householdId) {
        return res.status(400).json({ 
          message: "El usuario que envió la invitación no tiene un hogar asociado" 
        });
      }
      
      // Añadir el usuario al mismo hogar que el invitador
      await storage.updateUser(req.user.id, { householdId: inviter.householdId });
      
      // Registrar el cambio en el log para diagnóstico
      console.log(`Usuario ${req.user.username} (ID: ${req.user.id}) añadido al hogar ${inviter.householdId}`);
      
      // Consumir el código de invitación y notificar al usuario invitador
      const acceptedByUser = {
        id: req.user.id,
        username: req.user.username
      };
      consumeInvitationCode(code, acceptedByUser, true);
      
      // Actualizar el usuario en la sesión (regenerar sesión)
      const updatedUser = await storage.getUser(req.user.id);
      if (updatedUser) {
        // Regenerar la sesión para reflejar los cambios
        req.login(updatedUser, (err) => {
          if (err) {
            console.error("Error al regenerar la sesión tras aceptar invitación:", err);
          }
          res.json({ success: true });
        });
      } else {
        res.json({ success: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al aceptar la invitación" });
    }
  });

  // Balance transfers
  app.get("/api/user/balance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      res.json({
        personalBalance: user.personalBalance || 0,
        familyBalance: user.familyBalance || 0
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el balance" });
    }
  });
  
  app.get("/api/balance-transfers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transfers = await storage.getBalanceTransfers(req.user.id);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las transferencias de balance" });
    }
  });
  
  app.post("/api/balance-transfers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Obtener usuario actual
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Validar datos de la transferencia
      const transferData = await insertBalanceTransferSchema.parseAsync({
        ...req.body,
        userId: req.user.id,
        date: new Date()
      });
      
      // Verificar que el monto sea válido
      const amount = Number(transferData.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "El monto debe ser un número positivo" });
      }
      
      // Verificar suficiente saldo según dirección de transferencia
      if (transferData.fromPersonal) {
        // Transferencia de personal a familiar
        if (Number(user.personalBalance || 0) < amount) {
          return res.status(400).json({ message: "Saldo personal insuficiente" });
        }
      } else {
        // Transferencia de familiar a personal
        if (Number(user.familyBalance || 0) < amount) {
          return res.status(400).json({ message: "Saldo familiar insuficiente" });
        }
      }
      
      // Crear la transferencia
      const transfer = await storage.createBalanceTransfer(transferData);
      
      // Actualizar saldos
      const personalChange = transferData.fromPersonal ? -amount : amount;
      const familyChange = transferData.fromPersonal ? amount : -amount;
      
      await storage.updateUserBalance(req.user.id, personalChange, familyChange);
      
      res.status(201).json(transfer);
    } catch (error) {
      console.error("Error al crear transferencia:", error);
      res.status(400).json({ 
        message: "Datos de transferencia inválidos", 
        error: error instanceof z.ZodError ? JSON.stringify(error.errors) : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar el servidor WebSocket
  const wss = setupWebSocketServer(httpServer);
  
  return httpServer;
}
