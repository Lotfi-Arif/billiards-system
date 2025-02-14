import React from "react";

interface PricingCardProps {
  hourlyRate: number;
  currentCost: number;
  timeElapsed: number;
  extras?: Array<{ name: string; cost: number }>;
}

const PricingCard: React.FC<PricingCardProps> = ({
  hourlyRate,
  currentCost,
  timeElapsed,
  extras = [],
}) => {
  const totalExtras = extras.reduce((sum, item) => sum + item.cost, 0);
  const finalTotal = currentCost + totalExtras;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Session Pricing
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Hourly Rate</span>
          <span className="font-medium">${hourlyRate.toFixed(2)}/hr</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Time Cost</span>
          <span className="font-medium">${currentCost.toFixed(2)}</span>
        </div>

        {extras.length > 0 && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extras</h4>
              {extras.map((extra, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-600">{extra.name}</span>
                  <span>${extra.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-blue-600">${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCard;
