import ReportsList from "@/components/ReportsList";
import { getSessionUser } from "@/lib/session";

export default async function ReportsPage() {
  const user = await getSessionUser();
  return <ReportsList canDelete={user?.role === "admin"} />;
}
