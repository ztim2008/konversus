import "server-only";

export type ScanStage = "idle" | "search" | "audit" | "contacts" | "save" | "done" | "error";

export interface SourceStatus {
  status: "pending" | "running" | "done" | "error";
  count: number;
  error?: string;
}

export interface ScanProgress {
  radarId: string;
  stage: ScanStage;
  sources: {
    twogis: SourceStatus;
    google: SourceStatus;
  };
  current: number;
  total: number;
  message: string;
  error?: string;
  startedAt: number;
  sites?: Array<{
    domain: string;
    name: string;
    url: string;
    source: "2gis" | "google";
    phone?: string;
    email?: string;
  }>;
}

const progressStore = new Map<string, ScanProgress>();

export function createProgress(radarId: string): ScanProgress {
  const progress: ScanProgress = {
    radarId,
    stage: "idle",
    sources: {
      twogis: { status: "pending", count: 0 },
      google: { status: "pending", count: 0 },
    },
    current: 0,
    total: 0,
    message: "Ожидание запуска...",
    startedAt: Date.now(),
  };
  progressStore.set(radarId, progress);
  return progress;
}

export function updateProgress(radarId: string, update: Partial<ScanProgress>): ScanProgress | null {
  const current = progressStore.get(radarId);
  if (!current) return null;

  const updated = { ...current, ...update };
  if (update.sources) {
    updated.sources = { ...current.sources, ...update.sources };
  }
  progressStore.set(radarId, updated);
  return updated;
}

export function getProgress(radarId: string): ScanProgress | null {
  return progressStore.get(radarId) || null;
}

export function deleteProgress(radarId: string): void {
  progressStore.delete(radarId);
}
