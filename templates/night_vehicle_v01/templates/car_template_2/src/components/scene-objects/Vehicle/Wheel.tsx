import { useGLTF } from "@react-three/drei";
import { Euler, useFrame, Vector3 } from "@react-three/fiber";
import {
  useInfoRecords,
  useInfoRecordsDispatch
} from "components/HUD/InfoPanelContext";
import { ControlsContext, useControls } from "hooks/useControls";
import { forwardRef, Ref, useContext, useState } from "react";
import {
  ArrowHelper,
  Euler as EulerThree,
  Mesh,
  Object3D,
  Quaternion,
  Vector3 as Vector3Three
} from "three";
import {
  CollideEvent,
  CompoundBodyProps,
  CylinderProps,
  useCompoundBody
} from "use-cannon";
import {
  CHASSIS,
  CUBE,
  PILLAR,
  SURFACE_FOR_PAINT,
  WHEEL
} from "../ObjectCollisionTypes";

const filePath = "/all-terrain-vehicle-wheel.textured.glb";

const halfMathPI = Math.PI / 2;
const wheelDepthScale = 0.33;
const wheelMeshDepthScale = 0.493;
const wheelMeshRadiusScale = 0.59;
const wheelPhysicsRadiusScale = 0.625;

type WheelProps = CylinderProps & {
  radius?: number;
  depth?: number;
  leftSide?: boolean;
  printCollisionInfo?: boolean;
  name?: string;
};

