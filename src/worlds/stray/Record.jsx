// src/worlds/stray/Record.jsx
import { credsFor } from "./creds"

export const recordStyle = {
  background: "rgba(16, 17, 18, 0.88)",
  border: "1px solid rgba(150, 155, 160, 0.28)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#b9bec2",
  fontSize: "0.68rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  lineHeight: 2,
}

export default function Record({ index }) {
  const c = credsFor(index)
  return (
    <>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
        {c.tag}
      </div>
      <Row label="Age" value={c.age} />
      <Row label="Condition" value={c.condition} />
      <Row label="Unclaimed" value={c.days} />
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
