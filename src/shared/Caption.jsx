// The stacked "made with …" signature in the bottom-right corner. A world
// supplies its lines and colour; `elRef` is optional, for a world that reads
// the element back (shared/TextColorSampler recolours it).
//
// Pair it with a physics barrier over the same corner, or dogs drift under the
// text.
export default function Caption({ lines, color, elRef }) {
  return (
    <div
      ref={(el) => {
        if (elRef) elRef.current = el
      }}
      style={{
        position: "absolute",
        bottom: "2rem",
        right: "2.5rem",
        color,
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: "0.78rem",
        fontWeight: "400",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        transition: "color 0.5s ease",
        pointerEvents: "none",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: "1.8",
      }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  )
}
