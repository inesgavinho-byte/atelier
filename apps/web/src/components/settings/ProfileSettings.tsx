"use client";

import { useRef, useState, useTransition } from "react";
import Avatar from "@/components/profile/Avatar";
import { PERSONAL_COLOURS, STATUS_OPTIONS } from "@/lib/profile-colors";
import type { UserProfile, WorkspaceIdentity } from "@/lib/profile";
import {
  updateProfile,
  uploadAvatar,
  removeAvatar,
  saveWorkspaceIdentity,
} from "@/app/(main)/settings/profile/actions";

type Tab =
  | "profile"
  | "appearance"
  | "decima"
  | "workspaces"
  | "security";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "appearance", label: "Aparência" },
  { key: "decima", label: "Preferências DECIMA" },
  { key: "workspaces", label: "Identidades de workspace" },
  { key: "security", label: "Segurança" },
];

const LANGUAGES = [
  { v: "pt-PT", l: "Português" },
  { v: "en", l: "English" },
  { v: "es", l: "Español" },
  { v: "fr", l: "Français" },
];
const TIMEZONES = [
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "America/New_York",
  "UTC",
];

function ColourPicker({
  value,
  onChange,
  allowInherit = false,
}: {
  value: string;
  onChange: (key: string) => void;
  allowInherit?: boolean;
}) {
  return (
    <div className="set-colours">
      {allowInherit ? (
        <button
          type="button"
          className={`set-colour set-colour-inherit${value === "" ? " active" : ""}`}
          onClick={() => onChange("")}
          title="Herdar do perfil"
          aria-label="Herdar do perfil"
        />
      ) : null}
      {PERSONAL_COLOURS.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`set-colour${value === c.key ? " active" : ""}`}
          style={{ background: c.solid }}
          onClick={() => onChange(c.key)}
          title={c.label}
          aria-label={c.label}
        />
      ))}
    </div>
  );
}

