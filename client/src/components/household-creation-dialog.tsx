import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Home } from "lucide-react";

// Esquema para el formulario de hogar
const householdSchema = z.object({
  name: z.string().min(1, "El nombre del hogar es obligatorio"),
});

type HouseholdFormValues = z.infer<typeof householdSchema>;

interface HouseholdCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function HouseholdCreationDialog({
  open,
  onOpenChange,
  onSuccess,
  children,
}: HouseholdCreationDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Formulario para crear hogar
  const form = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: "",
    },
  });

  // Mutation para crear hogar
  const createHouseholdMutation = useMutation({
    mutationFn: async (data: HouseholdFormValues) => {
      const response = await apiRequest("POST", "/api/households", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear el hogar");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Hogar creado",
        description: "El hogar ha sido creado correctamente. Ahora puedes invitar a miembros.",
      });
      
      // Cerrar el diálogo
      form.reset();
      setError(null);
      onOpenChange(false);
      
      // Llamar al callback de éxito si existe
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manejar envío del formulario
  const onSubmit = (data: HouseholdFormValues) => {
    setError(null);
    createHouseholdMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear un Nuevo Hogar</DialogTitle>
          <DialogDescription>
            Crea un hogar para administrar tus finanzas familiares. Después podrás invitar a otros miembros.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del hogar</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Casa Fernández" 
                      {...field} 
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createHouseholdMutation.isPending}
                className="w-full"
              >
                {createHouseholdMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Home className="mr-2 h-4 w-4" />
                    Crear Hogar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}