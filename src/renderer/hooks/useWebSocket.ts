import { useContext, useEffect } from 'react';
import { WebSocketContext } from '../contexts/WebSocketContext';
import { WebSocketMessage } from '@shared/types/websocket';

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  useEffect(() => {
    return context.subscribe(onMessage);
  }, [context, onMessage]);

  return context;
};