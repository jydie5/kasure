import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { ViewerMenu } from "./viewer-menu";
import { isAdminEmail } from "@/lib/admin";

export async function ViewerSlot() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/auth/login" className="btn btn-sm" prefetch={false}>
        ログイン
      </Link>
    );
  }
  return <ViewerMenu name={viewer.name} email={viewer.email} isAdmin={isAdminEmail(viewer.email)} />;
}
