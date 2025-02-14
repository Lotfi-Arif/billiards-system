import React from "react";

interface SettingsSidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activePage,
  onPageChange,
}) => {
  const menuItems = [
    { id: "general", icon: "⚙️", label: "General Settings" },
    { id: "users", icon: "👥", label: "User Management" },
    { id: "pricing", icon: "💰", label: "Pricing Setup" },
    { id: "tables", icon: "🎱", label: "Table Configuration" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "backup", icon: "💾", label: "Backup & Restore" },
  ];

  return (
    <div className="w-64 bg-white rounded-lg shadow-sm p-4">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onPageChange(item.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            activePage === item.id
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SettingsSidebar;
