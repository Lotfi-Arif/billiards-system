import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface MainLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onNavigate,
  currentPage,
}) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onNavigate={onNavigate} currentPage={currentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
