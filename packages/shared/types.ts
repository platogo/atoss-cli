// Shared types between CLI and Extension

// Individual time entry (one start/end/type triplet)
export interface TimeEntry {
  start: string;
  end: string;
  type: string;
}

// Time tracking data for a full day
export interface DailyTimeData {
  date: string;
  entries: TimeEntry[];
  rawData?: string;
}

// Messages from Extension to Daemon
export type ExtensionMessage =
  | DataResponseMessage
  | ErrorMessage;

export interface DataResponseMessage {
  type: 'dataResponse';
  success: boolean;
  data?: DailyTimeData;
  error?: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

// Messages from Daemon to Extension
export type HostMessage = GetDataRequest;

export interface GetDataRequest {
  type: 'getData';
  date: string;
}
