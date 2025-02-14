export enum IpcChannels {
  // User Management
  USER_LOGIN = "user:login",
  USER_CREATE = "user:create",

  // Table Management
  TABLE_GET_ALL = "table:getAll",
  TABLE_UPDATE_STATUS = "table:updateStatus",
  TABLE_MAINTENANCE = "table:maintenance",

  // Session Management
  SESSION_START = "session:start",
  SESSION_END = "session:end",

  // Reservation Management
  RESERVATION_CREATE = "reservation:create",
  RESERVATION_CONFIRM = "reservation:confirm",

  // Prayer Time Management
  PRAYER_GET_NEXT = "prayer:getNext",
  PRAYER_CHECK_TIME = "prayer:checkTime",

  // System Status
  SYSTEM_STATUS = "system:status",
}

export interface IpcHandlers {
  [IpcChannels.USER_LOGIN]: {
    request: { username: string; password: string };
    response: { id: number; username: string; role: string } | null;
  };
  // Add other handler types here...
}
