import { User, PoolTable, Session, Reservation } from "./entities";

export interface DbRecord {
  id: number;
}

export interface UserRecord extends DbRecord {
  username: string;
  password: string;
  role: User["role"];
  created_at: string;
}

export interface TableRecord extends DbRecord {
  status: PoolTable["status"];
  current_session_id: number | null;
  last_maintained: string | null;
  staff_name?: string;
  session_start_time?: string;
}

export interface SessionRecord extends DbRecord {
  table_id: number;
  staff_id: number;
  customer_id: number | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  amount: number | null;
  status: Session["status"];
}

export interface ReservationRecord extends DbRecord {
  table_id: number;
  customer_id: number;
  customer_name?: string;
  staff_id: number;
  staff_name?: string;
  reservation_time: string;
  status: Reservation["status"];
}

export interface MaintenanceRecord extends DbRecord {
  table_id: number;
  staff_id: number;
  timestamp: string;
  notes: string;
}

export interface ActivityLogRecord extends DbRecord {
  entity_type: string;
  entity_id: number;
  action: string;
  performed_by: number;
  timestamp: string;
  details: string | null;
}

export interface MetricsQueryResult {
  count: number;
  average: number | null;
  total: number | null;
}

export interface StaffMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  totalRevenue: number;
  completionRate: number;
  customerSatisfaction: number;
}

export interface TableMetrics {
  totalHoursUsed: number;
  revenue: number;
  maintenanceCount: number;
  averageSessionDuration: number;
  popularTimeSlots: { hour: number; count: number }[];
}

export interface RevenueMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  yearToDate: number;
  compareLastPeriod: number;
}

export type SqliteParams = string | number | null | Buffer;
