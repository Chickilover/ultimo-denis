import { ShellWithoutTransaction } from "@/components/layout/shell-without-transaction";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, PlusCircle, Trash2, User, Users, Mail, Copy, Link as LinkIcon, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Schema para validar los datos del formulario
const familyMemberSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido").optional(),
  relationship: z.string().min(1, "La relación es obligatoria"),
  canAccess: z.boolean().default(false),
  avatarUrl: z.string().nullable().optional(),
});

type FamilyMember = {
  id: number;
  name: string;
  email?: string; // Campo opcional para email
  relationship: string;
  isActive: boolean;
  canAccess: boolean;
  avatarUrl: string | null;
  createdAt: string;
  userId: number;
};

// Interfaz para las invitaciones
type Invitation = {
  code: string;
  email: string;
  expires: string;
  householdId: number | null;
};

// Esquema para el formulario de invitación
const invitationSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export default function FamilyPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Obtener la lista de miembros familiares
  const { data: familyMembers, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/family-members');
      if (!response.ok) throw new Error('Error al obtener los miembros de la familia');
      return response.json();
    }
  });
  
  // Obtener invitaciones activas
  const { data: invitations, isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/invitations');
      if (!response.ok) throw new Error('Error al obtener las invitaciones');
      return response.json();
    }
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para actualizar un miembro familiar
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number, 
      data: z.infer<typeof familyMemberSchema> 
    }) => {
      const response = await apiRequest('PUT', `/api/family-members/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar el miembro familiar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro actualizado",
        description: "El miembro familiar ha sido actualizado correctamente."
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para eliminar un miembro familiar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/family-members/${id}`);
      if (!response.ok) {
        throw new Error('Error al eliminar el miembro familiar');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Miembro eliminado",
        description: "El miembro familiar ha sido eliminado correctamente."
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
  
  // Form para editar miembro
  const editForm = useForm<z.infer<typeof familyMemberSchema>>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      relationship: "",
      canAccess: false,
      avatarUrl: null,
    },
  });
  
  // Función para abrir el modal de edición
  const handleEditMember = (member: FamilyMember) => {
    setSelectedMember(member);
    editForm.reset({
      name: member.name,
      email: member.email || "", // Si existe email, lo usamos
      relationship: member.relationship,
      canAccess: member.canAccess,
      avatarUrl: member.avatarUrl,
    });
    setIsEditDialogOpen(true);
  };
  
  // Función para manejar el envío del formulario de añadir
  const onAddSubmit = (data: z.infer<typeof familyMemberSchema>) => {
    createMutation.mutate(data);
  };
  
  // Función para manejar el envío del formulario de edición
  const onEditSubmit = (data: z.infer<typeof familyMemberSchema>) => {
    if (selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    }
  };
  
  // Form para invitar
  const inviteForm = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Mutation para crear invitación
  const createInvitationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invitationSchema>) => {
      const response = await apiRequest('POST', '/api/invitations', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear la invitación');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setInvitationCode(data.code);
      setInvitationLink(data.link);
      toast({
        title: "Invitación creada",
        description: "Se ha generado un código de invitación."
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
    if (invitationCode) {
      navigator.clipboard.writeText(invitationCode);
      toast({
        title: "Código copiado",
        description: "El código de invitación ha sido copiado al portapapeles."
      });
    }
  };
  
  // Función para copiar el enlace al portapapeles
  const copyLinkToClipboard = () => {
    if (linkRef.current) {
      linkRef.current.select();
      document.execCommand('copy');
      toast({
        title: "Enlace copiado",
        description: "El enlace de invitación ha sido copiado al portapapeles."
      });
    }
  };
  
  // Función para enviar el formulario de invitación
  const onInviteSubmit = (data: z.infer<typeof invitationSchema>) => {
    createInvitationMutation.mutate(data);
  };

  // Función para eliminar un miembro
  const handleDeleteMember = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  return (
    <ShellWithoutTransaction>
      <PageHeader
        title="Mi Hogar"
        description="Administra los miembros de tu familia o grupo de convivencia"
        actions={
          <div className="flex space-x-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Invitar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invitar a un Usuario</DialogTitle>
                  <DialogDescription>
                    Envía una invitación a un usuario para unirse a tu hogar.
                  </DialogDescription>
                </DialogHeader>
                
                {!invitationCode ? (
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4 pt-4">
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="correo@ejemplo.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              La invitación será enviada a este correo electrónico.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createInvitationMutation.isPending}
                        >
                          {createInvitationMutation.isPending ? "Generando..." : "Generar Invitación"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4 pt-4">
                    <div className="rounded-md bg-muted p-4">
                      <div className="mb-3">
                        <Label>Código de invitación</Label>
                        <div className="flex mt-1.5">
                          <Input 
                            value={invitationCode} 
                            readOnly 
                            className="font-mono"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="ml-2"
                                  onClick={copyCodeToClipboard}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copiar código</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Enlace de invitación</Label>
                        <div className="flex mt-1.5">
                          <Input 
                            ref={linkRef}
                            value={invitationLink || ""} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="ml-2"
                                  onClick={copyLinkToClipboard}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copiar enlace</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Comparte este código o enlace con la persona a la que quieres invitar. El código será válido por 7 días.
                    </p>
                    
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setInvitationCode(null);
                          setInvitationLink(null);
                          inviteForm.reset();
                          setIsInviteDialogOpen(false);
                        }}
                      >
                        Listo
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Miembro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Miembro Familiar</DialogTitle>
                  <DialogDescription>
                    Introduce los datos del nuevo miembro familiar.
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
                            <Input placeholder="Nombre del miembro" {...field} />
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
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="correo@ejemplo.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Para enviar invitaciones si este miembro tendrá acceso a la aplicación.
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
                            <Input placeholder="Ej: Padre, Madre, Hijo, etc." {...field} />
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
                            <FormLabel>Permitir Acceso</FormLabel>
                            <FormDescription>
                              ¿Permitir que este miembro pueda acceder a la aplicación?
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
                        {createMutation.isPending ? "Añadiendo..." : "Añadir Miembro"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <Tabs defaultValue="members" className="w-full mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="invitations">Invitaciones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members">
          <div className="grid gap-6">
            {isLoading ? (
              <div className="p-8 text-center">Cargando miembros familiares...</div>
            ) : familyMembers && familyMembers.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {familyMembers.map((member) => (
                  <Card key={member.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {member.avatarUrl ? (
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                          ) : (
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {member.name}
                      </CardTitle>
                      <CardDescription>{member.relationship}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {member.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Correo:</span>
                          <span className="text-sm font-medium truncate max-w-[150px]">
                            {member.email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Acceso a la app:</span>
                        <span className="text-sm font-medium">
                          {member.canAccess ? "Permitido" : "No permitido"}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditMember(member)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará a {member.name} y no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-card text-card-foreground p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No hay miembros familiares</h3>
                <p className="text-muted-foreground mb-4">
                  Aún no has añadido ningún miembro a tu hogar. Añade a los miembros de tu familia o grupo de convivencia.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Miembro
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="invitations">
          <div className="grid gap-6">
            {invitations && invitations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map((invitation) => (
                  <Card key={invitation.code}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-5 w-5 text-primary" />
                        Invitación para {invitation.email}
                      </CardTitle>
                      <CardDescription>
                        Expira el {new Date(invitation.expires).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Código:</span>
                        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                          {invitation.code}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comparte este código con la persona a la que has invitado.
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(invitation.code);
                                toast({
                                  title: "Código copiado",
                                  description: "El código de invitación ha sido copiado al portapapeles."
                                });
                              }}
                              className="w-full"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Código
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copiar código de invitación</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-card text-card-foreground p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No hay invitaciones activas</h3>
                <p className="text-muted-foreground mb-4">
                  No tienes invitaciones activas. Crea una nueva invitación para que otros usuarios se unan a tu hogar.
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Crear Invitación
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Modal de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Miembro Familiar</DialogTitle>
            <DialogDescription>
              Modifica los datos del miembro familiar.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del miembro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="correo@ejemplo.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Para enviar invitaciones si este miembro tendrá acceso a la aplicación.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Padre, Madre, Hijo, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="canAccess"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Permitir Acceso</FormLabel>
                      <FormDescription>
                        ¿Permitir que este miembro pueda acceder a la aplicación?
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
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Actualizando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ShellWithoutTransaction>
  );
}