export default function ProfileSettings({
  profile,
  workspaces,
  identities,
}: {
  profile: UserProfile;
  workspaces: { id: string; name: string }[];
  identities: WorkspaceIdentity[];
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [form, setForm] = useState(profile);
  const [preview, setPreview] = useState<string | null>(profile.avatarUrl);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mime: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const flash = (ok: boolean, text: string) => setMsg({ ok, text });

  const save = (fields: (keyof UserProfile)[]) =>
    start(async () => {
      const patch: Record<string, string> = {};
      for (const f of fields) patch[f] = String(form[f] ?? "");
      const r = await updateProfile(patch);
      flash(r.ok, r.message);
      // Apply appearance live.
      if (r.ok) {
        if (fields.includes("theme") && form.theme !== "system") {
          document.documentElement.dataset.theme = form.theme;
        }
        if (fields.includes("interfaceDensity")) {
          document.documentElement.dataset.density = form.interfaceDensity;
        }
      }
    });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl); // immediate circular preview
      setPendingFile({ base64: dataUrl.split(",")[1] ?? "", mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = () => {
    if (!pendingFile) return;
    start(async () => {
      const r = await uploadAvatar(pendingFile);
      flash(r.ok, r.message);
      if (r.ok) {
        setPreview(r.avatarUrl ?? null);
        setPendingFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  };

  const clearAvatar = () =>
    start(async () => {
      const r = await removeAvatar();
      flash(r.ok, r.message);
      if (r.ok) {
        setPreview(null);
        setPendingFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });

  return (
    <div className="set">
      <nav className="set-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`set-nav-item${tab === t.key ? " active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setMsg(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="set-panel">
        {msg ? (
          <p className={`set-msg${msg.ok ? " ok" : " err"}`}>{msg.text}</p>
        ) : null}

        {/* ── Profile ─────────────────────────────────────────────── */}
        {tab === "profile" ? (
          <section className="set-section">
            <h2 className="set-title">Perfil</h2>

            <div className="set-avatar-row">
              <Avatar
                name={form.displayName}
                avatarUrl={preview}
                colour={form.personalColour}
                initials={form.initials}
                size={84}
              />
              <div className="set-avatar-actions">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={onPick}
                />
                <button
                  type="button"
                  className="action"
                  onClick={() => fileRef.current?.click()}
                >
                  Escolher fotografia
                </button>
                {pendingFile ? (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={saveAvatar}
                    disabled={busy}
                  >
                    {busy ? "A guardar…" : "Guardar fotografia"}
                  </button>
                ) : null}
                {preview ? (
                  <button
                    type="button"
                    className="action-quiet"
                    onClick={clearAvatar}
                    disabled={busy}
                  >
                    Remover
                  </button>
                ) : null}
                <p className="set-hint">JPG, PNG ou WebP · máx. 2 MB</p>
              </div>
            </div>

            <label className="set-field">
              <span className="set-label">Nome a apresentar</span>
              <input
                className="set-input"
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
              />
            </label>
            <div className="set-grid2">
              <label className="set-field">
                <span className="set-label">Primeiro nome</span>
                <input
                  className="set-input"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </label>
              <label className="set-field">
                <span className="set-label">Apelido</span>
                <input
                  className="set-input"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </label>
            </div>
            <label className="set-field">
              <span className="set-label">Cargo / título</span>
              <input
                className="set-input"
                value={form.roleTitle}
                onChange={(e) => set("roleTitle", e.target.value)}
              />
            </label>
            <label className="set-field">
              <span className="set-label">Bio curta</span>
              <textarea
                className="set-input"
                rows={3}
                value={form.shortBio}
                onChange={(e) => set("shortBio", e.target.value)}
              />
            </label>
            <div className="set-grid2">
              <label className="set-field">
                <span className="set-label">Idioma</span>
                <select
                  className="set-input"
                  value={form.preferredLanguage}
                  onChange={(e) => set("preferredLanguage", e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="set-field">
                <span className="set-label">Fuso horário</span>
                <select
                  className="set-input"
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="set-field">
              <span className="set-label">Estado</span>
              <div className="set-status">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`set-status-pill${form.status === s.key ? " active" : ""}`}
                    onClick={() => set("status", s.key)}
                  >
                    <span className="set-status-dot" style={{ background: s.dot }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                save([
                  "displayName",
                  "firstName",
                  "lastName",
                  "roleTitle",
                  "shortBio",
                  "preferredLanguage",
                  "timezone",
                  "status",
                ])
              }
              disabled={busy}
            >
              {busy ? "A guardar…" : "Guardar perfil"}
            </button>
          </section>
        ) : null}

        {/* ── Appearance ──────────────────────────────────────────── */}
        {tab === "appearance" ? (
          <section className="set-section">
            <h2 className="set-title">Aparência</h2>
            <div className="set-field">
              <span className="set-label">Cor pessoal</span>
              <ColourPicker
                value={form.personalColour}
                onChange={(k) => set("personalColour", k)}
              />
            </div>
            <div className="set-field">
              <span className="set-label">Densidade da interface</span>
              <div className="set-segment">
                {[
                  { v: "comfortable", l: "Confortável" },
                  { v: "compact", l: "Compacta" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`set-seg${form.interfaceDensity === o.v ? " active" : ""}`}
                    onClick={() => set("interfaceDensity", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="set-field">
              <span className="set-label">Tema</span>
              <div className="set-segment">
                {[
                  { v: "system", l: "Sistema" },
                  { v: "light", l: "Claro" },
                  { v: "dark", l: "Escuro" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`set-seg${form.theme === o.v ? " active" : ""}`}
                    onClick={() => set("theme", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => save(["personalColour", "interfaceDensity", "theme"])}
              disabled={busy}
            >
              {busy ? "A guardar…" : "Guardar aparência"}
            </button>
          </section>
        ) : null}

        {/* ── DECIMA preferences ──────────────────────────────────── */}
        {tab === "decima" ? (
          <section className="set-section">
            <h2 className="set-title">Preferências DECIMA</h2>
            <label className="set-field">
              <span className="set-label">Idioma das respostas</span>
              <select
                className="set-input"
                value={form.preferredLanguage}
                onChange={(e) => set("preferredLanguage", e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.l}
                  </option>
                ))}
              </select>
            </label>
            <div className="set-field">
              <span className="set-label">Estilo da resposta</span>
              <div className="set-segment">
                {[
                  { v: "concise", l: "Conciso" },
                  { v: "balanced", l: "Equilibrado" },
                  { v: "detailed", l: "Detalhado" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`set-seg${form.answerStyle === o.v ? " active" : ""}`}
                    onClick={() => set("answerStyle", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="set-field">
              <span className="set-label">Tom</span>
              <div className="set-segment">
                {[
                  { v: "direct", l: "Directo" },
                  { v: "editorial", l: "Editorial" },
                  { v: "technical", l: "Técnico" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`set-seg${form.answerTone === o.v ? " active" : ""}`}
                    onClick={() => set("answerTone", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="set-field">
              <span className="set-label">Modo DECIMUS por omissão</span>
              <div className="set-segment">
                {[
                  { v: "off", l: "Desligado" },
                  { v: "ask", l: "Perguntar" },
                  { v: "complex", l: "Em perguntas complexas" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`set-seg${form.defaultDecimusMode === o.v ? " active" : ""}`}
                    onClick={() => set("defaultDecimusMode", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                save([
                  "preferredLanguage",
                  "answerStyle",
                  "answerTone",
                  "defaultDecimusMode",
                ])
              }
              disabled={busy}
            >
              {busy ? "A guardar…" : "Guardar preferências"}
            </button>
          </section>
        ) : null}

        {/* ── Workspace identities ────────────────────────────────── */}
        {tab === "workspaces" ? (
          <section className="set-section">
            <h2 className="set-title">Identidades de workspace</h2>
            <p className="set-hint">
              Personaliza como apareces em cada workspace. Vazio = herda do perfil.
            </p>
            {workspaces.length === 0 ? (
              <p className="ctx-empty">Sem workspaces.</p>
            ) : (
              <div className="set-ws-list">
                {workspaces.map((w) => (
                  <WorkspaceIdentityRow
                    key={w.id}
                    workspace={w}
                    identity={identities.find((i) => i.workspaceId === w.id)}
                    profile={profile}
                    onSaved={flash}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ── Security (placeholder) ──────────────────────────────── */}
        {tab === "security" ? (
          <section className="set-section">
            <h2 className="set-title">Segurança</h2>
            <p className="set-hint">
              A autenticação por utilizador ainda não está activa — esta secção
              fica pronta para quando estiver.
            </p>
            <div className="set-secure">
              <div className="set-secure-row">
                <div>
                  <p className="set-secure-name">Palavra-passe</p>
                  <p className="set-secure-sub">Alterar a palavra-passe de acesso.</p>
                </div>
                <button type="button" className="action" disabled>
                  Em breve
                </button>
              </div>
              <div className="set-secure-row">
                <div>
                  <p className="set-secure-name">Autenticação de dois factores</p>
                  <p className="set-secure-sub">2FA por app autenticadora.</p>
                </div>
                <button type="button" className="action" disabled>
                  Em breve
                </button>
              </div>
              <div className="set-secure-row">
                <div>
                  <p className="set-secure-name">Sessões activas</p>
                  <p className="set-secure-sub">Gerir dispositivos com sessão iniciada.</p>
                </div>
                <button type="button" className="action" disabled>
                  Em breve
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceIdentityRow({
  workspace,
  identity,
  profile,
  onSaved,
}: {
  workspace: { id: string; name: string };
  identity?: WorkspaceIdentity;
  profile: UserProfile;
  onSaved: (ok: boolean, text: string) => void;
}) {
  const [displayName, setDisplayName] = useState(identity?.displayName ?? "");
  const [roleTitle, setRoleTitle] = useState(identity?.roleTitle ?? "");
  const [colour, setColour] = useState(identity?.personalColour ?? "");
  const [busy, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await saveWorkspaceIdentity({
        workspaceId: workspace.id,
        displayName,
        roleTitle,
        personalColour: colour,
      });
      onSaved(r.ok, r.message);
    });

  return (
    <div className="set-ws-card">
      <div className="set-ws-head">
        <Avatar
          name={displayName || profile.displayName}
          colour={colour || profile.personalColour}
          size={30}
        />
        <span className="set-ws-name">{workspace.name}</span>
      </div>
      <div className="set-grid2">
        <label className="set-field">
          <span className="set-label">Nome (override)</span>
          <input
            className="set-input"
            placeholder={profile.displayName}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="set-field">
          <span className="set-label">Cargo (override)</span>
          <input
            className="set-input"
            placeholder={profile.roleTitle}
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />
        </label>
      </div>
      <div className="set-field">
        <span className="set-label">Cor</span>
        <ColourPicker value={colour} onChange={setColour} allowInherit />
      </div>
      <button type="button" className="action btn-sm" onClick={save} disabled={busy}>
        {busy ? "A guardar…" : "Guardar"}
      </button>
    </div>
  );
}
