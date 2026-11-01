import TeamManagement from "@/components/TeamManagement";
import PriceListManager from "@/components/PriceListManager";
import { getSessionUser } from "@/lib/session";

// AppLayout already renders this inside the authenticated shell, but the
// nav link to /team is hidden for non-admins — this is the defense-in-depth
// check for anyone who navigates here directly by URL.
export default async function TeamPage() {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return (
      <div className="wrap">
        <div className="panel placeholder-panel">
          <h2>Admins only</h2>
          <p>You don&apos;t have access to admin tools. Ask an admin if you need account or product price changes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TeamManagement currentUserId={user.id} />
      <PriceListManager />
    </>
  );
}
