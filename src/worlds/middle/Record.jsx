// src/worlds/middle/Record.jsx
import { credsFor } from "./creds"

export const recordStyle = {
  background: "rgba(28, 26, 24, 0.88)",
  border: "1px solid rgba(220, 210, 190, 0.3)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#e8e2d6",
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
        {c.name}
      </div>
      <Row label="Age" value={`${c.age} yrs`} />
      <Row label="Breed" value={c.breed} />
      <Row label="Home" value={c.home} />
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
