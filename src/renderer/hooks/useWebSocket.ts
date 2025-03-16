import { useContext, useEffect } from "react";
import {
  WebSocketContext,
  WebSocketContextType,
} from "@renderer/contexts/WebSocketContext";
import { WebSocketMessage } from "@/shared/types/websocket";

export const useWebSocket = (
  onMessage?: (message: WebSocketMessage) => void
): WebSocketContextType => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }

  useEffect(() => {
    if (onMessage) {
      return context.subscribe(onMessage);
    }
  }, [context, onMessage]);

  return context;
};
