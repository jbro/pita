export const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionTimelineEvent: "session.timelineEvent"
} as const;

export type SessionRunState = "idle" | "running" | "aborting" | "error";

export type SessionTimelineEvent =
  | { type: "state"; state: SessionRunState }
  | { type: "response.start"; messageId: string }
  | { type: "response.chunk"; messageId: string; chunk: string }
  | { type: "response.end"; messageId: string }
  | { type: "response.abort" }
  | { type: "error"; message: string };

export interface SessionSendPromptRequest {
  text: string;
}
