import React, { useState } from "react";

interface PaymentFormProps {
  sessionData: {
    id: number;
    tableNumber: number;
    duration: string;
    totalAmount: number;
    extras?: Array<{ name: string; cost: number }>;
  };
  onSubmit: (paymentData: any) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ sessionData, onSubmit }) => {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(
    sessionData.totalAmount.toString()
  );
  const [change, setChange] = useState(0);

  const handleAmountChange = (value: string) => {
    setAmountPaid(value);
    const paid = parseFloat(value) || 0;
    setChange(paid - sessionData.totalAmount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sessionId: sessionData.id,
      paymentMethod,
      amountPaid: parseFloat(amountPaid),
      change,
      timestamp: new Date(),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        Payment Details
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Number
            </label>
            <input
              type="text"
              value={sessionData.tableNumber}
              disabled
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <input
              type="text"
              value={sessionData.duration}
              disabled
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-4">
            {["cash", "card", "mobile"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`p-3 border rounded-lg text-sm font-medium transition-colors
                  ${
                    paymentMethod === method
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Due
            </label>
            <input
              type="text"
              value={`$${sessionData.totalAmount.toFixed(2)}`}
              disabled
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Paid
            </label>
            <input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {paymentMethod === "cash" && change >= 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-800 font-medium">
              Change Due: ${change.toFixed(2)}
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Complete Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
