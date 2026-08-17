import { Redirect } from "expo-router";

/**
 * Legacy route â€” report history now lives in the Messages tab inbox.
 */
export default function ReportHistoryScreen() {
  return <Redirect href="/(tabs)/report" />;
}

