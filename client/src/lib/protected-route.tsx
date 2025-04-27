import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, verifyPinMutation } = useAuth();
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  const handleVerifyPin = async () => {
    try {
      const result = await verifyPinMutation.mutateAsync({ pin });
      if (result.valid) {
        setAuthenticated(true);
      } else {
        setPin("");
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      setPin("");
    }
  };
  
  return (
    <Route path={path}>
      {!authenticated ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <Card className="w-[350px]">
            <CardHeader>
              <CardTitle>Verificación de PIN</CardTitle>
              <CardDescription>
                Ingresa tu PIN para acceder a tu Hogar Financiero
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center my-4">
                <PinInput
                  value={pin}
                  onChange={setPin}
                  length={user.pin.length}
                  onComplete={handleVerifyPin}
                  type="number"
                  mask
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleVerifyPin} 
                disabled={pin.length !== user.pin.length || verifyPinMutation.isPending}
              >
                {verifyPinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
      <Component />
    </Route>
  );
}
