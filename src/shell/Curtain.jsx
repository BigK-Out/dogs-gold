// src/shell/Curtain.jsx

// Opacity is driven by the shell's phase, not by transition events: a
// transitionend that never fires (backgrounded tab, unchanged opacity) would
// strand the user behind an opaque overlay.
export default function Curtain({ opaque, fadeMs }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        opacity: opaque ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease`,
        pointerEvents: "none",
        zIndex: 10000,
      }}
    />
  )
}
