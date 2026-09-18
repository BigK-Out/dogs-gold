// src/worlds/stray/Record.jsx
import { credsFor } from "./creds"

// The container itself carries nothing: Card writes a transform to it every
// frame, so the slip's own tilt has to live on an inner element or it would be
// overwritten. Same reason as the middle world's note.
export const recordStyle = {}

// A pound intake slip: cheap paper, carbon-copy blue-grey, filled in by
// whoever was on the desk. Monospaced because a form is typed, not written —
// the other worlds' documents use the page's own face, this one refuses it.
const SLIP = {
  position: "relative",
  transform: "rotate(0.8deg)",
  background: "#cfcabc",
  color: "#23262a",
  padding: "0.9rem 1rem 1.1rem",
  fontFamily: "'Courier New', ui-monospace, monospace",
  fontSize: "0.68rem",
  lineHeight: 1.75,
  letterSpacing: "0.02em",
  boxShadow: "0 10px 20px rgba(0, 0, 0, 0.5)",
  // Cut from a pad, never quite square.
  borderRadius: "1px 2px 1px 3px",
  overflow: "hidden",
}

const HEAD = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  borderBottom: "1px solid rgba(35, 38, 42, 0.45)",
  paddingBottom: "0.35rem",
  marginBottom: "0.5rem",
  fontSize: "0.58rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
}

// Stamped after the fact, across the form and over its own rules.
const STAMP = {
  position: "absolute",
  right: "-0.35rem",
  bottom: "1.6rem",
  transform: "rotate(-11deg)",
  border: "2px solid rgba(150, 38, 30, 0.72)",
  color: "rgba(150, 38, 30, 0.82)",
  padding: "0.1rem 0.4rem",
  fontSize: "0.72rem",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  // Worn, like a stamp on a pad that has run dry.
  opacity: 0.85,
}

export default function Record({ index }) {
  const c = credsFor(index)
  const outOfTime = c.remaining === 0

  return (
    <div style={SLIP}>
      <div style={HEAD}>
        <span>City Pound</span>
        <span>Intake</span>
      </div>

      <div style={{ fontSize: "1.05rem", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
        {c.tag}
      </div>

      <Row label="Age" value={c.age} />
      <Row label="Found" value={c.found} />
      <Row label="Condition" value={c.condition} />
      <Row label="Temper" value={c.temper} />
      <Row label="Held" value={c.days} />

      <div
        style={{
          marginTop: "0.55rem",
          paddingTop: "0.45rem",
          borderTop: "1px dashed rgba(35, 38, 42, 0.4)",
          color: outOfTime ? "rgba(150, 38, 30, 0.95)" : "inherit",
        }}
      >
        {outOfTime ? "Hold expired" : `${c.remaining} days to claim`}
      </div>

      {outOfTime && <div style={STAMP}>Unclaimed</div>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55, textTransform: "uppercase" }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
