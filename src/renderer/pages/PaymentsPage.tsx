import React, { useState } from "react";
import PaymentForm from "../components/payments/PaymentForm";
import Receipt from "../components/payments/Receipt";
import TransactionHistory from "../components/payments/TransactionHistory";

const PaymentsPage: React.FC = () => {
  const [showReceipt, setShowReceipt] = useState(false);
  interface ReceiptData {
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
  }

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const handlePaymentSubmit = (paymentData: any) => {
    // Process payment and generate receipt
    setReceiptData({
      receiptNumber: "R" + Math.random().toString().slice(2, 6),
      timestamp: new Date(),
      tableNumber: paymentData.sessionId,
      duration: "2 hours",
      hourlyRate: 30,
      timeCost: 60,
      extras: [
        { name: "Cue Rental", cost: 5 },
        { name: "Drinks", cost: 8 },
      ],
      subtotal: 73,
      tax: 7.3,
      total: 80.3,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      change: paymentData.change,
    });
    setShowReceipt(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Payments</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Process Payment
            </h2>
            <PaymentForm
              sessionData={{
                id: 1,
                tableNumber: 3,
                duration: "2 hours",
                totalAmount: 80.3,
                extras: [
                  { name: "Cue Rental", cost: 5 },
                  { name: "Drinks", cost: 8 },
                ],
              }}
              onSubmit={handlePaymentSubmit}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                View Daily Report
              </button>
              <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                Export Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Receipt and Transaction History Section */}
        <div className="space-y-6">
          {showReceipt && receiptData && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Receipt</h2>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <Receipt receipt={receiptData} onPrint={() => window.print()} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Recent Transactions
            </h2>
            <TransactionHistory />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Today's Revenue</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">$1,234.56</p>
          <div className="text-sm text-green-600 mt-1">
            +12.3% from yesterday
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Pending Payments
          </h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">3</p>
          <div className="text-sm text-blue-600 mt-1">View details</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Average Transaction
          </h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">$45.82</p>
          <div className="text-sm text-gray-600 mt-1">
            Based on 27 transactions
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
