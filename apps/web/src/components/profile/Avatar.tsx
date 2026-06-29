import { personalColour, initialsFrom } from "@/lib/profile-colors";

/**
 * Circular avatar used across the app (sidebar, chat, comments, decisions,
 * activity, mentions). Renders the uploaded photo when present, otherwise the
 * initials on the user's personal colour. Pass `symbol` for non-human
 * identities (e.g. DECIMUS uses the DECIMA glyph, never initials).
 */
export default function Avatar({
  name,
  avatarUrl,
  colour,
  symbol,
  initials,
  size = 38,
  status,
  className = "",
}: {
  name?: string | null;
  avatarUrl?: string | null;
  colour?: string | null;
  /** Glyph for non-human identities; overrides initials when set. */
  symbol?: React.ReactNode;
  initials?: string | null;
  size?: number;
  status?: string | null;
  className?: string;
}) {
  const c = personalColour(colour);
  const label = initials || initialsFrom(name);
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.36),
  };
  if (!avatarUrl && !symbol) {
    style.background = c.solid;
    style.color = c.text;
  }

  return (
    <span className={`av ${className}`} style={style} aria-hidden>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="av-img" />
      ) : symbol ? (
        <span className="av-symbol">{symbol}</span>
      ) : (
        label
      )}
      {status ? <span className={`av-status av-status-${status}`} /> : null}
    </span>
  );
}
