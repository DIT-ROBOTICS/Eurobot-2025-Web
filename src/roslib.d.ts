// Type definitions for ROSLIB
interface ROSLIBMessage {
  data: any;
}

interface ROSLIBTopic {
  name: string;
  messageType: string;
  ros: ROSLIB.Ros;
  subscribe(callback: (message: ROSLIBMessage) => void): void;
  unsubscribe(): void;
}

interface ROSLIBEvent {
  on(eventName: string, callback: (data?: any) => void): void;
  close(): void;
}

declare namespace ROSLIB {
  class Ros implements ROSLIBEvent {
    constructor(options: { url: string });
    on(eventName: string, callback: (data?: any) => void): void;
    close(): void;
  }

  class Topic {
    constructor(options: { ros: ROSLIB.Ros; name: string; messageType: string });
    subscribe(callback: (message: ROSLIBMessage) => void): void;
    unsubscribe(): void;
  }
}

interface Window {
  ROSLIB: typeof ROSLIB;
} 