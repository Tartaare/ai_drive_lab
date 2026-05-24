import { CameraControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import HUD from "components/HUD";
import { InfoRecordsProvider } from "components/HUD/InfoPanelContext";
import Scene from "components/Scene";
import { CameraIdProvider } from "components/scene-objects/CameraContext";
import { ControlsContext, useControls } from "hooks/useControls";
import { Suspense, useRef, useState } from "react";
import { Vector3 } from "three";
import "./styles.css";

const App = () => {
  // const [cameraFOV, setCameraFOV] = useState(75);
  const [cameraFOV, setCameraFOV] = useState(50);
  const [cameraPosition, setCameraPosition] = useState(
    new Vector3(9.55, 9.33, 15.0)
    // new Vector3(0.5, 2, 20.5)
  );
  const [cameraTarget, setCameraTarget] = useState(new Vector3(2.2, -3.6, 0.6));
  const CameraControlsRef = useRef<CameraControls>(null);

  const onChangeCamera = (e?: { [x: string]: any; type: "controlend" }) => {
    if (!e) {
      return;
    }

    const eventTarget = e.target as CameraControls;
    setCameraPosition(eventTarget.getPosition(new Vector3()));
    setCameraTarget(eventTarget.getTarget(new Vector3()));
  };

  const CanvasRef = useRef(null);
  const controls = useControls();

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw"
      }}
    >
      <ControlsContext.Provider value={controls}>
        <Suspense fallback={null}>
          <CameraIdProvider>
            <InfoRecordsProvider>
              <Canvas
                ref={CanvasRef}
                // shadows
                // shadows="basic"
                // shadows="percentage"
                shadows="soft"
                // shadows="variance"
                dpr={[1, 1.5]}
                camera={{
                  fov: cameraFOV
                }}
                gl={{ antialias: true }}
                // gl={{ antialias: true, logarithmicDepthBuffer: true }}
              >
                {/* <PerspectiveCamera
                makeDefault={currentCameraId === "static"}
                fov={cameraFOV}
                position={cameraPosition}
              /> */}

                <CameraControls
                  ref={CameraControlsRef}
                  onEnd={onChangeCamera}
                />
                <Scene
                  cameraControlsRef={CameraControlsRef}
                  cameraPosition={cameraPosition}
                  cameraTarget={cameraTarget}
                  cameraFOV={cameraFOV}
                />
              </Canvas>
              <HUD
                cameraPosition={cameraPosition}
                cameraTarget={cameraTarget}
              />
            </InfoRecordsProvider>
          </CameraIdProvider>
        </Suspense>
      </ControlsContext.Provider>
    </div>
  );
};

export default App;
