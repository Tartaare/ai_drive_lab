import { Vector3 } from "three";

type CameraInfoProps = {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
};

const CameraInfo = ({ cameraPosition, cameraTarget }: CameraInfoProps) => {
  return (
    <div
      className="camera-info"
      style={{
        position: "absolute",
        bottom: "1em",
        right: "1em",
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
      <div style={{ marginBottom: "0.5em" }}>Camera</div>
      <div>
        <div style={{ marginTop: "0.5em", marginBottom: "0.1em" }}>
          Position:
        </div>
        <div>
          <div>x: {cameraPosition.x}</div>
          <div>y: {cameraPosition.y}</div>
          <div>z: {cameraPosition.z}</div>
        </div>
      </div>
      <div>
        <div style={{ marginTop: "0.5em", marginBottom: "0.1em" }}>Target:</div>
        <div>
          <div>x: {cameraTarget.x}</div>
          <div>y: {cameraTarget.y}</div>
          <div>z: {cameraTarget.z}</div>
        </div>
      </div>
    </div>
  );
};

export default CameraInfo;
