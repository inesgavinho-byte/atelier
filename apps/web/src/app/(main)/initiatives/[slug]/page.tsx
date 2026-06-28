import { redirect } from "next/navigation";
import { getInitiative } from "@/lib/mission";

export const dynamic = "force-dynamic";

export default async function InitiativeSlugRedirect({
  params,
}: {
  params: { slug: string };
}) {
  const ws = await getInitiative(params.slug);
  redirect(ws ? `/workspaces/${ws.slug}` : "/workspaces");
}
