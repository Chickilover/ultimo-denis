import { z } from 'zod';

// Este es el esquema que tu formulario de React usará para validarse.
// Es una copia de la "forma" de los datos, pero sin ninguna dependencia del backend.
export const formTransactionSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida.'),
  amount: z.coerce.number().positive('El monto debe ser positivo.'),
  // ... añade aquí los otros campos de tu formulario
  // con las mismas validaciones que tenías en Drizzle/Zod.
});

// También puedes definir el tipo para usarlo en tu componente
export type FormTransaction = z.infer<typeof formTransactionSchema>;