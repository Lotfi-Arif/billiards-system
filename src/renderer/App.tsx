import React, { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import ReservationsPage from "./pages/ReservationsPage";
import MainLayout from "./components/layout/MainLayout";
import SessionsPage from "./pages/SessionsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import { TableProvider } from "./contexts/TableContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "reservations":
        return <ReservationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "payments":
        return <PaymentsPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout onNavigate={setCurrentPage} currentPage={currentPage}>
      <WebSocketProvider url="ws://localhost:8080">
        <TableProvider>
          <div className="h-full">{renderPage()}</div>
        </TableProvider>
      </WebSocketProvider>
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
