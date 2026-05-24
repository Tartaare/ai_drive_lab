import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ArrowHelper,
  BoxGeometry,
  CanvasTexture,
  Euler,
  Event,
  Intersection,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3
} from "three";
import {
  BoxProps,
  CollideEvent,
  CompoundBodyProps,
  Triplet,
  useCompoundBody
} from "use-cannon";
import {
  CHASSIS,
  CUBE,
  PILLAR,
  SURFACE_FOR_PAINT,
  WHEEL
} from "./ObjectCollisionTypes";

const SURFACE_ROOT_OBJECT_NAME = `surface-for-paint`;
const SURFACE_ROOT_OBJECT_MESH_NAME = `surface-for-paint-mesh`;
const HELPER_BOX_NAME = "box-helper";
const HELPER_ARROW_NAME = "arrow-helper";
const HELPER_SPHERE_NAME = "sphere-helper";

const OVERLAP_FOR_TEXTURES_SEAMLESS = 1; // experemental found value // todo should be get from wheel sizes
// const WHEEL_MAX_SIDE_LENGTH = 0.4; // experemental found value // todo should be get from wheel sizes

const CANVAS_SIDE_SIZE_DEFAULT = 1024;
// const CANVAS_SIDE_SIZE = 1024
const CANVAS_SIDE_SIZE = 512; // todo add platform (browser) max texture size detection
// const CANVAS_SIDE_SIZE = 256;
// const CANVAS_SIDE_SIZE = 128;
// const CANVAS_SIDE_SIZE = 64;
// const CANVAS_SIDE_SIZE = 32;
// const CANVAS_SIDE_SIZE = 16;

const WHEEL_TRAIL_SIZE_WIDTH_DEFAULT = 20;
// const WHEEL_TRAIL_SIZE_HEIGHT_DEFAULT = 5;
const WHEEL_TRAIL_SIZE_HEIGHT_DEFAULT = 10;
// const WHEEL_TRAIL_SIZE_HEIGHT_DEFAULT = 20;
const WHEEL_TRAIL_SIZE_WIDTH =
  (CANVAS_SIDE_SIZE / CANVAS_SIDE_SIZE_DEFAULT) *
  WHEEL_TRAIL_SIZE_WIDTH_DEFAULT;
const WHEEL_TRAIL_SIZE_HEIGHT =
  (CANVAS_SIDE_SIZE / CANVAS_SIDE_SIZE_DEFAULT) *
  WHEEL_TRAIL_SIZE_HEIGHT_DEFAULT;

type SurfaceForPaintProps = BoxProps &
  Partial<{
    width: number;
    height: number;
    depth: number;
    sector: Triplet;
    printCollisionInfo: boolean;
    showDebugHelpers: boolean;
    showSphereToIntersectionPoint: boolean;
  }>;