const Wheel = forwardRef(
  (
    {
      radius = 1.0,
      depth = 1,
      leftSide = false,
      printCollisionInfo = false,
      name,
      ...props
    }: WheelProps,
    ref: Ref<Object3D<Event>> | undefined
  ) => {
    const { nodes, materials } = useGLTF(filePath);
    const scaledWheelDepth = depth * wheelDepthScale;
    const wheelPhysicsRadius = radius * wheelPhysicsRadiusScale;

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

    // refs[bodyB].name !== 'pillar' && refs[bodyB].name !== 'cube' /*&& !(refs[bodyA].name.startWith('wheel') || refs[bodyB].name.startWith('wheel'))*/
    // /// ////
    // (_ref2.collisionFilters.bodyFilterGroup === 2 &&
    //  _ref2.collisionFilters.bodyFilterGroup === 1)
    //  ||
    // (_ref2.collisionFilters.bodyFilterGroup === 2 &&
    //  _ref2.collisionFilters.bodyFilterGroup === 8)

    let wheelCompoundBodyOptions: CompoundBodyProps = {
      mass: 50,
      // type: "Kinematic",///////////////////////////////////////////////<<<<<<<<<<<<<<<<
      material: "wheel",
      collisionFilterGroup: 0, // for debug - to ignore wheel and chassis buggy collision from incorrect calculation of wheel position <<<<<<<<< ////////////////////   *********
      // collisionFilterGroup: WHEEL,
      collisionFilterMask: CHASSIS | WHEEL | SURFACE_FOR_PAINT | PILLAR | CUBE,
      shapes: [
        {
          type: "Cylinder",
          rotation: [0, 0, (leftSide ? +1 : -1) * halfMathPI],
          args: [wheelPhysicsRadius, wheelPhysicsRadius, scaledWheelDepth, 16]
        }
      ],
      ...props
    };

    if (printCollisionInfo) {
      wheelCompoundBodyOptions.onCollide = onCollideHandler;
    }

    useCompoundBody(() => wheelCompoundBodyOptions, ref);

    const scaledWheelMeshDepth = scaledWheelDepth * wheelMeshDepthScale;
    const wheelMeshRadius = radius * wheelMeshRadiusScale;

    const scale = [
      wheelMeshRadius,
      scaledWheelMeshDepth,
      wheelMeshRadius
    ] as Vector3;
    const position = [
      (leftSide ? +1 : -1) * scaledWheelMeshDepth,
      0,
      0
    ] as Vector3;
    const rotation = [0, 0, (leftSide ? +1 : -1) * halfMathPI] as Euler;

    const { showWireframe } = useControls();

    (nodes["wheel-all-terrain_1"] as Mesh).material.wireframe = showWireframe;
    (nodes["wheel-all-terrain_2"] as Mesh).material.wireframe = showWireframe;

    const infoRecordsDispatch = useInfoRecordsDispatch();
    const infoRecords = useInfoRecords();

    // const [showSteeringArrowHelpers, setShowSteeringArrowHelpers] = useState(
    //   true
    // );
    const [showSteeringArrowHelpers, setShowSteeringArrowHelpers] = useState(false);

    // const [
    //   displaySteeringAngleOnInfoPanel,
    //   setdisplaySteeringAngleOnInfoPanel
    // ] = useState(true);
    const [
      displaySteeringAngleOnInfoPanel,
      setdisplaySteeringAngleOnInfoPanel
    ] = useState(false);

    useFrame((state) => {
      if (!displaySteeringAngleOnInfoPanel && !showSteeringArrowHelpers) {
        return;
      }

      const scene = state.scene;

      const wheel = ref?.current as Object3D<Event>;
      if (!wheel || wheel.name !== "wheel-front-first-axis-right") {
        return;
      }

      const vehicle = wheel.parent;
      if (!vehicle || vehicle.name !== "vehicle") {
        return;
      }

      const vehicleChassis = vehicle.getObjectByName("chassis");
      if (!vehicleChassis) {
        return;
      }

      const xzPlaneNormalVector = new Vector3Three(0.0, 1.0, 0.0);

      const vehicleWorldDirection = new Vector3Three();
      vehicleChassis.getWorldDirection(vehicleWorldDirection);

      // keeps only values for XZ plane
      vehicleWorldDirection.projectOnPlane(xzPlaneNormalVector);

      const wheelWorldPosition = new Vector3Three();
      const wheelWorldDirection = new Vector3Three();
      const wheelQuaterion = new Quaternion();
      const wheelDirectionForArrowHelper = new Vector3Three(1.0, 0.0, 0.0);
      const wheelEulerAngle = new EulerThree();
      wheel.getWorldPosition(wheelWorldPosition);
      wheel.getWorldDirection(wheelWorldDirection);
      wheel.getWorldQuaternion(wheelQuaterion);
      wheelEulerAngle.setFromQuaternion(wheelQuaterion);
      wheelDirectionForArrowHelper.applyQuaternion(wheelQuaterion);

      // rotate from perpendicular to forward of steering direction
      wheelDirectionForArrowHelper.applyAxisAngle(
        new Vector3Three(0, 1.0, 0),
        (-90 / 180) * Math.PI
      );

      // keeps only values for XZ plane
      wheelDirectionForArrowHelper.projectOnPlane(xzPlaneNormalVector);
      const wheelDirectionForArrowHelperClone = wheelDirectionForArrowHelper.clone();

      let wheelSteeringAngle = wheelDirectionForArrowHelperClone.angleTo(
        vehicleWorldDirection
      );
      const crossProduct = wheelDirectionForArrowHelperClone.cross(
        vehicleWorldDirection
      );
      const dotProduct = xzPlaneNormalVector.dot(crossProduct);
      const sign = dotProduct < 0 ? -1 : +1;
      wheelSteeringAngle = sign * wheelSteeringAngle;

      if (displaySteeringAngleOnInfoPanel) {
        let wheelSteeringAngleInDegreesAsString = (
          (wheelSteeringAngle * 180) /
          Math.PI
        ).toFixed(3);

        if (wheelSteeringAngleInDegreesAsString[0] !== "-") {
          wheelSteeringAngleInDegreesAsString = `+${wheelSteeringAngleInDegreesAsString}`;
        }

        const steeringInfoRecord = infoRecords.find(
          (infoRecord) => infoRecord.id === "info-record-id_steering-angle"
        );

        if (!steeringInfoRecord) {
          infoRecordsDispatch({
            // addInfoRecord({
            type: "added",
            infoRecord: {
              id: "info-record-id_steering-angle",
              label: "steering angle in degrees",
              // "steering angle in degrees (angle between wheel-front-first-axis-right and the chassis forward direction)",
              text: wheelSteeringAngleInDegreesAsString,
              isActive: true
            }
          });
        } else {
          if (!steeringInfoRecord.isActive) {
            infoRecordsDispatch({
              // updateInfoRecordAttribute({
              type: "changedAttribute",
              infoRecord: {
                id: "info-record-id_steering-angle",
                isActive: true
              }
            });
          }

          if (wheelSteeringAngleInDegreesAsString !== steeringInfoRecord.text) {
            infoRecordsDispatch({
              // updateInfoRecordAttribute({
              type: "changedAttribute",
              infoRecord: {
                id: "info-record-id_steering-angle",
                text: wheelSteeringAngleInDegreesAsString
              }
            });
          }
        }
      }

      if (showSteeringArrowHelpers) {
        const arrowHelper = scene.getObjectByName(
          "scene-arrow-helper"
        ) as ArrowHelper;
        const arrowHelperSecondOne = scene.getObjectByName(
          "scene-arrow-helper-second"
        ) as ArrowHelper;

        if (arrowHelper) {
          arrowHelper.position.set(...wheelWorldPosition.toArray());
          arrowHelper.setDirection(wheelDirectionForArrowHelper);
          arrowHelper.setColor("#ff0000");
          arrowHelper.setLength(2);
        }

        if (arrowHelperSecondOne) {
          arrowHelperSecondOne.position.set(...wheelWorldPosition.toArray());
          arrowHelperSecondOne.setDirection(vehicleWorldDirection);
          arrowHelperSecondOne.setColor("#800080");
          arrowHelperSecondOne.setLength(1, 0.2, 0.1);
        }
      }
    });

    // const [showAxesHelpers, setShowAxesHelpers] = useState(true);
    const [showAxesHelpers, setShowAxesHelpers] = useState(false);

    /*
    geometry and material was generated by gltfjsx
    Auto-generated by: https://github.com/pmndrs/gltfjsx
    Command: npx gltfjsx@6.1.4 wheel.glb --transform
    */
    return (
      <group ref={ref} name={name || "wheel"}>
        {showAxesHelpers && (
          <axesHelper
            name="chassis-helper"
            position={ref?.current?.position.toArray()}
          />
        )}

        <group
          scale={scale}
          position={position}
          rotation={rotation}
          name="wheel-inner-mesh-position-group"
        >
          {showAxesHelpers && (
            <axesHelper
              name="chassis-helper-inner"
              position={ref?.current?.position.toArray()}
            />
          )}

          <mesh
            name="tire"
            castShadow
            receiveShadow
            geometry={nodes["wheel-all-terrain_1"].geometry}
            material={materials.Rubber}
          />
          <mesh
            name="wheel-disk"
            castShadow
            receiveShadow
            geometry={nodes["wheel-all-terrain_2"].geometry}
            material={materials["Paint.Gray"]}
          />
        </group>
      </group>
    );
  }
);

useGLTF.preload(filePath); // todo replace on adding the resource to the resource loading manager queue

export default Wheel;
