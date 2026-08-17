/**
 * Offline report submit queue — stores failed submissions locally and retries later.
 */

import {
  buildReportThreadId,
  EmergencyReportData,
  emergencyReportService,
  formatReportStatusLabel,
  mapIncidentTypeToReportType,
} from "@/services/api/emergency-report-service";
import {
  CHAT_THREAD_PREFIX,
  removeConversationThread,
  upsertConversationThread,
} from "@/utils/conversation-inbox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const REPORT_QUEUE_KEY = "pending-report-queue";
export const PENDING_SYNC_STATUS = "Pending sync";

export type QueuedReportSubmission = {
  localId: string;
  summary: string;
  details: string;
  severity: string;
  selectedType: string;
  incidentTypeLabel?: string;
  locationNote: string;
  latitude: number;
  longitude: number;
  icon: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  mediaUrl?: string;
  queuedAt: string;
  lastError?: string;
  retryCount: number;
};

export function buildReportDescription(input: {
  summary: string;
  details: string;
  severity: string;
  locationNote: string;
  incidentTypeLabel?: string;
}): string {
  return [
    input.summary.trim(),
    input.incidentTypeLabel ? `Incident Type: ${input.incidentTypeLabel}` : "",
    input.details.trim() ? `Details: ${input.details.trim()}` : "",
    `Severity: ${input.severity}`,
    input.locationNote ? `Location: ${input.locationNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildQueuedReportPayload(
  item: QueuedReportSubmission,
): EmergencyReportData {
  return {
    report_type: mapIncidentTypeToReportType(item.selectedType),
    description: buildReportDescription(item),
    latitude: item.latitude,
    longitude: item.longitude,
    user_id: item.userId,
    user_name: item.userName,
    user_email: item.userEmail,
    user_phone: item.userPhone,
    user_location: item.locationNote,
    severity: item.severity.toLowerCase() as 'low' | 'medium' | 'high',
    media_url: item.mediaUrl,
  };
}

export function isRetriableSubmitError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    if (!error.response) return true;
    if (error.code === "ECONNABORTED") return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    );
  }

  return false;
}

export function createPendingThreadId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueue(): Promise<QueuedReportSubmission[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORT_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedReportSubmission[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedReportSubmission[]): Promise<void> {
  await AsyncStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(items));
}

export async function getPendingReportQueue(): Promise<QueuedReportSubmission[]> {
  const items = await readQueue();
  return items.sort(
    (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
  );
}

export async function getPendingReportCount(): Promise<number> {
  const items = await getPendingReportQueue();
  return items.length;
}

export async function enqueueReportSubmission(
  input: Omit<QueuedReportSubmission, "localId" | "queuedAt" | "retryCount">,
): Promise<QueuedReportSubmission> {
  const item: QueuedReportSubmission = {
    ...input,
    localId: createPendingThreadId(),
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = await readQueue();
  queue.unshift(item);
  await writeQueue(queue);
  return item;
}

async function removeQueuedReport(localId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.localId !== localId));
}

export async function migratePendingThread(
  localId: string,
  reportId: number,
  meta: {
    title: string;
    category: string;
    status: string;
    icon: string;
    lastMessage?: string;
    updatedAt: string;
  },
): Promise<string> {
  const threadId = buildReportThreadId(reportId);
  const oldKey = `${CHAT_THREAD_PREFIX}${localId}`;
  const newKey = `${CHAT_THREAD_PREFIX}${threadId}`;

  try {
    const chatData = await AsyncStorage.getItem(oldKey);
    if (chatData) {
      await AsyncStorage.setItem(newKey, chatData);
      await AsyncStorage.removeItem(oldKey);
    }
  } catch {
    // non-blocking
  }

  await upsertConversationThread({
    id: threadId,
    title: meta.title,
    category: meta.category,
    status: meta.status,
    icon: meta.icon,
    lastMessage: meta.lastMessage,
    lastMessageFrom: "system",
    updatedAt: meta.updatedAt,
  });
  await removeConversationThread(localId);

  try {
    const lastRaw = await AsyncStorage.getItem("last-incident-chat");
    if (lastRaw) {
      const last = JSON.parse(lastRaw) as { id?: string };
      if (last.id === localId) {
        await AsyncStorage.setItem(
          "last-incident-chat",
          JSON.stringify({
            id: threadId,
            title: encodeURIComponent(meta.title),
            category: meta.category,
            status: meta.status,
            icon: meta.icon,
          }),
        );
      }
    }
  } catch {
    // non-blocking
  }

  return threadId;
}

export async function submitQueuedReport(
  item: QueuedReportSubmission,
): Promise<{ threadId: string; localId: string }> {
  const report = await emergencyReportService.submitReport(
    buildQueuedReportPayload(item),
  );
  if (!report.conversation_id) {
    throw new Error("The report was saved but no response conversation was created.");
  }

  const statusLabel = formatReportStatusLabel(report.status);
  const threadId = await migratePendingThread(item.localId, report.id, {
    title: item.summary.trim() || "Incident Report",
    category: "Alert",
    status: statusLabel,
    icon: item.icon,
    lastMessage: item.summary.trim() || "Incident Report",
    updatedAt: report.created_at ?? new Date().toISOString(),
  });
  await AsyncStorage.setItem(
    `conversation-${threadId}`,
    String(report.conversation_id),
  );

  await removeQueuedReport(item.localId);
  return { threadId, localId: item.localId };
}

export type FlushQueueResult = {
  synced: number;
  failed: number;
  lastError?: string;
};

export async function flushPendingReportQueue(): Promise<FlushQueueResult> {
  const queue = await getPendingReportQueue();
  if (!queue.length) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  let lastError: string | undefined;
  const remaining: QueuedReportSubmission[] = [];

  for (const item of queue) {
    try {
      await submitQueuedReport(item);
      synced += 1;
    } catch (error) {
      failed += 1;
      lastError =
        error instanceof Error ? error.message : "Failed to sync report.";
      remaining.push({
        ...item,
        retryCount: item.retryCount + 1,
        lastError,
      });
    }
  }

  await writeQueue(remaining);
  return { synced, failed, lastError };
}

export async function queuedReportToInboxThread(
  item: QueuedReportSubmission,
) {
  return upsertConversationThread({
    id: item.localId,
    title: item.summary.trim() || "Incident Report",
    category: "Alert",
    status: PENDING_SYNC_STATUS,
    icon: item.icon,
    lastMessage: item.lastError ?? item.summary.trim(),
    lastMessageFrom: "system",
    updatedAt: item.queuedAt,
  });
}
