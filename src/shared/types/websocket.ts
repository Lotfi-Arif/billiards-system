export interface WebSocketMessage {
    event: string;
    data: any;
  }
  
  export interface WebSocketContextValue {
    isConnected: boolean;
    subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
    sendMessage: (message: WebSocketMessage) => void;
  }
  
  export enum WebSocketEvents {
    TABLE_UPDATED = 'TABLE_UPDATED',
    SESSION_UPDATED = 'SESSION_UPDATED',
    RESERVATION_UPDATED = 'RESERVATION_UPDATED',
    PRAYER_TIME_UPDATED = 'PRAYER_TIME_UPDATED',
    USER_UPDATED = 'USER_UPDATED'
  }