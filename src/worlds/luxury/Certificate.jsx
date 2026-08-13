import { credsFor } from "./creds"

// The container's own appearance lives in the world config's `cardStyle`.
export const certificateStyle = {
  background: "rgba(10, 8, 0, 0.82)",
  border: "1px solid rgba(255, 224, 0, 0.35)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#ffe000",
  fontSize: "0.68rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  lineHeight: 2,
}

export default function Certificate({ index }) {
  const creds = credsFor(index)
  return (
    <>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
        {creds.name}
      </div>
      <Row label="Age" value={`${creds.age} yrs`} />
      <Row label="Origin" value={creds.location} />
      <Row label="Pedigree" value={creds.pedigree} />
      <Row label="Grade" value={creds.grade} />
      <Row label="Cert" value={creds.certificate} />
      <Row label="Value" value={creds.price} />
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
