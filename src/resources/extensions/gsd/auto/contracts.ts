import type { GSDState } from "../types.js";

export interface AutoSessionContext {
  basePath: string;
  trigger: "guided-flow" | "resume" | "auto-loop" | "manual";
}

export interface AutoStatus {
  phase: "idle" | "running" | "paused" | "stopped" | "error";
  activeUnit?: {
    unitType: string;
    unitId: string;
  };
  lastTransitionAt?: number;
  transitionCount: number;
}

export interface AutoAdvanceResult {
  kind: "advanced" | "blocked" | "paused" | "stopped" | "error";
  reason?: string;
  stateSnapshot?: GSDState;
}

export interface AutoOrchestrationModule {
  start(sessionContext: AutoSessionContext): Promise<AutoAdvanceResult>;
  advance(): Promise<AutoAdvanceResult>;
  resume(): Promise<AutoAdvanceResult>;
  /** Optional while call sites migrate off stop("pause") semantics. */
  pause?(reason: string): Promise<AutoAdvanceResult>;
  stop(reason: string): Promise<AutoAdvanceResult>;
  getStatus(): AutoStatus;
}

export interface DispatchEvidence {
  matchedRule?: string;
  phase?: string;
  [key: string]: unknown;
}

export interface DispatchDecision {
  unitType: string;
  unitId: string;
  reason: string;
  preconditions: string[];
  evidence?: DispatchEvidence;
}

export interface DispatchAdapter {
  decideNextUnit(): Promise<DispatchDecision | null>;
}

export interface RecoveryDecision {
  action: "retry" | "pause" | "escalate" | "stop";
  reason: string;
  retryAfterMs?: number;
  isTransient?: boolean;
}

export interface RecoveryAdapter {
  classifyAndRecover(input: {
    error: unknown;
    unitType?: string;
    unitId?: string;
  }): Promise<RecoveryDecision>;
}

export interface WorktreeAdapter {
  prepareForUnit(unitType: string, unitId: string): Promise<void>;
  syncAfterUnit(unitType: string, unitId: string): Promise<void>;
  finalizeMilestoneTransition(input: {
    milestoneId: string;
    reason: string;
  }): Promise<void>;
  teardownMilestone(input: {
    milestoneId: string;
    preserveBranch?: boolean;
  }): Promise<void>;
  cleanupOnStop(reason: string): Promise<void>;
}

export interface HealthAdapter {
  preAdvanceGate(): Promise<{ allow: boolean; reason?: string }>;
  postAdvanceRecord(result: AutoAdvanceResult): Promise<void>;
}

export interface RuntimePersistenceAdapter {
  ensureLockOwnership(): Promise<void>;
  claimAndJournalDispatch(decision: DispatchDecision): Promise<{
    kind: "opened" | "already-active" | "stale-lease" | "skipped";
    dispatchId?: number;
    reason?: string;
  }>;
  journalTransition(event: {
    name: string;
    reason?: string;
    unitType?: string;
    unitId?: string;
  }): Promise<void>;
}

export interface NotificationAdapter {
  notifyLifecycle(event: {
    name: string;
    detail?: string;
  }): Promise<void>;
}

export interface AutoOrchestratorDeps {
  dispatch: DispatchAdapter;
  recovery: RecoveryAdapter;
  worktree: WorktreeAdapter;
  health: HealthAdapter;
  runtime: RuntimePersistenceAdapter;
  notifications: NotificationAdapter;
}
