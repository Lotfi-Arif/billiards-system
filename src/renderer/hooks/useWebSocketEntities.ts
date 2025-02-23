import { useCallback } from "react";
import { TableWithSessions } from "@/shared/types/Table";
import { SessionData } from "@/shared/types/electronAPI";
import { WebSocketEvents } from "@/shared/types/websocket";
import { useWebSocket } from "./useWebSocket";

export const useTableUpdates = (
  callback: (table: TableWithSessions) => void
) => {
  const handleMessage = useCallback(
    (message: any) => {
      if (message.event === WebSocketEvents.TABLE_UPDATED) {
        callback(message.data as TableWithSessions);
      }
    },
    [callback]
  );

  useWebSocket(handleMessage);
};

export const useSessionUpdates = (callback: (session: SessionData) => void) => {
  const handleMessage = useCallback(
    (message: any) => {
      if (message.event === WebSocketEvents.SESSION_UPDATED) {
        callback(message.data as SessionData);
      }
    },
    [callback]
  );

  useWebSocket(handleMessage);
};

export const useReservationUpdates = (callback: (data: any) => void) => {
  const handleMessage = useCallback(
    (message: any) => {
      if (message.event === WebSocketEvents.RESERVATION_UPDATED) {
        callback(message.data);
      }
    },
    [callback]
  );

  useWebSocket(handleMessage);
};

export const usePrayerTimeUpdates = (callback: (data: any) => void) => {
  const handleMessage = useCallback(
    (message: any) => {
      if (message.event === WebSocketEvents.PRAYER_TIME_UPDATED) {
        callback(message.data);
      }
    },
    [callback]
  );

  useWebSocket(handleMessage);
};
