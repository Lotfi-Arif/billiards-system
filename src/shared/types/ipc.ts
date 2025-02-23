import { PoolTable, SessionType, TableStatus, Session } from "@prisma/client";
import { TableWithSessions } from "@/shared/types/Table";
import { AuthResponse, CurrentUserResponse } from "@/shared/types/User";

export enum IpcChannels {
  // table
  TABLE_GET_ALL = "table:getAll",
  TABLE_GET_STATUS = "table:getStatus",
  TABLE_CREATE = "table:create",
  TABLE_OPEN = "table:open",
  TABLE_CLOSE = "table:close",
  TABLE_UPDATE = "table:update",
  TABLE_MAINTENANCE = "table:maintenance",
  TABLE_RESERVE = "table:reserve",

  // auth 
  AUTH_LOGIN = "auth:login",
  AUTH_LOGOUT = "auth:logout",
  AUTH_GET_CURRENT_USER = "auth:getCurrentUser",

  // Session operations
  SESSION_GET_ACTIVE = "session:getActive",
  SESSION_GET_BY_TABLE = "session:getByTable",
}

export interface TableOperations {
  [IpcChannels.TABLE_GET_ALL]: {
    request: void;
    response: TableWithSessions[];
  };
  [IpcChannels.TABLE_GET_STATUS]: {
    request: { tableId: string };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_CREATE]: {
    request: {
      number: number;
    };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_OPEN]: {
    request: {
      tableId: string;
      userId: string;
      sessionType: SessionType;
      duration?: number;
    };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_CLOSE]: {
    request: {
      tableId: string;
      userId: string;
    };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_UPDATE]: {
    request: {
      tableId: string;
      userId: string;
      data: {
        status?: TableStatus;
        isLightOn?: boolean;
      };
    };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_MAINTENANCE]: {
    request: {
      tableId: string;
      userId: string;
    };
    response: TableWithSessions;
  };
  [IpcChannels.TABLE_RESERVE]: {
    request: { tableId: string; userId: string; duration: number };
    response: TableWithSessions;
  };
  [IpcChannels.SESSION_GET_ACTIVE]: {
    request: void;
    response: Session[];
  };
  [IpcChannels.SESSION_GET_BY_TABLE]: {
    request: { tableId: string };
    response: Session[];
  };
  [IpcChannels.AUTH_LOGIN]: {
    request: {
      email: string;
      password: string;
    };
    response: AuthResponse;
  };
  [IpcChannels.AUTH_LOGOUT]: {
    request: void;
    response: void;
  };
  [IpcChannels.AUTH_GET_CURRENT_USER]: {
    request: void;
    response: CurrentUserResponse;
  };
}
