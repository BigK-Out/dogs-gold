// src/shell/Arrows.jsx

// The only clickable elements on a `cursor: none` page. The instrument above
// them is pointerEvents: none, so it never swallows the click.
//
// The colour is set by a TextColorSampler through `elRef`. It used to be white
// with mix-blend-mode: difference, which inverts to mid-grey over a mid-grey
// background — the silver dogs and rivers — and the label vanished.
export default function Arrows({ index, count, label, onGo, disabled, elRef }) {
  const atStart = index === 0
  const atEnd = index === count - 1

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        zIndex: 9997,
        userSelect: "none",
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "#ffffff",
        transition: "color 0.5s ease",
      }}
    >
      <Arrow
        dir="◀"
        onClick={() => onGo(-1)}
        disabled={disabled || atStart}
        aria-label="Previous world"
      />
      <span style={{ minWidth: "7rem", textAlign: "center" }}>{label}</span>
      <Arrow
        dir="▶"
        onClick={() => onGo(1)}
        disabled={disabled || atEnd}
        aria-label="Next world"
      />
    </div>
  )
}

function Arrow({ dir, onClick, disabled, ...rest }) {
  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: "none",
        color: "inherit",
        font: "inherit",
        fontSize: "1rem",
        lineHeight: 1,
        padding: "0.5rem",
        cursor: disabled ? "default" : "none",
        opacity: disabled ? 0.25 : 1,
        transition: "opacity 200ms ease",
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {dir}
    </button>
  )
}
