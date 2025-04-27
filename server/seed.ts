import { db } from "./db";
import { transactionTypes, accountTypes, categories } from "@shared/schema";

export async function seedDatabase() {
  try {
    // Check if transaction types already exist
    const existingTxTypes = await db.select().from(transactionTypes);
    if (existingTxTypes.length === 0) {
      console.log('Seeding transaction types...');
      await db.insert(transactionTypes).values([
        { id: 1, name: "Ingreso" },
        { id: 2, name: "Gasto" },
        { id: 3, name: "Transferencia" }
      ]);
    }

    // Check if account types already exist
    const existingAcctTypes = await db.select().from(accountTypes);
    if (existingAcctTypes.length === 0) {
      console.log('Seeding account types...');
      await db.insert(accountTypes).values([
        { id: 1, name: "Efectivo" },
        { id: 2, name: "Cuenta Corriente" },
        { id: 3, name: "Cuenta de Ahorro" },
        { id: 4, name: "Tarjeta de Crédito" },
        { id: 5, name: "Préstamo" },
        { id: 6, name: "Inversión" }
      ]);
    }

    // Check if categories already exist
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length === 0) {
      console.log('Seeding categories...');
      await db.insert(categories).values([
        { id: 1, name: "Ingresos", icon: "Banknote", color: "#22c55e", isIncome: true, isSystem: true, parentId: null },
        { id: 2, name: "Salario", icon: "Briefcase", color: "#22c55e", isIncome: true, isSystem: true, parentId: 1 },
        { id: 3, name: "Intereses", icon: "DollarSign", color: "#22c55e", isIncome: true, isSystem: true, parentId: 1 },
        { id: 4, name: "Gastos", icon: "Receipt", color: "#ef4444", isIncome: false, isSystem: true, parentId: null },
        { id: 5, name: "Alimentación", icon: "UtensilsCrossed", color: "#ef4444", isIncome: false, isSystem: true, parentId: 4 },
        { id: 6, name: "Vivienda", icon: "Home", color: "#3b82f6", isIncome: false, isSystem: true, parentId: 4 },
        { id: 7, name: "Transporte", icon: "Car", color: "#f59e0b", isIncome: false, isSystem: true, parentId: 4 },
        { id: 8, name: "Servicios", icon: "Lightbulb", color: "#8b5cf6", isIncome: false, isSystem: true, parentId: 4 },
        { id: 9, name: "Entretenimiento", icon: "Film", color: "#ec4899", isIncome: false, isSystem: true, parentId: 4 },
        { id: 10, name: "Salud", icon: "HeartPulse", color: "#06b6d4", isIncome: false, isSystem: true, parentId: 4 }
      ]);
    }
    
    console.log('Database seeding complete');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}