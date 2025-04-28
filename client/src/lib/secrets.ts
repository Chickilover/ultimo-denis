import { apiRequest } from "./queryClient";

/**
 * Verifica si las claves secretas solicitadas están disponibles
 * @param secretKeys Array de nombres de claves secretas a verificar
 * @returns Objeto con los resultados de la verificación (boolean para cada clave)
 */
export async function check_secrets(secretKeys: string[]): Promise<Record<string, boolean>> {
  try {
    const response = await apiRequest("POST", "/api/check-secrets", { secretKeys });
    return await response.json();
  } catch (error) {
    console.error("Error al verificar secretos:", error);
    // Retornar todos los secretos como no disponibles en caso de error
    return secretKeys.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
  }
}