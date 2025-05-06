
import { createContext, ReactNode, useContext, useState, useEffect, useCallback } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  loginWithReplit: () => void;
  isReplitEnvironment: boolean;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isReplitEnvironment, setIsReplitEnvironment] = useState(false);
  
  // Detectar si estamos en el entorno de Replit
  useEffect(() => {
    const hostname = window.location.hostname;
    const isReplit = hostname.includes('replit.dev') || hostname.includes('repl.co');
    console.log('Entorno de Replit detectado:', isReplit);
    setIsReplitEnvironment(isReplit);
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Sólo refrescar automáticamente si hay un usuario
    refetchInterval: (data) => data ? 5 * 60 * 1000 : false, // 5 minutos
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      navigate("/");
      toast({
        title: "Registro exitoso",
        description: `Bienvenido/a, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrarse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Si estamos en Replit, usar la ruta de logout de Replit
      if (isReplitEnvironment) {
        window.location.href = "/api/replit-logout";
        return;
      }
      
      // De lo contrario, usar la ruta estándar
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Función para iniciar sesión con Replit
  const loginWithReplit = useCallback(() => {
    if (isReplitEnvironment) {
      window.location.href = "/api/login";
    } else {
      toast({
        title: "Inicio de sesión con Replit",
        description: "Esta función solo está disponible en el entorno de Replit",
        variant: "destructive",
      });
    }
  }, [isReplitEnvironment, toast]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        loginWithReplit,
        isReplitEnvironment
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
