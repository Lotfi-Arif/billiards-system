import React, { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import ReservationsPage from "./pages/ReservationsPage";
import MainLayout from "./components/layout/MainLayout";
import SessionsPage from "./pages/SessionsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import { TableProvider } from "./contexts/TableContext";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("dashboard");

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
      <TableProvider>
        <div className="h-full">{renderPage()}</div>
      </TableProvider>
    </MainLayout>
  );
};

export default App;
