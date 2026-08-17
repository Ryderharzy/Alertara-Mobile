import { apiClient } from './api-config';

export type AlertFeedItem = {
  id: number;
  title: string;
  message: string;
  category: string;
  severity: string;
  createdAt: string;
};

export const alertFeedService = {
  async getActiveAlerts(): Promise<AlertFeedItem[]> {
    const response = await apiClient.get('/alerts/get_alerts.php');
    const payload = response.data;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.alerts)
          ? payload.alerts
          : [];
    return rows.map((row: any) => ({
      id: Number(row.id || 0),
      title: String(row.title || 'Emergency Alert').trim(),
      message: String(row.content || row.message || 'Open Alertara for safety information.').trim(),
      category: String(row.category || 'Emergency').trim(),
      severity: String(row.severity || 'high').trim().toLowerCase(),
      createdAt: String(row.created_at || row.updated_at || new Date().toISOString()),
    }));
  },
};
