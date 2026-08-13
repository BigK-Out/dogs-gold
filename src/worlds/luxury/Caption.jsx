import { captionRef } from "./captionRef"

export default function Caption() {
  return (
    <div
      ref={(el) => {
        captionRef.current = el
      }}
      style={{
        position: "absolute",
        bottom: "2rem",
        right: "2.5rem",
        color: "#ffe000",
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
      <span>made with</span>
      <span>gold, puppies</span>
      <span>and luxury</span>
    </div>
  )
}
