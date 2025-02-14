import React from "react";

interface ReceiptProps {
  receipt: {
    receiptNumber: string;
    timestamp: Date;
    tableNumber: number;
    duration: string;
    hourlyRate: number;
    timeCost: number;
    extras: Array<{ name: string; cost: number }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
  };
  onPrint?: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ receipt, onPrint }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
      {/* Receipt Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Complete Billiards System</h2>
        <p className="text-gray-600">Receipt #{receipt.receiptNumber}</p>
        <p className="text-sm text-gray-500">
          {receipt.timestamp.toLocaleString()}
        </p>
      </div>

      {/* Table Info */}
      <div className="border-t border-b py-4 mb-4">
        <div className="flex justify-between">
          <span>Table Number</span>
          <span>{receipt.tableNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration</span>
          <span>{receipt.duration}</span>
        </div>
        <div className="flex justify-between">
          <span>Rate</span>
          <span>${receipt.hourlyRate}/hr</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>Time Cost</span>
          <span>${receipt.timeCost.toFixed(2)}</span>
        </div>

        {receipt.extras.map((extra, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{extra.name}</span>
            <span>${extra.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${receipt.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${receipt.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${receipt.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-t mt-4 pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Payment Method</span>
          <span className="capitalize">{receipt.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid</span>
          <span>${receipt.amountPaid.toFixed(2)}</span>
        </div>
        {receipt.change > 0 && (
          <div className="flex justify-between">
            <span>Change</span>
            <span>${receipt.change.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-6">
        <p>Thank you for your business!</p>
      </div>

      {/* Print Button */}
      <button
        onClick={onPrint}
        className="mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Print Receipt
      </button>
    </div>
  );
};

export default Receipt;
