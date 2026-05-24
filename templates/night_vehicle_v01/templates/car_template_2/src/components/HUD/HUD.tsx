import KeymapInfo from "./KeymapInfo";
import CameraInfo from "./CameraInfo";
import { useContext } from "react";
import { Vector3 } from "three";
import { ControlsContext, useControls } from "hooks/useControls";
import InfoRecords from "./InfoRecords";

type ScreenInterfaceProps = {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
};

const HUD = ({ cameraPosition, cameraTarget }: ScreenInterfaceProps) => {
  const { showCameraInfo } = useControls();
  // const { showCameraInfo } = useContext(ControlsContext);

  return (
    <>
      <InfoRecords />
      <KeymapInfo />
      {showCameraInfo && (
        <CameraInfo
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
        />
      )}
    </>
  );
};

export default HUD;
