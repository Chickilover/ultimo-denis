import { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

interface ShellProps {
  children: ReactNode;
}

export function ShellWithoutTransaction({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation - sin botón de transacción */}
      <MobileNav onOpenTransactionForm={() => {}} />
      
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />
      
      {/* Main Content - sin botón de transacción */}
      <main className="pt-16 pb-16 md:pb-0 md:pl-72">
        <div className="px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}