import { useState } from "react";
import { useMutation, useQueryClient as useTanstackQueryClient } from "@tanstack/react-query"; // Renamed import
import { apiRequest } from "@/lib/queryClient"; // Removed queryClient from here
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { HouseholdInvitation } from "@shared/schema"; // Assuming a shared type for invitations

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Separator not used, consider removing
// import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  // UserPlus, // Not used
  Check,
  Clock,
  Home,
  X,
  AlertCircle,
} from "lucide-react";

// Using HouseholdInvitation from schema if it matches, or define specific local types
// For this example, let's assume `SentInvitationDisplay` and `ReceivedInvitationDisplay` are needed if schema type isn't direct match
export interface SentInvitationDisplay { // Based on original Invitation type
  code: string;
  // username: string; // Original had this, but typically you invite a username/email
  expires: string; // Date string
  householdId: number | null; // Might not be needed for display of sent
  invitedUsername: string; // Who was invited
  // status?: string; // If API provides status for sent invitations
}

export interface ReceivedInvitationDisplay { // Based on original ReceivedInvitation
  code: string;
  // valid: boolean; // Validity is usually determined on display or action, not stored this way
  inviter: {
    id: number;
    username: string;
    name: string;
  };
  householdId?: number; // ID of the household they are invited to
  householdName?: string; // Name of the household (desirable for display)
}

interface InvitationManagementProps {
  sentInvitations?: SentInvitationDisplay[];
  receivedInvitations?: ReceivedInvitationDisplay[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Define a common response type for accept/reject mutations
interface AcceptRejectInvitationResponse {
  success: boolean;
  message?: string;
  // Potentially other fields like updated user or household info
}

export function InvitationManagement({
  sentInvitations = [],
  receivedInvitations = [], 
  onRefresh,
  isLoading = false,
}: InvitationManagementProps) {
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useTanstackQueryClient(); // Use the hook

  const formatExpireDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Fecha inválida";
    return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const acceptInvitationMutation = useMutation<AcceptRejectInvitationResponse, Error, string>({ // Third generic is variables type (code: string)
    mutationFn: async (code: string) =>
      apiRequest<AcceptRejectInvitationResponse>("POST", "/api/invitations/accept", { code }),
    onSuccess: (data) => { // data is AcceptRejectInvitationResponse
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // User's householdId might change
      queryClient.invalidateQueries({ queryKey: ["/api/household"] });
      // Potentially invalidate a query for received invitations if this component fetches them itself
      // queryClient.invalidateQueries({ queryKey: ['/api/invitations/received'] });
      toast({
        title: "Invitación aceptada",
        description: data.message || "Te has unido al hogar correctamente.",
      });
      if (onRefresh) onRefresh();
      setProcessingInvitation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessingInvitation(null);
    },
  });

  const handleAcceptInvitation = (code: string) => {
    setProcessingInvitation(code);
    acceptInvitationMutation.mutate(code);
  };

  const rejectInvitationMutation = useMutation<AcceptRejectInvitationResponse, Error, string>({
    mutationFn: async (code: string) =>
      apiRequest<AcceptRejectInvitationResponse>("POST", "/api/invitations/reject", { code }),
    onSuccess: (data) => { // data is AcceptRejectInvitationResponse
      toast({
        title: "Invitación rechazada",
        description: data.message || "Has rechazado la invitación al hogar.",
      });
      if (onRefresh) onRefresh();
      setProcessingInvitation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessingInvitation(null);
    },
  });

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
      {receivedInvitations.length > 0 && (
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
                    Invitación a Hogar {invitation.householdName ? `"${invitation.householdName}"` : ""}
                  </CardTitle>
                  <CardDescription>
                    De: <span className="font-medium">{invitation.inviter.name || invitation.inviter.username}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm">
                    Has sido invitado a unirte a un hogar.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button size="sm" variant="outline" onClick={() => handleRejectInvitation(invitation.code)} disabled={!!processingInvitation || acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}>
                    <X className="h-4 w-4 mr-1" /> Rechazar
                  </Button>
                  <Button size="sm" onClick={() => handleAcceptInvitation(invitation.code)} disabled={!!processingInvitation || acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}>
                    <Check className="h-4 w-4 mr-1" /> Aceptar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sentInvitations.length > 0 && (
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
                      Pendiente {/* Or display actual status if available */}
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
                  <Button variant="secondary" size="sm" className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(invitation.code);
                      toast({ title: "Código copiado", description: "El código de invitación ha sido copiado." });
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

      {sentInvitations.length === 0 && receivedInvitations.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay invitaciones</AlertTitle>
          <AlertDescription>No tienes invitaciones pendientes actualmente.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}