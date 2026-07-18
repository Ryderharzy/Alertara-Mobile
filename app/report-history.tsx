import { Redirect } from "expo-router";

/**
 * Legacy route — report history now lives in the Messages tab inbox.
 */
export default function ReportHistoryScreen() {
  return <Redirect href="/(tabs)/messages" />;
}
