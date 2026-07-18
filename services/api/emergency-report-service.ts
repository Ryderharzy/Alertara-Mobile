/**
 * Emergency Report Service
 * Handles emergency report submission and retrieval
 */

import { apiClient } from './api-config';

export interface EmergencyReportData {
  report_type: 'crime' | 'fire' | 'medical' | 'traffic' | 'natural_disaster' | 'other';
  description: string;
  latitude?: number;
  longitude?: number;
  user_id?: number;
  media_url?: string;
}

export interface EmergencyReportResponse {
  id: number;
  user_id: number;
  report_type: string;
  description: string;
  latitude?: number;
  longitude?: number;
  status: string;
  media_url?: string;
  admin_notes?: string;
  created_at: string;
}

export type IncidentStatus = 'pending' | 'received' | 'in_progress' | 'resolved' | 'rejected';

export interface UpdateStatusData {
  report_id: number;
  status: IncidentStatus;
  admin_notes?: string;
}

export interface UpdateStatusResponse {
  report_id: number;
  status: IncidentStatus;
  admin_notes?: string;
}

type ApiBody = {
  success?: boolean;
  message?: string;
  data?: EmergencyReportResponse;
  reports?: EmergencyReportResponse[];
  id?: number;
  user_id?: number;
  report_type?: string;
  description?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status?: string;
  media_url?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  report_id?: number;
};

function parseReportRecord(
  body: ApiBody,
  fallback?: Partial<EmergencyReportData>,
): EmergencyReportResponse {
  const source = body.data ?? body;

  return {
    id: Number(source.id),
    user_id: Number(source.user_id ?? 0),
    report_type: String(source.report_type ?? fallback?.report_type ?? 'other'),
    description: String(source.description ?? fallback?.description ?? ''),
    latitude:
      source.latitude != null && source.latitude !== ''
        ? Number(source.latitude)
        : fallback?.latitude,
    longitude:
      source.longitude != null && source.longitude !== ''
        ? Number(source.longitude)
        : fallback?.longitude,
    status: String(source.status ?? 'pending'),
    media_url: source.media_url ?? undefined,
    admin_notes: source.admin_notes ?? undefined,
    created_at: String(source.created_at ?? new Date().toISOString()),
  };
}

function assertSuccess(body: ApiBody, fallbackMessage: string): void {
  if (body.success === false) {
    throw new Error(body.message ?? fallbackMessage);
  }
}

export function mapIncidentTypeToReportType(
  incidentType: string,
): EmergencyReportData['report_type'] {
  switch (incidentType) {
    case 'fire':
      return 'fire';
    case 'medical':
      return 'medical';
    case 'crime':
      return 'crime';
    case 'accident':
      return 'traffic';
    case 'flood':
      return 'natural_disaster';
    default:
      return 'other';
  }
}

export function buildReportThreadId(reportId: number): string {
  return `report-${reportId}`;
}

export function formatReportStatusLabel(status: string): string {
  switch (status.toLowerCase().replace(/\s+/g, "_")) {
    case "pending":
      return "Pending";
    case "received":
      return "Received";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "rejected":
      return "Rejected";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export const INCIDENT_STATUS_OPTIONS: IncidentStatus[] = [
  "pending",
  "received",
  "in_progress",
  "resolved",
  "rejected",
];

export function statusLabelToKey(label: string): IncidentStatus | null {
  const normalized = label.toLowerCase().replace(/\s+/g, "_");
  return INCIDENT_STATUS_OPTIONS.includes(normalized as IncidentStatus)
    ? (normalized as IncidentStatus)
    : null;
}

export function parseReportIdFromThreadId(threadId: string): number | null {
  if (!threadId.startsWith("report-")) {
    return null;
  }

  const reportId = Number.parseInt(threadId.slice("report-".length), 10);
  return Number.isNaN(reportId) ? null : reportId;
}

export function statusToTranslationKey(status: IncidentStatus): string {
  switch (status) {
    case "pending":
      return "status.pending";
    case "received":
      return "status.received";
    case "in_progress":
      return "status.inProgress";
    case "resolved":
      return "status.resolved";
    case "rejected":
      return "status.rejected";
  }
}

export const emergencyReportService = {
  /**
   * Submit a new emergency report
   */
  async submitReport(data: EmergencyReportData): Promise<EmergencyReportResponse> {
    try {
      const response = await apiClient.post<ApiBody>(
        '/reports/emergency_reports.php',
        data,
      );
      const body = response.data;
      assertSuccess(body, 'Failed to submit emergency report.');
      return parseReportRecord(body, data);
    } catch (error) {
      console.error('Failed to submit emergency report:', error);
      throw error;
    }
  },

  /**
   * Get emergency reports (optionally filtered by user_id)
   */
  async getReports(userId?: number): Promise<EmergencyReportResponse[]> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await apiClient.get<ApiBody>(
        '/reports/emergency_reports.php',
        { params },
      );
      const body = response.data;
      assertSuccess(body, 'Failed to fetch emergency reports.');
      if (Array.isArray(body.data)) {
        return body.data;
      }
      if (Array.isArray(body.reports)) {
        return body.reports;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch emergency reports:', error);
      throw error;
    }
  },

  /**
   * Update incident status
   */
  async updateStatus(data: UpdateStatusData): Promise<UpdateStatusResponse> {
    try {
      const response = await apiClient.put<ApiBody>(
        '/reports/emergency_reports.php',
        data,
      );
      const body = response.data;
      assertSuccess(body, 'Failed to update incident status.');
      const source = body.data ?? body;

      return {
        report_id: Number(source.report_id ?? data.report_id),
        status: (source.status ?? data.status) as IncidentStatus,
        admin_notes: source.admin_notes ?? data.admin_notes,
      };
    } catch (error) {
      console.error('Failed to update incident status:', error);
      throw error;
    }
  },
};
