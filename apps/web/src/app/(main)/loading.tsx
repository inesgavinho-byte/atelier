/** Calm skeleton shown while a (main) page's data resolves. */
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="A carregar">
      <div className="skel-line skel-w40" />
      <div className="skel-line skel-w60" />
      <div className="skel-card" />
      <div className="skel-card" />
    </div>
  );
}
