import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import IncomePage from "@/pages/income-page";
import ExpensesPage from "@/pages/expenses-page";
import BudgetsPage from "@/pages/budgets-page";
import TransactionsPage from "@/pages/transactions-page";

// Páginas adicionales
import FamilyPage from "@/pages/family-page";
import SavingsPage from "@/pages/savings-page";
import ReportsPage from "@/pages/reports-page";
import ScannerPage from "@/pages/scanner-page";
import AdvisorPage from "@/pages/advisor-page";
import SettingsPage from "@/pages/settings-page";
import AccountsPage from "@/pages/accounts-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/income" component={IncomePage} />
      <ProtectedRoute path="/expenses" component={ExpensesPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/budgets" component={BudgetsPage} />
      <ProtectedRoute path="/family" component={FamilyPage} />
      <ProtectedRoute path="/savings" component={SavingsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/scanner" component={ScannerPage} />
      <ProtectedRoute path="/advisor" component={AdvisorPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/accounts" component={AccountsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <Router />
  );
}

export default App;
