// src/worlds/middle/Record.jsx
import { credsFor } from "./creds"

// The container itself carries nothing: Card writes a transform to it every
// frame, so the note's own tilt has to live on an inner element or it would be
// overwritten. See the wrapper below.
export const recordStyle = {}

const NOTE = {
  position: "relative",
  // Set down by hand, like the magnets above.
  transform: "rotate(-1.6deg)",
  background: "#f4f0e2",
  color: "#2f3336",
  padding: "1.15rem 1.15rem 1rem",
  fontFamily: "'Josefin Sans', sans-serif",
  fontSize: "0.72rem",
  letterSpacing: "0.08em",
  lineHeight: 1.9,
  boxShadow: "0 10px 22px rgba(0, 0, 0, 0.45)",
  // Torn from a pad: the top edge is clean, the rest is not quite square.
  borderRadius: "1px 2px 3px 2px",
}

// The magnet holding it up, seen head-on.
const MAGNET = {
  position: "absolute",
  top: "-9px",
  left: "50%",
  width: "18px",
  height: "18px",
  marginLeft: "-9px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 30%, #f2695c, #b5352b 70%)",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.45)",
}

export default function Record({ index }) {
  const c = credsFor(index)
  return (
    <div style={NOTE}>
      <div style={MAGNET} />
      <div
        style={{
          fontSize: "1rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "0.35rem",
        }}
      >
        {c.name}
      </div>
      <Row label="Age" value={`${c.age} yrs`} />
      <Row label="Breed" value={c.breed} />
      <Row label="Home" value={c.home} />
      <Row label="Feeds" value={c.feeds} />
      <Row label="Vet" value={c.vet} />
      <div
        style={{
          marginTop: "0.6rem",
          paddingTop: "0.5rem",
          borderTop: "1px dashed rgba(47, 51, 54, 0.35)",
          fontStyle: "italic",
          opacity: 0.85,
          letterSpacing: "0.04em",
          textTransform: "none",
        }}
      >
        {c.chore}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.5, textTransform: "uppercase" }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
