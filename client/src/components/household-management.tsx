import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { HouseholdCreationDialog } from "@/components/household-creation-dialog";
import { JoinHouseholdDialog } from "@/components/join-household-dialog";
import { 
  AlertCircle,
  Users, 
  Home, 
  UserPlus, 
  Plus, 
  Copy,
  LogOut 
} from "lucide-react";

type Household = {
  id: number;
  name: string;
  ownerId: number;
  code: string;
  createdAt: string;
};

type HouseholdMember = {
  id: number;
  name: string;
  userId: number;
  householdId: number;
  isOwner: boolean;
  createdAt: string;
};

export function HouseholdManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Obtener información del hogar
  const { data: household, isLoading: isLoadingHousehold } = useQuery({
    queryKey: ['/api/household'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/household');
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Usuario no tiene hogar
        }
        throw new Error('Error al obtener información del hogar');
      }
      return response.json();
    }
  });

  // Obtener miembros del hogar
  const { data: householdMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/household/members'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/household/members');
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No hay miembros o no hay hogar
        }
        throw new Error('Error al obtener los miembros del hogar');
      }
      return response.json();
    },
    enabled: !!household // Solo consultar si hay un hogar
  });

  // Mutation para dejar un hogar
  const leaveHouseholdMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/household/leave');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al abandonar el hogar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      toast({
        title: "Has abandonado el hogar",
        description: "Ya no formas parte de este hogar."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation para generar un código de invitación
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/household/code');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar el código');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Almacenar el código generado en una variable de estado
      if (data && data.code) {
        setInvitationCode(data.code);
      }
      
      // Actualizar la UI inmediatamente para mostrar el código generado
      toast({
        title: "Código generado",
        description: `Se ha generado un nuevo código de invitación: ${data.code}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Función para copiar el código al portapapeles
  const copyCodeToClipboard = () => {
    if (household?.code) {
      navigator.clipboard.writeText(household.code);
      toast({
        title: "Código copiado",
        description: "El código de invitación ha sido copiado al portapapeles."
      });
    }
  };

  // Función para manejar la acción de dejar el hogar
  const handleLeaveHousehold = () => {
    if (window.confirm("¿Estás seguro de que deseas abandonar este hogar? Perderás el acceso a todos los datos compartidos.")) {
      leaveHouseholdMutation.mutate();
    }
  };

  // Si el usuario no tiene un hogar, mostrar opciones para crear o unirse
  if (!household) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Hogar</CardTitle>
            <CardDescription>
              Un hogar te permite compartir gastos e ingresos con tu familia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 px-4 border rounded-lg space-y-4">
              <div className="rounded-full bg-muted p-4 mb-2">
                <Home className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-center">No tienes un hogar actualmente</h3>
              <p className="text-center text-muted-foreground max-w-md">
                Crea un hogar para gestionar finanzas familiares o únete a uno existente para compartir gastos e ingresos.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                <HouseholdCreationDialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/household'] });
                  }}
                >
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear un hogar
                  </Button>
                </HouseholdCreationDialog>

                <JoinHouseholdDialog
                  open={isJoinDialogOpen}
                  onOpenChange={setIsJoinDialogOpen}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/household'] });
                  }}
                >
                  <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Unirse a un hogar
                  </Button>
                </JoinHouseholdDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si el usuario tiene un hogar, mostrar información y miembros
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tu Hogar: {household.name}</CardTitle>
          <CardDescription>
            Información del hogar y miembros que lo componen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información del código de invitación */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-sm font-medium mb-2">Código de invitación</h3>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded flex-grow font-mono text-sm truncate">
                {invitationCode || household.code || "No hay código activo"}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const code = invitationCode || household?.code;
                  if (code) {
                    navigator.clipboard.writeText(code);
                    toast({
                      title: "Código copiado",
                      description: "El código de invitación ha sido copiado al portapapeles."
                    });
                  }
                }}
                disabled={!invitationCode && !household?.code}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar código</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Generar nuevo código</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Comparte este código con los miembros de tu familia para que puedan unirse a tu hogar.
            </p>
          </div>

          <Separator />

          {/* Lista de miembros */}
          <div>
            <h3 className="text-sm font-medium mb-3">Miembros del hogar</h3>
            {isLoadingMembers ? (
              <p className="text-sm text-muted-foreground">Cargando miembros...</p>
            ) : householdMembers && householdMembers.length > 0 ? (
              <div className="space-y-2">
                {householdMembers.map((member: HouseholdMember) => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.isOwner ? "Propietario" : "Miembro"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin miembros</AlertTitle>
                <AlertDescription>
                  No hay otros miembros en el hogar. Comparte el código de invitación para que se unan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLeaveHousehold}
            disabled={leaveHouseholdMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {leaveHouseholdMutation.isPending ? "Saliendo..." : "Abandonar hogar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}