export interface CreateReservationDTO {
  tableId: string;
  startTime: Date;
  duration: number; // in hours
  customerName: string;
  phone: string;
  email?: string;
  notes?: string;
  numberOfPeople: number;
}

export interface UpdateReservationDTO {
  status?: string;
  startTime?: Date;
  duration?: number;
  customerName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  numberOfPeople?: number;
}

export interface Reservation {
  id: string;
  tableId: string;
  userId: string;
  startTime: Date;
  duration: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  numberOfPeople: number;
  createdAt: Date;
  updatedAt: Date;
  table?: {
    id: string;
    number: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface TableAvailability {
  [tableId: string]: {
    [timeSlot: string]: boolean;
  };
}
