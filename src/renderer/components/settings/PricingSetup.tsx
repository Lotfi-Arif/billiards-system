import React from "react";

const PricingSetup: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Standard Rates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate (Standard Tables)
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="number"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                defaultValue="30"
              />
              <span className="text-gray-500 ml-2">/hour</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate (Premium Tables)
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="number"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                defaultValue="45"
              />
              <span className="text-gray-500 ml-2">/hour</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Special Rates
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Happy Hour</h4>
              <p className="text-sm text-gray-500">
                Monday - Friday, 2 PM - 6 PM
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                className="w-24 p-2 border rounded-lg"
                defaultValue="20"
              />
              <span className="text-gray-500">/hour</span>
              <button className="text-blue-600 hover:text-blue-800">
                Edit
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Weekend Rate</h4>
              <p className="text-sm text-gray-500">
                Saturday - Sunday, All Day
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                className="w-24 p-2 border rounded-lg"
                defaultValue="35"
              />
              <span className="text-gray-500">/hour</span>
              <button className="text-blue-600 hover:text-blue-800">
                Edit
              </button>
            </div>
          </div>

          <button className="text-blue-600 hover:text-blue-800">
            + Add Special Rate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Additional Services
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Cue Rental</h4>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                className="w-24 p-2 border rounded-lg"
                defaultValue="5"
              />
              <span className="text-gray-500">/session</span>
            </div>
          </div>

          <button className="text-blue-600 hover:text-blue-800">
            + Add Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingSetup;