export default function SurfaceForPaint({
  width = 10,
  height = 1,
  depth = 10,
  sector = [0, 0, 0],
  printCollisionInfo = false,
  showDebugHelpers = false,
  // showDebugHelpers = false,
  // showSphereToIntersectionPoint = true,
  showSphereToIntersectionPoint = false,
  ...props
}: SurfaceForPaintProps) {
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

  let surfaceCompoundBodyOptions: CompoundBodyProps = {
    mass: 1,
    position: [sector[0] * width, -height * 3, sector[2] * depth],
    type: "Static",
    material: "ground",
    collisionFilterGroup: SURFACE_FOR_PAINT,
    collisionFilterMask: CHASSIS | WHEEL | PILLAR | CUBE,
    shapes: [
      {
        type: "Box",
        args: [
          width + OVERLAP_FOR_TEXTURES_SEAMLESS,
          height,
          depth + OVERLAP_FOR_TEXTURES_SEAMLESS
        ]
      }
    ],
    ...props
  };

  if (printCollisionInfo) {
    surfaceCompoundBodyOptions.onCollide = onCollideHandler;
  }

  const ref = useRef<Object3D<Event>>(null);
  useCompoundBody(() => surfaceCompoundBodyOptions, ref);

  const canvasRef = useRef(document.createElement("canvas"));
  const textureRef = useRef<CanvasTexture>(null);

  const paintBackgroundTexture = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "gray";
        context.fill();

        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }
      }
    }
  }, [canvasRef, textureRef]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_SIDE_SIZE;
    canvas.height = CANVAS_SIDE_SIZE;

    paintBackgroundTexture();
  }, [canvasRef, paintBackgroundTexture]);

  const paintImprint = useCallback(
    ({ uv }: ThreeEvent<PointerEvent> | { uv: Vector2 }, angle: number = 0) => {
      if (!canvasRef.current) {
        return;
      }

      if (!uv) {
        return;
      }

      function drawRoundedRectangle(
        this: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        width: number,
        height: number,
        radius: number,
        fillStyle: string = "rgba(255, 255, 255, 0.5)"
      ) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        const x = centerX - width / 2;
        const y = centerY - height / 2;

        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.fillStyle = fillStyle;
        this.closePath();
        this.fill();

        return this;
      }

      function drawCircle(
        this: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        fillStyle: string = "rgba(255, 255, 255, 0.025)"
      ) {
        this.beginPath();
        this.arc(x, y, radius, 0, 2 * Math.PI);
        this.fillStyle = fillStyle;
        this.fill();
        this.closePath();

        return this;
      }

      const canvas = canvasRef.current;
      const x = uv.x * canvas.width;
      const y = (1 - uv.y) * canvas.height;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const trailWidth = WHEEL_TRAIL_SIZE_WIDTH * 2;
      const trailHeight = WHEEL_TRAIL_SIZE_HEIGHT * 2;
      const cornerRadius = WHEEL_TRAIL_SIZE_WIDTH / 2;

      const fillStyle = "rgba(255, 255, 255, 0.025)";

      context.translate(x, y);
      context.rotate(angle);

      // drawCircle.apply(context, [
      //   0,
      //   0,
      //   trailHalfWidth,
      //   fillStyle
      // ]);
      //
      // or
      //
      drawRoundedRectangle.apply(context, [
        0,
        0,
        trailWidth,
        trailHeight,
        cornerRadius,
        fillStyle
      ]);

      // restore after rotation and translate
      context.resetTransform();
      // context.restore();

      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    },
    [canvasRef, textureRef]
  );

  const resetTextureToDefaultState = useCallback(() => {
    paintBackgroundTexture();
  }, [paintBackgroundTexture]);

  const arrowHelperRef = useRef<ArrowHelper>(null);

  const { scene } = useThree();

  /**
   * Analog of Object3d.geObjectByName that return Objects3D[]
   * @param originObject
   * @param targetObjectNames
   * @return Object3D[]
   */
  const getAllObjectsByName = (
    originObject: Object3D,
    targetObjectNames: String[]
  ): Object3D[] => {
    const foundObjects: Object3D[] = [];
    originObject.traverse((sceneObject) => {
      if (targetObjectNames.includes(sceneObject.name)) {
        foundObjects.push(sceneObject);
      }
    });

    return foundObjects;
  };

  const vehicle = scene?.getObjectByName("vehicle");
  const vehicleUuid = vehicle?.uuid;

  const wheels = useMemo(() => {
    if (!vehicle || !vehicleUuid) {
      return [];
    }

    return getAllObjectsByName(vehicle, [
      "wheel-front-first-axis-left",
      "wheel-front-first-axis-right",
      "wheel-front-second-axis-left",
      "wheel-front-second-axis-right",

      "wheel-rear-first-axis-left",
      "wheel-rear-first-axis-right",
      "wheel-rear-second-axis-left",
      "wheel-rear-second-axis-right"
    ]);
  }, [vehicle, vehicleUuid]);

  const sectorNameByCoordinates = sector.join(":");
  // const currentSurface = useMemo(
  //   () => scene.getObjectByProperty("sector", sectorNameByCoordinates),
  //   [scene, sectorNameByCoordinates]
  // );
  // scene.getObjectByProperty('sector', sector.join(':'))

  useFrame((state) => {
    const scene = state.scene;

    let wheelWorldPosition = new Vector3();
    let wheelWorldDirection = new Vector3();

    let surfaceWorldPosition = new Vector3();
    let surfaceWorldDirection = new Vector3();

    const tryTrail = (wheel: Object3D, surfaceForPaint: Object3D) => {
      if (!wheel || !surfaceForPaint) {
        return;
      }

      const surfaceMesh = surfaceForPaint.getObjectByName(
        SURFACE_ROOT_OBJECT_MESH_NAME
      );
      if (!surfaceMesh) {
        return;
      }

      wheel.getWorldPosition(wheelWorldPosition);
      wheel.getWorldDirection(wheelWorldDirection);
      const wheelQuaterion = new Quaternion();
      wheel.getWorldQuaternion(wheelQuaterion);
      // debugger;
      surfaceMesh.getWorldPosition(surfaceWorldPosition);
      surfaceMesh.getWorldDirection(surfaceWorldDirection);

      const removeObjectHelpersFromScene = (
        targetObjectNames: string[] = []
      ) => {
        const objectsToRemoveFromScene: Object3D[] = getAllObjectsByName(
          scene,
          targetObjectNames
        );
        scene.remove(...objectsToRemoveFromScene);
      };

      removeObjectHelpersFromScene([
        HELPER_BOX_NAME,
        HELPER_SPHERE_NAME,
        HELPER_ARROW_NAME
      ]);

      const addBoxHelper = (position: Vector3, direction: Vector3) => {
        if (!position) {
          throw new Error("addBoxHelper(position) position is not defined");
        }

        const sideSize = 1;
        const sideSegments = 1;
        const geometry = new BoxGeometry(
          sideSize,
          sideSize,
          sideSize,
          sideSegments,
          sideSegments,
          sideSegments
        );

        const material = new MeshBasicMaterial({ color: 0x00ffff });
        material.wireframe = true;

        const box = new Mesh(geometry, material);
        box.name = HELPER_BOX_NAME;

        box.position.set(...position.toArray());
        box.lookAt(direction);

        scene.add(box);
      };

      if (showDebugHelpers) {
        addBoxHelper(wheelWorldPosition, wheelWorldDirection);
        addBoxHelper(surfaceWorldPosition, surfaceWorldDirection);
      }

      // const directionFromWheelWorldPositionToSurfaceWorldPosition = new Vector3();
      // // direction.subVectors(wheelWorldPosition, surfaceWorldPosition).normalize();
      // directionFromWheelWorldPositionToSurfaceWorldPosition
      //   .subVectors(surfaceWorldPosition, wheelWorldPosition)
      //   .normalize();

      const gravityDirection = new Vector3(0, -1, 0);

      const rayOriginPosition = wheelWorldPosition;
      const rayDirection = gravityDirection;
      // const rayDirection = directionFromWheelWorldPositionToSurfaceWorldPosition

      const { raycaster } = state;

      // save previous raycaster parameters
      const previousRaycasterParameters = {
        ray: {
          origin: raycaster.ray.origin,
          direction: raycaster.ray.direction
        },
        near: raycaster.near,
        far: raycaster.far
        // mode: raycaster.mode,
      };
      // /save previous raycaster parameters

      raycaster.set(rayOriginPosition, rayDirection);
      raycaster.near = 0;
      raycaster.far = 0.625; // = wheel radius + error_delta

      // const surfaces = [surfaceForPaint]; //////////////////////////////////////////////
      const surfaces = [surfaceMesh]; //////////////////////////////////////////////
      // const allSurfaces = scene.getObjectsByProperty(
      //   "name",
      //   SURFACE_ROOT_OBJECT_MESH_NAME
      // );
      // const surfaces = scene.getObjectsByProperty(
      //   "name",
      //   SURFACE_ROOT_OBJECT_MESH_NAME
      // );
      // const a = getAllObjectByName(scene, targetObjectNames); // alternative to search by array of value for attribute
      const intersections = raycaster.intersectObjects(surfaces, false);

      // restore previous raycaster parameters
      raycaster.set(
        previousRaycasterParameters.ray.origin,
        previousRaycasterParameters.ray.direction
      );
      raycaster.near = previousRaycasterParameters.near;
      raycaster.far = previousRaycasterParameters.far;
      // /restore previous raycaster parameters

      const addSphereHelperToScene = (
        position: Vector3,
        direction: Vector3 | undefined | null,
        userData: { [key: string]: any } = {}
      ) => {
        const radius = 0.2;
        const widthSegments = 8;
        const heightSegments = 6;
        const geometry = new SphereGeometry(
          radius,
          widthSegments,
          heightSegments
        );
        const material = new MeshBasicMaterial({ color: 0xffff00 });
        material.wireframe = true;
        const sphere = new Mesh(geometry, material);
        sphere.name = HELPER_SPHERE_NAME;
        sphere.userData = userData;

        sphere.position.set(...position.toArray());
        if (direction) {
          sphere.lookAt(direction);
        }

        scene.add(sphere);
      };

      const MIN_DISTANCE_BETWEEN_WHEEL_AND_SURFACE_TO_COUNT_IT_AS_A_TOUCH = 0.625; // wheelRadius = radius(1) * radiusScaleCoefficient(0.625) // see more on next line
      // intersection.distance - distance between the origin-of-the-ray (wheel-position) and the intersection

      const getAngleBetweenWheelSteeringDirectionAndWorldAxisX = (
        wheel: Object3D<Event>
        // vehicleChassis: Object3D<Event>
      ) => {
        if (!wheel) {
          return;
        }

        // if (!vehicleChassis) {
        //   return;
        // }

        const wheelQuaterion = new Quaternion();
        wheel.getWorldQuaternion(wheelQuaterion);

        const xzPlaneNormalVector = new Vector3(0.0, 1.0, 0.0);

        const xAsixWorldDirection = new Vector3(1.0, 0.0, 0.0);
        // vehicleChassis.getWorldDirection(vehicleWorldDirection);

        // keeps only values for XZ plane
        xAsixWorldDirection.projectOnPlane(xzPlaneNormalVector);

        const wheelSteeringDirection = new Vector3(1.0, 0.0, 0.0);
        wheelSteeringDirection.applyQuaternion(wheelQuaterion);

        // todo // why it should be commented?
        // // rotate from perpendicular to forward of steering direction
        // wheelSteeringDirection.applyAxisAngle(
        //   new Vector3(0, 1.0, 0),
        //   (+90 / 180) * Math.PI
        //   // (-90 / 180) * Math.PI
        // );

        // keeps only values for XZ plane
        wheelSteeringDirection.projectOnPlane(xzPlaneNormalVector);

        let angleBetweenWheelSteeringDirectionAndWorldAxisX = wheelSteeringDirection.angleTo(
          xAsixWorldDirection
        );

        const crossProduct = wheelSteeringDirection.cross(xAsixWorldDirection);
        const dotProduct = xzPlaneNormalVector.dot(crossProduct);
        const sign = dotProduct < 0 ? -1 : +1;
        angleBetweenWheelSteeringDirectionAndWorldAxisX =
          sign * angleBetweenWheelSteeringDirectionAndWorldAxisX;

        return angleBetweenWheelSteeringDirectionAndWorldAxisX;
      };
      // const getSteeringAngleFromWheelAndChassisDirection = (
      //   wheel: Object3D<Event>,
      //   vehicleChassis: Object3D<Event>
      // ) => {
      //   if (!wheel) {
      //     return;
      //   }

      //   if (!vehicleChassis) {
      //     return;
      //   }

      //   const wheelQuaterion = new Quaternion();
      //   wheel.getWorldQuaternion(wheelQuaterion);

      //   const xzPlaneNormalVector = new Vector3(0.0, 1.0, 0.0);

      //   const vehicleWorldDirection = new Vector3();
      //   vehicleChassis.getWorldDirection(vehicleWorldDirection);

      //   // keeps only values for XZ plane
      //   vehicleWorldDirection.projectOnPlane(xzPlaneNormalVector);

      //   const wheelDirectionForArrowHelper = new Vector3(1.0, 0.0, 0.0);
      //   wheelDirectionForArrowHelper.applyQuaternion(wheelQuaterion);

      //   // rotate from perpendicular to forward of steering direction
      //   wheelDirectionForArrowHelper.applyAxisAngle(
      //     new Vector3(0, 1.0, 0),
      //     (-90 / 180) * Math.PI
      //   );
      //   // keeps only values for XZ plane
      //   wheelDirectionForArrowHelper.projectOnPlane(xzPlaneNormalVector);

      //   let wheelSteeringAngle = wheelDirectionForArrowHelper.angleTo(
      //     vehicleWorldDirection
      //   );

      //   const crossProduct = wheelDirectionForArrowHelper.cross(
      //     vehicleWorldDirection
      //   );
      //   const dotProduct = xzPlaneNormalVector.dot(crossProduct);
      //   const sign = dotProduct < 0 ? -1 : +1;
      //   wheelSteeringAngle = sign * wheelSteeringAngle;

      //   return wheelSteeringAngle;
      // };

      const paintTrailInIntersectionPoint = (
        intersection: Intersection<Object3D<Event>> | undefined
      ) => {
        if (!intersection) {
          return;
        }

        if (
          intersection.distance <=
          MIN_DISTANCE_BETWEEN_WHEEL_AND_SURFACE_TO_COUNT_IT_AS_A_TOUCH
        ) {
          const intersectionName = `wheel: ${wheel.name} surface: ${intersection.object.name}`;
          const userData = {
            intersectionName
          };

          if (showDebugHelpers || showSphereToIntersectionPoint) {
            addSphereHelperToScene(intersection.point, null, userData);
          }

          // const vehicle = wheel.parent;
          // if (!vehicle || vehicle.name !== "vehicle") {
          //   return;
          // }

          // const vehicleChassis = vehicle.getObjectByName("chassis");
          // if (!vehicleChassis) {
          //   return;
          // }

          const angle = getAngleBetweenWheelSteeringDirectionAndWorldAxisX(
            wheel
            // vehicleChassis
          );

          // const angle = getSteeringAngleFromWheelAndChassisDirection(
          //   wheel,
          //   vehicleChassis
          // );

          if (intersection.uv) {
            paintImprint({ uv: intersection.uv }, angle);
          }
        }
      };

      // paint on all intersection points
      // intersections.forEach((intersection) =>
      //   paintTrailInIntersectionPoint(intersection)
      // );

      const closestIntersection = intersections[0];
      paintTrailInIntersectionPoint(closestIntersection); // TODO enable to draw trails by wheels

      // for debug only
      window.closestIntersection = closestIntersection;
      window.intersections = intersections;
      // /for debug only

      const addArrowHelper = (
        arrowHelperRef: RefObject<ArrowHelper> | undefined
      ) => {
        if (!arrowHelperRef || !arrowHelperRef.current) {
          return;
        }

        const arrow = arrowHelperRef.current;

        arrow.position.set(...rayOriginPosition.toArray());
        arrow.setDirection(rayDirection);
        arrow.setColor("#ff0000");

        arrow.setLength(2);
        // arrow.setLength(10);
        // if (closestIntersection) {
        //   arrow.setLength(closestIntersection.distance);
        // }
      };

      if (showDebugHelpers) {
        addArrowHelper(arrowHelperRef);
      }

      // todo ////////////////////////////////////////////////////////
      // uv = surface000.geometry.getAttribute('uv');
      // window.originalUV = uv.array.slice()
      // window.uv = uv
      //   for (let i = 0; i < uv.count; i++) {
      //     uv.array[i + 0] = uv.array[i + 0] < 0 ? uv.array[i + 0]+0.1 : uv.array[i + 0] - 0.1;
      //     uv.array[i + 1] = uv.array[i + 1] < 0 ? uv.array[i + 1]+0.1 : uv.array[i + 1] - 0.1;
      // }
      // uv.needsUpdate = true
    };

    let currentSurface = scene.getObjectByProperty("sector", sector.join(":"));
    if (currentSurface) {
      wheels.forEach((wheel) => {
        if (currentSurface) {
          tryTrail(wheel, currentSurface);
        }
      });
    }
  });

  // const [showAsWireframe, setShowAsWireframe] = useState(true);
  const [showAsWireframe, setShowAsWireframe] = useState(false);
  const [showArrowHelper, setshowArrowHelper] = useState(false);

  return (
    <group
      ref={ref}
      name={SURFACE_ROOT_OBJECT_NAME}
      sector={sectorNameByCoordinates}
      onPointerMove={paintImprint}
      onPointerDown={resetTextureToDefaultState}
    >
      {showArrowHelper && (
        <arrowHelper ref={arrowHelperRef} name={HELPER_ARROW_NAME} />
      )}

      <group position={[0, height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow receiveShadow name={SURFACE_ROOT_OBJECT_MESH_NAME}>
          <planeGeometry
            name="surface-plane-geometry"
            attach="geometry"
            args={[width, depth]}
          />
          <meshStandardMaterial
            name="surface-mesh-standart-material"
            attach="material"
            metalness={0}
            roughness={1}
            wireframe={showAsWireframe}
          >
            <canvasTexture
              ref={textureRef}
              attach="map"
              image={canvasRef.current}
            />
          </meshStandardMaterial>
        </mesh>
      </group>
    </group>
  );
}
