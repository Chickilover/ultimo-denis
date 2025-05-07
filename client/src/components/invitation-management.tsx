import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  UserPlus,
  Check,
  Clock,
  Home,
  X,
  AlertCircle,
} from "lucide-react";

// Tipo para las invitaciones
interface Invitation {
  code: string;
  username: string;
  expires: string;
  householdId: number | null;
  invitedUsername: string;
}

interface ReceivedInvitation {
  code: string;
  valid: boolean;
  inviter: {
    id: number;
    username: string;
    name: string;
  };
  householdId?: number;
}

interface InvitationManagementProps {
  sentInvitations?: Invitation[];
  receivedInvitations?: ReceivedInvitation[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function InvitationManagement({
  sentInvitations = [],
  receivedInvitations = [], 
  onRefresh,
  isLoading = false,
}: InvitationManagementProps) {
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const { toast } = useToast();

  // Formatear fecha de expiración
  const formatExpireDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  // Mutation para aceptar una invitación
  const acceptInvitationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/invitations/accept", { code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al aceptar la invitación");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Invitación aceptada",
        description: "Te has unido al hogar correctamente.",
      });
      
      // Actualizar la lista de invitaciones
      if (onRefresh) onRefresh();
      
      setProcessingInvitation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setProcessingInvitation(null);
    },
  });

  // Manejar aceptación de invitación
  const handleAcceptInvitation = (code: string) => {
    setProcessingInvitation(code);
    acceptInvitationMutation.mutate(code);
  };

  // Mutation para rechazar una invitación
  const rejectInvitationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/invitations/reject", { code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al rechazar la invitación");
      }
      return response.json();
    },
    onSuccess: () => {
      // Mostrar mensaje de éxito
      toast({
        title: "Invitación rechazada",
        description: "Has rechazado la invitación al hogar.",
      });
      
      // Actualizar la lista de invitaciones
      if (onRefresh) onRefresh();
      
      setProcessingInvitation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setProcessingInvitation(null);
    },
  });

  // Manejar rechazo de invitación
  const handleRejectInvitation = (code: string) => {
    setProcessingInvitation(code);
    rejectInvitationMutation.mutate(code);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sección de invitaciones recibidas */}
      {receivedInvitations && receivedInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Invitaciones Recibidas</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {receivedInvitations.map((invitation) => (
              <Card key={invitation.code} className="relative overflow-hidden">
                {processingInvitation === invitation.code && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Home className="h-5 w-5 mr-2 text-primary" />
                    Invitación a Hogar
                  </CardTitle>
                  <CardDescription>
                    De: <span className="font-medium">{invitation.inviter.name || invitation.inviter.username}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm">
                    Has sido invitado a unirte a un hogar. Acepta la invitación para colaborar en la gestión financiera familiar.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectInvitation(invitation.code)}
                    disabled={!!processingInvitation}
                  >
                    <X className="h-4 w-4 mr-1" /> Rechazar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvitation(invitation.code)}
                    disabled={!!processingInvitation}
                  >
                    <Check className="h-4 w-4 mr-1" /> Aceptar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sección de invitaciones enviadas */}
      {sentInvitations && sentInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Invitaciones Enviadas</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {sentInvitations.map((invitation) => (
              <Card key={invitation.code}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Invitación a {invitation.invitedUsername}</CardTitle>
                    <Badge variant="outline" className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                  </div>
                  <CardDescription>
                    Código: <span className="font-mono">{invitation.code}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Expira: {formatExpireDate(invitation.expires)}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(invitation.code);
                      toast({
                        title: "Código copiado",
                        description: "El código de invitación ha sido copiado al portapapeles.",
                      });
                    }}
                  >
                    Copiar código
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay invitaciones */}
      {(!sentInvitations || sentInvitations.length === 0) && 
       (!receivedInvitations || receivedInvitations.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay invitaciones</AlertTitle>
          <AlertDescription>
            No tienes invitaciones pendientes actualmente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}