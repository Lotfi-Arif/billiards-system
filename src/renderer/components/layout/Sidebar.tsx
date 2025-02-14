import React from "react";

const Sidebar = ({
  onNavigate,
  currentPage,
}: {
  onNavigate: (page: string) => void;
  currentPage: string;
}) => {
  const menuItems = [
    { icon: "🏠", name: "Dashboard", path: "dashboard" },
    { icon: "📅", name: "Reservations", path: "reservations" },
    { icon: "⏱️", name: "Active Sessions", path: "sessions" },
    { icon: "💰", name: "Payments", path: "payments" },
    { icon: "📊", name: "Reports", path: "reports" },
    { icon: "⚙️", name: "Settings", path: "settings" },
  ];

  return (
    <div className="bg-slate-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <div className="flex items-center justify-center space-x-2 px-4">
        <span className="text-2xl">🎱</span>
        <span className="text-xl font-bold">Billiards System</span>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              currentPage === item.path
                ? "bg-blue-500 text-white"
                : "text-gray-300 hover:bg-slate-700"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
