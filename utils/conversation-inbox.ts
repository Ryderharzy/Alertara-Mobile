/**
 * Unified conversation inbox — local thread index for the Messages screen.
 * Merges local AsyncStorage threads with server reports when a user is logged in.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildReportThreadId,
  emergencyReportService,
  EmergencyReportResponse,
  formatReportStatusLabel,
  IncidentStatus,
} from "@/services/api/emergency-report-service";
import {
  getPendingReportQueue,
  PENDING_SYNC_STATUS,
} from "@/utils/report-submit-queue";

export type ConversationSystemId =
  | "ecs"
  | "law"
  | "fire"
  | "traffic"
  | "response"
  | "general";

export type ConversationType = "incident" | "alert" | "general" | "inquiry";

export type ConversationThread = {
  id: string;
  title: string;
  category: string;
  systemId: ConversationSystemId;
  systemLabel: string;
  type: ConversationType;
  status?: string;
  icon?: string;
  lastMessage?: string;
  lastMessageFrom?: "user" | "bot" | "system";
  updatedAt: string;
  unreadCount?: number;
  reportId?: number;
  conversationId?: number;
};

type StoredChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
  sentAt: number;
};

export const INBOX_INDEX_KEY = "conversation-inbox-index";
export const LEGACY_INCIDENT_INDEX_KEY = "incident-chat-index";
export const CHAT_THREAD_PREFIX = "chat-thread-";
export const MAX_INBOX_THREADS = 50;
export const READ_MARK_PREFIX = "conversation-read-at-";

const SYSTEM_ACCENTS: Record<ConversationSystemId, string> = {
  ecs: "#16a34a",
  law: "#1abc9c",
  fire: "#e67e22",
  traffic: "#3498db",
  response: "#f1c40f",
  general: "#6366f1",
};

export const statusColors: Record<IncidentStatus, string> = {
  in_queue: "#14b8a6",
  pending: "#e3b341",
  pending_status: "#e3b341",
  received: "#3b82f6",
  dispatching: "#f59e0b",
  ongoing_dispatch: "#8b5cf6",
  in_progress: "#8b5cf6",
  resolved: "#2f9d63",
  completed: "#16a34a",
  rejected: "#ef4444",
};

export function isReportCompleted(status?: string): boolean {
  return status?.trim().toLowerCase().replace(/\s+/g, "_") === "completed";
}

export function getSystemAccent(systemId: ConversationSystemId): string {
  return SYSTEM_ACCENTS[systemId] ?? SYSTEM_ACCENTS.ecs;
}

export function resolveStatusColor(status?: string): string {
  if (!status) return "#9ca3af";
  if (status.toLowerCase() === PENDING_SYNC_STATUS.toLowerCase()) {
    return "#f59e0b";
  }
  const key = status.toLowerCase().replace(/\s+/g, "_") as IncidentStatus;
  return statusColors[key] ?? "#9ca3af";
}

export function resolveThreadMeta(
  category: string,
  threadId: string,
): Pick<ConversationThread, "systemId" | "systemLabel" | "type"> {
  if (threadId === "general") {
    return {
      systemId: "general",
      systemLabel: "General Support",
      type: "general",
    };
  }

  const cat = category.toLowerCase();

  if (cat.includes("fire")) {
    return {
      systemId: "fire",
      systemLabel: "Fire & Rescue",
      type: "incident",
    };
  }
  if (cat.includes("traffic")) {
    return {
      systemId: "traffic",
      systemLabel: "Traffic Management",
      type: "incident",
    };
  }
  if (cat.includes("crime") || cat.includes("law")) {
    return {
      systemId: "law",
      systemLabel: "Law Enforcement",
      type: "incident",
    };
  }
  if (cat.includes("weather")) {
    return {
      systemId: "ecs",
      systemLabel: "Emergency Communication",
      type: "alert",
    };
  }
  if (
    threadId.startsWith("incident-") ||
    threadId.startsWith("report-") ||
    threadId.startsWith("pending-")
  ) {
    return {
      systemId: "ecs",
      systemLabel: "Emergency Communication",
      type: "incident",
    };
  }
  if (cat.includes("alert")) {
    return {
      systemId: "ecs",
      systemLabel: "Emergency Communication",
      type: "alert",
    };
  }

  return {
    systemId: "ecs",
    systemLabel: "Emergency Communication",
    type: "inquiry",
  };
}

async function readInboxIndex(): Promise<ConversationThread[]> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConversationThread[];
  } catch {
    return [];
  }
}

async function writeInboxIndex(threads: ConversationThread[]): Promise<void> {
  await AsyncStorage.setItem(
    INBOX_INDEX_KEY,
    JSON.stringify(threads.slice(0, MAX_INBOX_THREADS)),
  );
}

export async function getLastMessagePreview(threadId: string): Promise<{
  lastMessage?: string;
  lastMessageFrom?: "user" | "bot" | "system";
  updatedAt?: string;
}> {
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_THREAD_PREFIX}${threadId}`);
    if (!raw) return {};
    const messages = JSON.parse(raw) as StoredChatMessage[];
    if (!messages.length) return {};
    const last = messages[messages.length - 1];
    return {
      lastMessage: last.text,
      lastMessageFrom: last.from,
      updatedAt: new Date(last.sentAt).toISOString(),
    };
  } catch {
    return {};
  }
}

type LegacyIncidentItem = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  icon?: string;
  status?: string;
};

async function migrateLegacyIncidentIndex(
  existing: ConversationThread[],
): Promise<ConversationThread[]> {
  const knownIds = new Set(existing.map((t) => t.id));
  const merged = [...existing];

  try {
    const raw = await AsyncStorage.getItem(LEGACY_INCIDENT_INDEX_KEY);
    if (!raw) return merged;
    const legacy = JSON.parse(raw) as LegacyIncidentItem[];
    for (const item of legacy) {
      if (knownIds.has(item.id)) continue;
      const meta = resolveThreadMeta(item.category, item.id);
      const preview = await getLastMessagePreview(item.id);
      merged.push({
        id: item.id,
        title: decodeURIComponent(item.title),
        category: item.category,
        ...meta,
        status: item.status,
        icon: item.icon,
        lastMessage: preview.lastMessage,
        lastMessageFrom: preview.lastMessageFrom,
        updatedAt: preview.updatedAt ?? item.updatedAt,
      });
      knownIds.add(item.id);
    }
  } catch {
    // ignore migration errors
  }

  return merged;
}

async function discoverThreadsFromStorage(
  existing: ConversationThread[],
): Promise<ConversationThread[]> {
  const knownIds = new Set(existing.map((t) => t.id));
  const merged = [...existing];

  try {
    const keys = await AsyncStorage.getAllKeys();
    const threadKeys = keys.filter((k) => k.startsWith(CHAT_THREAD_PREFIX));
    for (const key of threadKeys) {
      const threadId = key.replace(CHAT_THREAD_PREFIX, "");
      if (knownIds.has(threadId)) continue;

      const preview = await getLastMessagePreview(threadId);
      if (!preview.lastMessage) continue;

      const meta =
        threadId === "general"
          ? resolveThreadMeta("General", threadId)
          : resolveThreadMeta("Alert", threadId);

      merged.push({
        id: threadId,
        title:
          threadId === "general"
            ? "General Support"
            : `Conversation ${threadId.slice(0, 8)}`,
        category: threadId === "general" ? "General" : "Alert",
        ...meta,
        status: threadId === "general" ? "Active" : "Pending",
        icon: threadId === "general" ? "robot" : "exclamationmark.triangle",
        lastMessage: preview.lastMessage,
        lastMessageFrom: preview.lastMessageFrom,
        updatedAt: preview.updatedAt ?? new Date().toISOString(),
      });
      knownIds.add(threadId);
    }
  } catch {
    // ignore discovery errors
  }

  return merged;
}

function reportTypeToIcon(reportType: string): string {
  switch (reportType) {
    case "fire":
      return "flame";
    case "medical":
      return "bandage";
    case "crime":
      return "shield";
    case "traffic":
      return "car-sport";
    case "natural_disaster":
      return "drop";
    default:
      return "exclamationmark.triangle";
  }
}

function reportTypeToCategory(reportType: string): string {
  switch (reportType) {
    case "fire":
      return "Fire";
    case "natural_disaster":
      return "Weather";
    default:
      return "Alert";
  }
}

function reportToThreadTitle(description: string): string {
  const firstLine = description.split("\n")[0]?.trim();
  return firstLine || "Incident Report";
}

function serverReportToThread(report: EmergencyReportResponse): ConversationThread {
  const threadId = buildReportThreadId(report.id);
  const category = reportTypeToCategory(report.report_type);
  const meta = resolveThreadMeta(category, threadId);

  return {
    id: threadId,
    title: reportToThreadTitle(report.description),
    category,
    ...meta,
    status: formatReportStatusLabel(report.status),
    icon: reportTypeToIcon(report.report_type),
    lastMessage: reportToThreadTitle(report.description),
    lastMessageFrom: "system",
    updatedAt: report.created_at,
    reportId: report.id,
    conversationId: report.conversation_id,
  };
}

function pickLatestIso(dates: (string | undefined)[]): string {
  const valid = dates
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter((value) => !Number.isNaN(value));

  if (!valid.length) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...valid)).toISOString();
}

async function mergeServerReports(
  threads: ConversationThread[],
  options: { userId?: number; reportIds?: number[] },
): Promise<ConversationThread[]> {
  try {
    const reports = options.userId
      ? await emergencyReportService.getReports(options.userId)
      : await emergencyReportService.getReportsByIds(options.reportIds ?? []);
    const merged = new Map(threads.map((thread) => [thread.id, thread]));

    for (const report of reports) {
      const threadId = buildReportThreadId(report.id);
      if (report.conversation_id) {
        await AsyncStorage.setItem(
          `conversation-${threadId}`,
          String(report.conversation_id),
        );
      }
      const serverThread = serverReportToThread(report);
      const local = merged.get(threadId);
      const preview = await getLastMessagePreview(threadId);

      if (!local) {
        merged.set(threadId, {
          ...serverThread,
          lastMessage: preview.lastMessage ?? serverThread.lastMessage,
          lastMessageFrom: preview.lastMessageFrom ?? serverThread.lastMessageFrom,
          updatedAt: pickLatestIso([
            preview.updatedAt,
            serverThread.updatedAt,
          ]),
        });
        continue;
      }

      merged.set(threadId, {
        ...local,
        title: local.title || serverThread.title,
        category: local.category || serverThread.category,
        systemId: local.systemId ?? serverThread.systemId,
        systemLabel: local.systemLabel ?? serverThread.systemLabel,
        type: local.type ?? serverThread.type,
        status: serverThread.status,
        reportId: serverThread.reportId,
        conversationId: serverThread.conversationId,
        icon: local.icon ?? serverThread.icon,
        lastMessage:
          preview.lastMessage ?? local.lastMessage ?? serverThread.lastMessage,
        lastMessageFrom:
          preview.lastMessageFrom ??
          local.lastMessageFrom ??
          serverThread.lastMessageFrom,
        updatedAt: pickLatestIso([
          local.updatedAt,
          preview.updatedAt,
          serverThread.updatedAt,
        ]),
      });
    }

    return Array.from(merged.values());
  } catch (error) {
    console.warn("Server inbox sync failed:", error);
    return threads;
  }
}

async function mergePendingQueue(
  threads: ConversationThread[],
): Promise<ConversationThread[]> {
  try {
    const pending = await getPendingReportQueue();
    const merged = new Map(threads.map((thread) => [thread.id, thread]));

    for (const item of pending) {
      const preview = await getLastMessagePreview(item.localId);
      const meta = resolveThreadMeta("Alert", item.localId);
      const existing = merged.get(item.localId);

      merged.set(item.localId, {
        id: item.localId,
        title: item.summary.trim() || "Incident Report",
        category: "Alert",
        ...meta,
        status: PENDING_SYNC_STATUS,
        icon: item.icon,
        lastMessage:
          preview.lastMessage ??
          existing?.lastMessage ??
          item.summary.trim() ??
          item.lastError,
        lastMessageFrom:
          preview.lastMessageFrom ?? existing?.lastMessageFrom ?? "system",
        updatedAt: pickLatestIso([
          item.queuedAt,
          preview.updatedAt,
          existing?.updatedAt,
        ]),
      });
    }

    return Array.from(merged.values());
  } catch (error) {
    console.warn("Pending queue inbox merge failed:", error);
    return threads;
  }
}

export type LoadConversationInboxOptions = {
  userId?: number;
};

export async function loadConversationInbox(
  options?: LoadConversationInboxOptions,
): Promise<ConversationThread[]> {
  let threads = await readInboxIndex();
  threads = await migrateLegacyIncidentIndex(threads);
  threads = await discoverThreadsFromStorage(threads);
  threads = await mergePendingQueue(threads);

  if (options?.userId) {
    threads = await mergeServerReports(threads, { userId: options.userId });
  } else {
    const reportIds = threads
      .filter((thread) => thread.id.startsWith("report-"))
      .map((thread) => Number.parseInt(thread.id.slice("report-".length), 10))
      .filter((id) => Number.isFinite(id));
    if (reportIds.length) {
      threads = await mergeServerReports(threads, { reportIds });
    }
  }

  const enriched = await Promise.all(
    threads.map(async (thread) => {
      const preview = await getLastMessagePreview(thread.id);
      const mergedThread = {
        ...thread,
        title: thread.title.includes("%") ? decodeURIComponent(thread.title) : thread.title,
        lastMessage: preview.lastMessage ?? thread.lastMessage,
        lastMessageFrom: preview.lastMessageFrom ?? thread.lastMessageFrom,
        updatedAt: preview.updatedAt ?? thread.updatedAt,
      };
      return {
        ...mergedThread,
        unreadCount: (await isThreadUnread(mergedThread)) ? 1 : 0,
      };
    }),
  );
  enriched.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  await writeInboxIndex(enriched);

  return enriched;
}

export type UpsertThreadInput = {
  id: string;
  title: string;
  category: string;
  status?: string;
  icon?: string;
  lastMessage?: string;
  lastMessageFrom?: "user" | "bot" | "system";
  updatedAt?: string;
  reportId?: number;
  conversationId?: number;
};

export async function upsertConversationThread(
  input: UpsertThreadInput,
): Promise<ConversationThread> {
  const meta = resolveThreadMeta(input.category, input.id);
  const threads = await readInboxIndex();
  const now = input.updatedAt ?? new Date().toISOString();
  const safeTitle = input.title.includes("%")
    ? decodeURIComponent(input.title)
    : input.title;

  const nextThread: ConversationThread = {
    id: input.id,
    title: safeTitle,
    category: input.category,
    ...meta,
    status: input.status,
    icon: input.icon,
    lastMessage: input.lastMessage,
    lastMessageFrom: input.lastMessageFrom,
    updatedAt: now,
    reportId: input.reportId,
    conversationId: input.conversationId,
  };

  const filtered = threads.filter((t) => t.id !== input.id);
  const next = [nextThread, ...filtered].slice(0, MAX_INBOX_THREADS);
  await writeInboxIndex(next);

  // Keep legacy index in sync for incident threads during transition
  if (
    input.id.startsWith("incident-") ||
    input.id.startsWith("report-") ||
    input.id.startsWith("pending-")
  ) {
    try {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_INCIDENT_INDEX_KEY);
      const legacy: LegacyIncidentItem[] = legacyRaw ? JSON.parse(legacyRaw) : [];
      const legacyItem: LegacyIncidentItem = {
        id: input.id,
        title: encodeURIComponent(safeTitle),
        category: input.category,
        updatedAt: now,
        icon: input.icon,
        status: input.status,
      };
      const legacyNext = [
        legacyItem,
        ...legacy.filter((l) => l.id !== input.id),
      ].slice(0, 20);
      await AsyncStorage.setItem(
        LEGACY_INCIDENT_INDEX_KEY,
        JSON.stringify(legacyNext),
      );
    } catch {
      // non-blocking
    }
  }

  return nextThread;
}

export async function removeConversationThread(threadId: string): Promise<void> {
  const threads = await readInboxIndex();
  await writeInboxIndex(threads.filter((thread) => thread.id !== threadId));
}

export async function markConversationThreadRead(threadId: string): Promise<void> {
  await AsyncStorage.setItem(`${READ_MARK_PREFIX}${threadId}`, new Date().toISOString());
}

async function isThreadUnread(thread: ConversationThread): Promise<boolean> {
  if (thread.lastMessageFrom !== "bot") return false;
  try {
    const raw = await AsyncStorage.getItem(`${READ_MARK_PREFIX}${thread.id}`);
    if (!raw) return true;
    const readAt = new Date(raw).getTime();
    const updatedAt = new Date(thread.updatedAt).getTime();
    return Number.isFinite(updatedAt) && (!Number.isFinite(readAt) || updatedAt > readAt);
  } catch {
    return thread.lastMessageFrom === "bot";
  }
}

export async function deleteCompletedReportConversation(
  thread: ConversationThread,
  userId?: number,
): Promise<void> {
  if (!isReportCompleted(thread.status)) {
    throw new Error("Active reports cannot be deleted.");
  }

  const reportId = thread.reportId ?? (
    thread.id.startsWith("report-")
      ? Number.parseInt(thread.id.slice("report-".length), 10)
      : Number.NaN
  );
  if (userId && Number.isFinite(reportId)) {
    await emergencyReportService.deleteCompletedReport(reportId, userId);
  }

  await removeConversationThread(thread.id);
  await AsyncStorage.removeItem(`${CHAT_THREAD_PREFIX}${thread.id}`);
  await AsyncStorage.removeItem(`conversation-${thread.id}`);
}

export async function clearConversationInbox(): Promise<void> {
  const threads = await readInboxIndex();
  const hasActiveReport = threads.some(
    (thread) =>
      (thread.id.startsWith("report-") ||
        thread.id.startsWith("pending-") ||
        thread.id.startsWith("incident-")) &&
      !isReportCompleted(thread.status),
  );
  if (hasActiveReport) {
    throw new Error(
      "Active report conversations cannot be deleted until ERS marks them Completed.",
    );
  }
  await AsyncStorage.removeItem(INBOX_INDEX_KEY);
  await AsyncStorage.removeItem(LEGACY_INCIDENT_INDEX_KEY);
}

export function threadToChatParams(thread: ConversationThread) {
  return {
    id: thread.id,
    title: encodeURIComponent(thread.title),
    category: thread.category,
    status: thread.status ?? "Pending",
    icon: thread.icon ?? "exclamationmark.triangle",
  };
}

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(isoDate).toLocaleDateString();
}
