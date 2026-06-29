/** Chat-shaped skeleton for the workspace while its data resolves. */
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="A carregar o workspace">
      <div className="skel-row">
        <div className="skel-pill" />
        <div className="skel-pill" />
        <div className="skel-pill" />
        <div className="skel-grow" />
        <div className="skel-pill skel-w200" />
      </div>
      <div className="skel-chat">
        <div className="skel-bubble" />
        <div className="skel-bubble skel-bubble-short" />
        <div className="skel-bubble" />
      </div>
    </div>
  );
}
