const NoteInfo = () => (
  <div
    className="note-info"
    style={{
      position: "absolute",
      bottom: "0.5em",
      left: "1em",
      lineHeight: "1.7em",
      fontFamily: "monospace",
      wordSpacing: "-0.2em",
      textShadow: "rgba(0, 0, 0, 0.7) 0 1px 2px",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      // padding: "1em 1em",
      // userSelect: 'none', // overlap by * pointerEvents: "none" *
      pointerEvents: "none"
    }}
  >
    <div>The X axis is red. The Y axis is green. The Z axis is blue.</div>
  </div>
);

export default NoteInfo;
