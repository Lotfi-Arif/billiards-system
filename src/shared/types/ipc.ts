import { PoolTable, SessionType, TableStatus } from "@prisma/client";

export enum IpcChannels {
  TABLE_GET_ALL = "table:getAll",
  TABLE_GET_STATUS = "table:getStatus",
  TABLE_CREATE = "table:create",
  TABLE_OPEN = "table:open",
  TABLE_CLOSE = "table:close",
  TABLE_UPDATE = "table:update",
  TABLE_MAINTENANCE = "table:maintenance",
  AUTH_LOGIN = "auth:login",
  AUTH_LOGOUT = "auth:logout",
  AUTH_GET_CURRENT_USER = "auth:getCurrentUser",
}

export interface TableOperations {
  [IpcChannels.TABLE_GET_ALL]: {
    request: void;
    response: PoolTable[];
  };

  [IpcChannels.TABLE_GET_STATUS]: {
    request: { tableId: string };
    response: PoolTable;
  };

  [IpcChannels.TABLE_CREATE]: {
    request: {
      number: number;
    };
    response: PoolTable;
  };

  [IpcChannels.TABLE_OPEN]: {
    request: {
      tableId: string;
      userId: string;
      sessionType: SessionType;
      duration?: number;
    };
    response: PoolTable;
  };

  [IpcChannels.TABLE_CLOSE]: {
    request: {
      tableId: string;
      userId: string;
    };
    response: PoolTable;
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
    response: PoolTable;
  };

  [IpcChannels.TABLE_MAINTENANCE]: {
    request: {
      tableId: string;
      userId: string;
    };
    response: PoolTable;
  };

  [IpcChannels.AUTH_LOGIN]: {
    request: {
      email: string;
      password: string;
    };
    response: any;
  };

  [IpcChannels.AUTH_LOGOUT]: {
    request: void;
    response: void;
  };

  [IpcChannels.AUTH_GET_CURRENT_USER]: {
    request: void;
    response: any;
  };
}
