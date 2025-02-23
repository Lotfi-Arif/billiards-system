import { TableWithSessions } from "@/shared/types/Table";
import { SessionData } from "@/shared/types/electronAPI";
import { WebSocketEvents } from "@shared/types/websocket";
import { useWebSocket } from "./useWebSocket";

export const useTableUpdates = (
  callback: (table: TableWithSessions) => void
) => {
  useWebSocket((message) => {
    if (message.event === WebSocketEvents.TABLE_UPDATED) {
      callback(message.data as TableWithSessions);
    }
  });
};

export const useSessionUpdates = (callback: (session: SessionData) => void) => {
  useWebSocket((message) => {
    if (message.event === WebSocketEvents.SESSION_UPDATED) {
      callback(message.data as SessionData);
    }
  });
};

export const useReservationUpdates = (callback: (data: any) => void) => {
  useWebSocket((message) => {
    if (message.event === WebSocketEvents.RESERVATION_UPDATED) {
      callback(message.data);
    }
  });
};

export const usePrayerTimeUpdates = (callback: (data: any) => void) => {
  useWebSocket((message) => {
    if (message.event === WebSocketEvents.PRAYER_TIME_UPDATED) {
      callback(message.data);
    }
  });
};
