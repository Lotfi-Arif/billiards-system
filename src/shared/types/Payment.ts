/**
 * Represents a payment record.
 */
export interface Payment {
  id: number;
  sessionId: number;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enumeration of payment statuses.
 */
export enum PaymentStatus {
  PAID = "PAID",
  REFUNDED = "REFUNDED",
}

/**
 * Data Transfer Object for creating a new payment.
 */
export interface CreatePaymentDTO {
  sessionId: number;
  amount: number;
  paymentMethod: string;
}
