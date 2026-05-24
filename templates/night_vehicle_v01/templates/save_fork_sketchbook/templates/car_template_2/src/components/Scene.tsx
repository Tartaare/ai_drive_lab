import {
  CameraControls,
  Environment,
  OrbitControls,
  Stats
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import PhysicsScene from "components/PhysicsScene";
import { ControlsContext, useControls } from "hooks/useControls";
import { useIsFirstRender } from "hooks/useIsFirstRender";
import { Perf } from "r3f-perf";
import {
  RefObject,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { ArrowHelper, ColorRepresentation, Vector3, VSMShadowMap } from "three";
import { PerspectiveCamera } from "@react-three/drei";
import { Debug as CannonDebugger, Physics } from "use-cannon";
import { useCameraId } from "./scene-objects/CameraContext";
// import { EffectComposer, Bloom } from "@react-three/postprocessing";

export const DebuggerColorIdByName = {
  Black: 1 as const,
  White: 2 as const,
  Green: 3 as const
};

export const DebuggerColorNamessById = [
  "Black" as const, // 0 index
  "Black" as const, // 1 index
  "White" as const, // 2 index
  "Green" as const // 3 index
];

// todo
// type DebuggerColorsByNameValues = typeof DebuggerColorsByName[ColorKeys];
// export const DebuggerColorsById: {
//   [key in DebuggerColorsByNameValues]: ColorKeys;
// } = Object.fromEntries(
//   Object.entries(DebuggerColorsByName).map((entry) => entry.reverse())
// );

const Colors = {
  Black: "#000000" as const,
  White: "#ffffff" as const,
  Green: "#00ff00" as const
};

type ColorKeys = keyof typeof Colors;
type ColorValues = typeof Colors[ColorKeys];

type DayTime = "morning" | "day" | "evening" | "night";
const DayTimes = {
  morning: "morning" as const,
  day: "day" as const,
  evening: "evening" as const,
  night: "night" as const
};

type SceneProps = {
  cameraControlsRef: RefObject<CameraControls>;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  cameraFOV: number;
};

const Scene = ({
  cameraControlsRef,
  cameraPosition = new Vector3(),
  cameraTarget = new Vector3(),
  cameraFOV = 50
}: SceneProps) => {
  const currentCameraId = useCameraId();

  // const controls = useControls();
  // const controls = useContext(ControlsContext);
  const {
    isActiveCannonDebugger,
    cannonDebuggerColorIndex,
    showFPSStats,
    showPerfomanceInfo
  } = useControls();
  // } = controls;

  const [
    isActiveCurrentCannonDebuggerState,
    setIsActiveCurrentCannonDebuggerState
  ] = useState(false);
  const [cannonDebuggerColor, setCannonDebuggerColor] = useState<ColorValues>(
    Colors[DebuggerColorNamessById[cannonDebuggerColorIndex]]
  );

  useEffect(() => {
    if (currentCameraId !== "static") {
      return;
    }

    if (!cameraControlsRef.current) {
      return;
    }

    // cameraControlsRef.current.setTarget(...cameraTarget.toArray());
    cameraControlsRef.current.setLookAt(
      ...cameraPosition.toArray(),
      ...cameraTarget.toArray()
    );
  }, [currentCameraId, cameraControlsRef, cameraPosition, cameraTarget]);

  useFrame(() => {
    if (isActiveCannonDebugger !== isActiveCurrentCannonDebuggerState) {
      setIsActiveCurrentCannonDebuggerState(isActiveCannonDebugger);
    }
  });

  useFrame(() => {
    if (!isActiveCannonDebugger) {
      return;
    }

    let newColor = cannonDebuggerColor;
    if (cannonDebuggerColorIndex === DebuggerColorIdByName.White) {
      newColor = Colors.White;
    } else if (cannonDebuggerColorIndex === DebuggerColorIdByName.Green) {
      newColor = Colors.Green;
    } else {
      //if (cannonDebuggerColor === DebuggerColors.Black)
      newColor = Colors.Black;
    }

    if (newColor !== cannonDebuggerColor) {
      setCannonDebuggerColor(newColor);
    }
  });

  const isFirstRender = useIsFirstRender();

  useEffect(() => {
    if (isFirstRender) {
      return;
    }

    setIsActiveCurrentCannonDebuggerState(!isActiveCurrentCannonDebuggerState);
  }, [cannonDebuggerColor]);

  const spotLightRef = useRef(null);

  // const dayTime:DayTime = DayTimes.morning as DayTime
  // const dayTime: DayTime = DayTimes.day as DayTime
  // const dayTime:DayTime = DayTimes.evening as DayTime
  const dayTime:DayTime = DayTimes.night as DayTime

  const fogColors = {
    morning: "#EEEEF7",
    day: "#F6F6F6",
    evening: "#FFECE1",
    night: "#171720"
  };

  type WeatherState = {
    fog: {
      color: ColorRepresentation;
      near?: number | undefined;
      far?: number | undefined;
    };
  };
  const weatherState: WeatherState = {
    fog: { color: fogColors[dayTime], near: 10, far: 50 }
  };
  const fogArgs: [color: ColorRepresentation, near?: number | undefined, far?: number | undefined] = [
    weatherState.fog.color,
    weatherState.fog.near,
    weatherState.fog.far
  ];
  const backgroundColor = weatherState.fog.color;
  const globalIlluminationIntensity = dayTime === DayTimes.day ? 0.3 : 0.05

  return (
    <>
      {showFPSStats && <Stats />}
      {showPerfomanceInfo && <Perf position="top-right" />}

      <PerspectiveCamera
        makeDefault={currentCameraId === "static"}
        position={cameraPosition}
        fov={cameraFOV}
      />
      <OrbitControls />

      {/* <axesHelper position={[0, 0, 0]} name="scene-axes-helper x:0 y:0 z:0" /> */}

      {/* for wheel steering debug */}
      {/* <arrowHelper position={[0, 0, 0]} name="scene-arrow-helper" />
      <arrowHelper position={[0, 0, 0]} name="scene-arrow-helper-second" /> */}
      {/* /for wheel steering debug */}

      {/* <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur />
      </EffectComposer> */}

      <fog attach="fog" args={fogArgs} />
      {/* <color attach="background" args={["#ffffff"]} /> */}
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={globalIlluminationIntensity} />

      <spotLight
        ref={spotLightRef}
        position={[10, 10, 10]}
        angle={0.5}
        intensity={1}
        penumbra={0.9}
        castShadow
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        // percentage shadows algorithm params
        // shadow-mapSize-width={1024}
        // shadow-mapSize-height={1024}
        // shadow-radius={2}
        // shadow-bias={-0.0001}

        // variance shadows algorithm params
        // shadow-mapSize-width={1024}
        // shadow-mapSize-height={1024}
        // shadow-radius={2}
        // shadow-bias={-0.0001}

        // soft shadows algorithm params
        // shadow-radius={2} // dont used by renderer
        //
        // shadow-mapSize-width={2048}
        // shadow-mapSize-height={2048}
        // shadow-bias={-0.00004} // barely visible "peter-panning" effect
        //
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001} // slightly visible "peter-panning" effect of standing on the surface objects
        //
        // shadow-mapSize-width={512}
        // shadow-mapSize-height={512}
        // shadow-bias={-0.00015} // noticeable "peter-panning" effect
      />

      <Physics
        broadphase="SAP"
        contactEquationRelaxation={4}
        friction={1e-12}
        allowSleep
      >
        {isActiveCurrentCannonDebuggerState && (
          <CannonDebugger color={cannonDebuggerColor}>
            <PhysicsScene />
          </CannonDebugger>
        )}
        {!isActiveCurrentCannonDebuggerState && <PhysicsScene />}
      </Physics>

      <Suspense fallback={null}>
        {/* <Environment preset="night" /> */}
      </Suspense>
    </>
  );
};

export default Scene;
