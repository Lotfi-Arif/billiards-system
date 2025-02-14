import React, { useState } from "react";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import GeneralSettings from "../components/settings/GeneralSettings";
import UserManagement from "../components/settings/UserManagement";
import PricingSetup from "../components/settings/PricingSetup";

const SettingsPage: React.FC = () => {
  const [activePage, setActivePage] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const renderContent = () => {
    switch (activePage) {
      case "general":
        return <GeneralSettings />;
      case "users":
        return <UserManagement />;
      case "pricing":
        return <PricingSetup />;
      case "tables":
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Table Configuration
            </h3>
            {/* Add table configuration content */}
          </div>
        );
      case "notifications":
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Notification Settings
            </h3>
            {/* Add notification settings content */}
          </div>
        );
      case "backup":
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Backup & Restore
            </h3>
            {/* Add backup and restore content */}
          </div>
        );
      default:
        return <GeneralSettings />;
    }
  };

  const handleSaveChanges = () => {
    // Save changes logic here
    setHasUnsavedChanges(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        {hasUnsavedChanges && (
          <div className="flex space-x-4">
            <button
              onClick={() => setHasUnsavedChanges(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="flex space-x-6">
        <SettingsSidebar
          activePage={activePage}
          onPageChange={(page) => {
            if (hasUnsavedChanges) {
              // Show confirmation dialog
              if (
                window.confirm(
                  "You have unsaved changes. Are you sure you want to leave?"
                )
              ) {
                setActivePage(page);
                setHasUnsavedChanges(false);
              }
            } else {
              setActivePage(page);
            }
          }}
        />

        <div className="flex-1">
          {renderContent()}

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Reset settings logic here
                if (
                  window.confirm(
                    "Are you sure you want to reset all settings to default?"
                  )
                ) {
                  // Implement reset logic
                }
              }}
              className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
