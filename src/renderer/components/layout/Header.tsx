import React from "react";

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button className="md:hidden">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            Pool Hall Manager
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <span>🔔</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Admin</span>
            <div className="h-8 w-8 rounded-full bg-gray-300"></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
