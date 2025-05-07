import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, UserPlus } from "lucide-react";

// Esquema para el formulario de unirse a un hogar
const joinHouseholdSchema = z.object({
  code: z.string().min(1, "El código de invitación es obligatorio"),
});

type JoinHouseholdFormValues = z.infer<typeof joinHouseholdSchema>;

interface JoinHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function JoinHouseholdDialog({
  open,
  onOpenChange,
  onSuccess,
  children,
}: JoinHouseholdDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Formulario para unirse a un hogar
  const form = useForm<JoinHouseholdFormValues>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: {
      code: "",
    },
  });

  // Mutation para unirse a un hogar
  const joinHouseholdMutation = useMutation({
    mutationFn: async (data: JoinHouseholdFormValues) => {
      const response = await apiRequest("POST", "/api/join-household", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al unirse al hogar");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Te has unido al hogar",
        description: "Ahora puedes compartir gastos e ingresos con los miembros de este hogar.",
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
  const onSubmit = (data: JoinHouseholdFormValues) => {
    setError(null);
    joinHouseholdMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unirse a un Hogar</DialogTitle>
          <DialogDescription>
            Introduce el código de invitación para unirte a un hogar existente y compartir gastos e ingresos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de invitación</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingresa el código de invitación" 
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
                disabled={joinHouseholdMutation.isPending}
                className="w-full"
              >
                {joinHouseholdMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uniéndose...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Unirse al Hogar
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