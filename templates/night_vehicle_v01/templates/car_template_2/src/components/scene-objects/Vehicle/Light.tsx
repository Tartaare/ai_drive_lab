import { ControlsContext, useControls } from "hooks/useControls";
import { useContext, useRef, useState } from "react";
import { Object3D, SpotLight } from "three";
import { BoxProps, Triplet, Quad } from "use-cannon";

type LightProps = BoxProps & {
  name?: string;
  color?: string;
  lightSurface?: {
    widthSection?: number;
    heightSection?: number;
    borderWidthPercentage?: number;
    emissiveColor?: string;
    emissiveIntensity?: number;
  };
  light?: {
    color?: string;
    intensity?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
    decay?: number;
    position?: Triplet;
  };
};

const defaultLightOptions = {
  color: "#ffffff",
  intensity: 1,
  distance: 30,
  angle: 1,
  penumbra: 0.236,
  decay: 1,
  position: [0, 0, 0] as Triplet
};

const defaultLightSurfaceOptions = {
  widthSection: 1,
  heightSection: 1,
  borderWidthPercentage: 5, // 0 - 100 // percentage
  emissiveColor: "#ffffff",
  emissiveIntensity: 1
};

const Light = ({
  name = "light",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  args = [1, 1, 1],
  color = "#666666",
  light = defaultLightOptions,
  lightSurface = defaultLightSurfaceOptions
}: LightProps) => {

  const [showAxesHelper, setShowAxesHelper] = useState(false);

  let lightOptions = {
    ...defaultLightOptions,
    ...light
  };

  const lightSurfaceOptions = {
    ...defaultLightSurfaceOptions,
    ...lightSurface
  };

  const spotlightRef = useRef<SpotLight>(null);
  const spotlightTargetRef = useRef<Object3D<Event>>(null);
  const targetPosition = [0, 0, 10] as Triplet;
  const borderCoefficient = lightSurfaceOptions.borderWidthPercentage / 100;
  const borderWidth = args[0] * borderCoefficient;
  const lightSurfaceArgs = [
    args[0] - borderWidth,
    args[1] - borderWidth,
    lightSurfaceOptions.widthSection,
    lightSurfaceOptions.heightSection
  ];

  const lightSurfacePosition = [0, 0, args[2] / 2 + 0.002];

  const { showWireframe } = useControls();
  // const { showWireframe } = useContext(ControlsContext);

  return (
    <group name={name} position={position} rotation={rotation}>
      {showAxesHelper && <axesHelper name="light-helper" />}
      {/* {showSpotlightHelper && spotlightRef?.current && ( // todo
        <spotLightHelper
          name="spotlight-helper"
          light={spotlightRef?.current || undefined}
        />
      )} */}

      <spotLight
        castShadow
        ref={spotlightRef}
        {...lightOptions}
        target={spotlightTargetRef?.current || undefined}
      />

      <object3D ref={spotlightTargetRef} position={targetPosition} />

      <mesh name="light-surface" position={lightSurfacePosition as Triplet}>
        {/* <axesHelper /> */}
        <planeGeometry
          args={lightSurfaceArgs as Quad}
          name="light-surface-mesh-geometry"
        />
        <meshStandardMaterial
          color={lightOptions.color}
          emissive={lightSurfaceOptions.emissiveColor}
          emissiveIntensity={lightSurfaceOptions.emissiveIntensity}
          // wireframe={showWireframe}
        />
      </mesh>

      <mesh name="light-box" castShadow receiveShadow>
        <boxGeometry args={args} name="light-box-mesh-geometry" />
        <meshStandardMaterial color={color} wireframe={showWireframe} />
      </mesh>
    </group>
  );
};

export default Light;
