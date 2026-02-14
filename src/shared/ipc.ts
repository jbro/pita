export const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionSteer: "session.steer",
  sessionFollowUp: "session.followUp",
  sessionClearQueue: "session.clearQueue",
  sessionTimelineEvent: "session.timelineEvent"
} as const;

export type SessionRunState = "idle" | "running" | "aborting" | "error";

export type SessionTimelineEvent =
  | { type: "state"; state: SessionRunState }
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "response.abort" }
  | { type: "error"; message: string }
  | { type: "queue.status"; steerCount: number; followUpCount: number };

export interface SessionSendPromptRequest {
  text: string;
}

export interface SessionSteerRequest {
  text: string;
}

export interface SessionFollowUpRequest {
  text: string;
}

export interface SessionClearQueueResponse {
  steering: string[];
  followUp: string[];
}
