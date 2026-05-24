import { useInfoRecords } from "./InfoPanelContext";

const InfoRecords = () => {
  const infoRecords = useInfoRecords();

  if (!infoRecords || !infoRecords.length) {
    return null;
  }

  return (
    <div
      className="info-records"
      style={{
        position: "absolute",
        // top: "50%",
        // translate: "0 -50%",
        top: "1em",
        left: "1em",
        right: "calc(310px + 1em)",
        lineHeight: "1.7em",
        fontFamily: "monospace",
        wordSpacing: "-0.2em",
        textShadow: "rgba(0, 0, 0, 0.7) 0 1px 2px",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        padding: "1em 1em",
        // userSelect: 'none',
        pointerEvents: "none",
        minWidth: "15em"
      }}
    >
      {infoRecords.map(
        ({ id, label, text, isActive }) =>
          isActive && (
            <div
              key={id}
              style={{
                marginBottom: "1em"
              }}
            >
              <div> {label}</div>
              <div> {text} </div>
            </div>
          )
      )}
    </div>
  );
};

export default InfoRecords;
