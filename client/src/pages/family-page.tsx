import { useState } from "react";
import { ShellWithoutTransaction } from "@/components/layout/shell-without-transaction";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { HouseholdManagement } from "@/components/household-management";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Schema para validar los datos del formulario
const familyMemberSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  relationship: z.string().min(1, "La relación es obligatoria"),
  canAccess: z.boolean().default(false),
  avatarUrl: z.string().nullable().optional(),
});

export default function FamilyPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Form para añadir miembro
  const addForm = useForm<z.infer<typeof familyMemberSchema>>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      relationship: "",
      canAccess: false,
      avatarUrl: null,
    },
  });
  
  // Mutation para crear un nuevo miembro familiar
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof familyMemberSchema>) => {
      const response = await apiRequest('POST', '/api/family-members', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear el miembro familiar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro añadido",
        description: "El miembro familiar ha sido añadido correctamente."
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Función para manejar el envío del formulario de añadir
  const onAddSubmit = (data: z.infer<typeof familyMemberSchema>) => {
    createMutation.mutate(data);
  };
  
  return (
    <ShellWithoutTransaction>
      <PageHeader
        title="Mi Hogar"
        description="Administra tu hogar y comparte gastos e ingresos con tu familia"
        actions={
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Añadir Miembro</span>
                  <span className="sm:hidden">Añadir</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Miembro Familiar</DialogTitle>
                  <DialogDescription>
                    Añade un miembro a tu familia. Los miembros pueden representar personas que no usan directamente la aplicación.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico (opcional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Si la persona no usa la aplicación, puedes dejar este campo en blanco.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relación</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Hijo/a, Pareja, Padre/Madre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="canAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Puede acceder a la aplicación</FormLabel>
                            <FormDescription className="text-xs">
                              Activa esta opción si este miembro también usará la aplicación.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? "Añadiendo..." : "Añadir miembro"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <div className="space-y-8">
        {/* Componente de gestión de hogares */}
        <HouseholdManagement />
      </div>
    </ShellWithoutTransaction>
  );
}