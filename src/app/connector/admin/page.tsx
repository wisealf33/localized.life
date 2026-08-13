import { redirect } from "next/navigation";

export default function LegacyConnectorAdminPage() {
  redirect("/connections");
}
