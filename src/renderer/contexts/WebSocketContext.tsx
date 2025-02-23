// src/renderer/contexts/WebSocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { WebSocketMessage } from "@/shared/types/websocket";

// Export the interface
export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
  sendMessage: (message: WebSocketMessage) => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(
  null
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const subscribers = useRef<Set<(message: WebSocketMessage) => void>>(
    new Set()
  );

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket("ws://localhost:8080");

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = undefined;
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      ws.current = null;

      // Attempt to reconnect after 2 seconds
      reconnectTimeout.current = setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect();
      }, 2000);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.current?.close();
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        subscribers.current.forEach((callback) => callback(message));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const subscribe = (callback: (message: WebSocketMessage) => void) => {
    subscribers.current.add(callback);
    return () => {
      subscribers.current.delete(callback);
    };
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected, message not sent:", message);
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
