import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import { ControlsContext, useControls } from "hooks/useControls";
import {
  forwardRef,
  useContext,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { Mesh, Vector3 } from "three";
import {
  BoxProps,
  CollideEvent,
  Triplet,
  useBox,
  useCompoundBody,
  useTrimesh
} from "use-cannon";
import {
  CHASSIS,
  CUBE,
  PILLAR,
  SURFACE_FOR_PAINT,
  WHEEL
} from "../ObjectCollisionTypes";
import Light from "./Light";
import { CompoundBodyProps, CylinderProps } from "use-cannon";
import { useCameraId } from "../CameraContext";
import { useFrame } from "@react-three/fiber";

const filePath = "/all-terrain-vehicle-chassis.textured.glb";

const halfMathPI = Math.PI / 2;

type ChassisProps = BoxProps & {
  printCollisionInfo?: boolean;
};

const Chassis = forwardRef(
  (
    {
      args = [1.65, 0.8, 4],
      mass = 5000,
      printCollisionInfo = false,
      ...props
    }: ChassisProps,
    ref
  ) => {
    const { nodes, materials } = useGLTF(filePath);

    const onCollideHandler = function (e: CollideEvent) {
      if (
        e.body.name !== "pillar" &&
        e.body.name !== "cube" &&
        e.target.name === "surface-for-paint"
      ) {
        debugger;
      }
      // if (e.body.userData.id === "floor_0:0:0") {
      //   // if (e.body.userData.id === "wheel-front-first-axis-left") {
      //   // console.log("collision with wheel", e.body.userData);
      //   // console.log(arguments);
      //   if (logs.length < 10) {
      //     logs.push({ e, arguments });
      //   }
      // }
    };

    // const chassisBoxOptions = {
    //   mass,
    //   args,
    //   allowSleep: false,
    //   collisionFilterGroup: CHASSIS,
    //   collisionFilterMask: CHASSIS | WHEEL | SURFACE_FOR_PAINT | PILLAR | CUBE,
    //   ...props
    // };

    let chassisCompoundBodyOptions: CompoundBodyProps = {
      mass,
      allowSleep: false,
      collisionFilterGroup: CHASSIS,
      collisionFilterMask: CHASSIS | WHEEL | SURFACE_FOR_PAINT | PILLAR | CUBE,
      shapes: [
        {
          // top half
          type: "Box",
          position: [0, 0, 0],
          args
        }
        // note. dont use lower part physics colliders tщ make driving easier
        // {
        //   // front part of bottom half
        //   type: "Cylinder",
        //   rotation: [(-halfMathPI / 4) * 0.7, 0, halfMathPI],
        //   position: [0, -0.49, 1.66],
        //   args: [0.35, 0.35, 0.85, 4]
        // },
        // {
        //   // middle part of bottom half
        //   type: "Box",
        //   position: [0, -0.57, 0],
        //   args: [0.85, 0.5, 3.51]
        // },
        // {
        //   // rear part of bottom half
        //   type: "Cylinder",
        //   rotation: [(+halfMathPI / 4) * 0.7, 0, halfMathPI],
        //   position: [0, -0.49, -1.66],
        //   args: [0.35, 0.35, 0.85, 4]
        // }
      ],
      ...props
    };

    if (printCollisionInfo) {
      chassisCompoundBodyOptions.onCollide = onCollideHandler;
    }

    const [_, api] = useCompoundBody(() => chassisCompoundBodyOptions, ref);
    // const [_boxRef, api] = useBox<Mesh>(() => chassisBoxOptions, ref);

    const steelMaterial = materials["Paint.Gray"];
    const windowMaterial = materials["Black plastic"];

    const { showWireframe } = useControls();
    // const { showWireframe } = useContext(ControlsContext);

    (nodes.Cube002 as Mesh).material.wireframe = showWireframe;
    (nodes.Cube002_1 as Mesh).material.wireframe = showWireframe;

    const { position } = props;

    // const [showAxesHelpers, setShowAxesHelpers] = useState(true);
    const [showAxesHelpers, setShowAxesHelpers] = useState(false);

    const {
      playerUnit: { lightsOn }
    } = useControls();
    // } = useContext(ControlsContext);

    const headlight = {
      boxSize: [0.5, 0.05, 0.025] as Triplet,
      light: {
        position: [0, 0, 0] as Triplet,
        intensity: 1
      },
      lightSurface: {
        borderWidthPercentage: 5,
        emissiveIntensity: 1
      }
    };
    if (!lightsOn) {
      headlight.light.intensity = 0;
      headlight.lightSurface.emissiveIntensity = 0;
    }

    const stoplight = {
      boxSize: [0.05, 0.5, 0.075] as Triplet,
      light: {
        position: [0, -0.5, 0] as Triplet,
        color: "#ff0000",
        intensity: 0.3,
        distance: 3
      },
      lightSurface: {
        borderWidthPercentage: 25,
        emissiveColor: "#ff0000",
        emissiveIntensity: 0.1
      }
    };
    if (!lightsOn) {
      stoplight.light.intensity = 0;
      stoplight.lightSurface.emissiveIntensity = 0;
    }

    const {
      playerUnit: { forward, backward, brake }
    } = useControls();
    // } = useContext(ControlsContext);
    // braking
    if (brake) {
      stoplight.light.intensity = 1;
      stoplight.lightSurface.emissiveIntensity = 0.7;
    }

    const reverselight = {
      boxSize: [0.05, 0.15, 0.075] as Triplet,
      light: {
        position: [0, -0.5, 0] as Triplet,
        color: "#ffffff",
        intensity: 0,
        distance: 3
      },
      lightSurface: {
        borderWidthPercentage: 25,
        emissiveColor: "#ffffff",
        emissiveIntensity: 0
      }
    };

    // reverse moving
    if (backward) {
      reverselight.light.intensity = 1;
      reverselight.lightSurface.emissiveIntensity = 0.7;
    }
    // debugger;
    const currentCameraId = useCameraId();
    const cameraRef = useRef<typeof PerspectiveCamera>(null);

    useFrame(() => {
      // useLayoutEffect(() => {
      if (currentCameraId !== "following") {
        return;
      }
      const camera = cameraRef?.current as typeof PerspectiveCamera;
      if (!camera) {
        return;
      }
      // debugger; /// <<<<>>>>

      if (!ref?.current) {
        return;
      }
      // camera.rotation.set(0, Math.PI, 0);
      // camera.position.set(0, 10, -20);
      const chassisPosition = new Vector3();
      ref?.current.getWorldPosition(chassisPosition);
      camera.lookAt(chassisPosition);
      // camera.lookAt(ref?.current.position);
      // camera.rotation.x -= 0.2;
      // camera.rotation.z = Math.PI; // resolves the weird spin in the beginning
      // }, [currentCameraId, cameraRef, ref]);
    });

    return (
      <group ref={ref || undefined} api={api} name="chassis">
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault={currentCameraId === "following"}
          position={[0, 2, -8]}
          // position={cameraPosition}
          // fov={cameraFOV}
          // target={ref?.current?.position || [0, 0, 0]}
        />

        {showAxesHelpers && (
          <axesHelper
            name="chassis-helper"
            position={position}
            // position={_boxRef.current?.position.toArray()}
          />
        )}

        {/* headlights */}
        <Light
          name="headlight-left"
          args={headlight.boxSize}
          position={[-0.4, 0.3, 1.95]}
          light={headlight.light}
          lightSurface={headlight.lightSurface}
        />
        <Light
          name="headlight-right"
          args={headlight.boxSize}
          position={[0.4, 0.3, 1.95]}
          light={headlight.light}
          lightSurface={headlight.lightSurface}
        />
        {/* /headlights */}

        {/* stoplights */}
        <Light
          name="stoplights-left"
          args={stoplight.boxSize}
          light={stoplight.light}
          color={stoplight.color}
          lightSurface={stoplight.lightSurface}
          position={[-0.75, 0, -1.95]}
          rotation={[0, Math.PI, 0]}
        />
        <Light
          name="stoplights-right"
          args={stoplight.boxSize}
          light={stoplight.light}
          color={stoplight.color}
          lightSurface={stoplight.lightSurface}
          position={[0.75, 0, -1.95]}
          rotation={[0, Math.PI, 0]}
        />
        {/* /stoplights */}

        {/* reverselights */}
        <Light
          name="reverselights-left"
          args={reverselight.boxSize}
          light={reverselight.light}
          color={reverselight.color}
          lightSurface={reverselight.lightSurface}
          position={[-0.7, 0.177, -1.97]}
          rotation={[0, Math.PI, 0]}
        />
        <Light
          name="reverselights-right"
          args={reverselight.boxSize}
          light={reverselight.light}
          color={reverselight.color}
          lightSurface={reverselight.lightSurface}
          position={[0.7, 0.177, -1.97]}
          rotation={[0, Math.PI, 0]}
        />
        {/* /reverselights */}

        {/*
        Auto-generated by: https://github.com/pmndrs/gltfjsx
        Command: npx gltfjsx@6.1.4 chassis.glb --transform
        */}
        <group
          position={[0, -0.83, 0]}
          name="chassis-inner-mesh-position-group"
        >
          <mesh
            name="chassis-metallic-parts"
            castShadow
            receiveShadow
            geometry={nodes.Cube002.geometry}
            material={steelMaterial}
          />
          <mesh
            name="chassis-plastic-parts"
            castShadow
            receiveShadow
            geometry={nodes.Cube002_1.geometry}
            material={windowMaterial}
          />
        </group>
      </group>
    );
  }
);

useGLTF.preload(filePath);

export default Chassis;
