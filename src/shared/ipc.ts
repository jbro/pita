export const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionSteer: "session.steer",
  sessionFollowUp: "session.followUp",
  sessionClearQueue: "session.clearQueue",
  sessionTimelineEvent: "session.timelineEvent",
  sessionPromptOverlaySubmit: "session.promptOverlaySubmit",
  sessionPromptOverlayCancel: "session.promptOverlayCancel",
  sessionPromptOverlayEvent: "session.promptOverlayEvent"
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

export interface PromptOverlayRequestEvent {
  type: "prompt_overlay_request";
  requestId: string;
  kind: "confirm";
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface PromptOverlayResolvedEvent {
  type: "prompt_overlay_resolved";
  requestId: string;
  status: "submitted" | "cancelled" | "expired";
}

export interface PromptOverlaySubmitRequest {
  requestId: string;
  decision: "confirm" | "cancel";
}

export interface PromptOverlayCancelRequest {
  requestId: string;
}

export type PromptOverlayEvent = PromptOverlayRequestEvent | PromptOverlayResolvedEvent;

export type SessionRendererEvent = SessionTimelineEvent | PromptOverlayEvent;

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
