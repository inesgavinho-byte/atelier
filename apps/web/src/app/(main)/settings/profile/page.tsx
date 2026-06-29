import Link from "next/link";
import ProfileSettings from "@/components/settings/ProfileSettings";
import { getProfile, getWorkspaceIdentities } from "@/lib/profile";
import { getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const [profile, identities, initiatives] = await Promise.all([
    getProfile(),
    getWorkspaceIdentities(),
    getInitiatives(),
  ]);

  const workspaces = initiatives
    .filter((w) => w.id)
    .map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="set-page">
      <Link href="/" className="action-quiet mb-6 inline-block">
        ← Início
      </Link>
      <header className="set-page-head">
        <h1 className="set-page-title">Definições</h1>
        <p className="set-page-sub">A tua identidade na DECIMA.</p>
      </header>

      <ProfileSettings
        profile={profile}
        workspaces={workspaces}
        identities={identities}
      />
    </div>
  );
}
