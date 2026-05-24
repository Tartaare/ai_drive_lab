import { Mesh } from "three";
import { BoxProps, CollideEvent, Triplet, useBox } from "use-cannon";
import {
  CHASSIS,
  CUBE,
  PILLAR,
  SURFACE_FOR_PAINT,
  WHEEL
} from "./ObjectCollisionTypes";

type CubeProps = BoxProps &
  Partial<{
    color: string;
    printCollisionInfo: boolean;
  }>;

const Cube =
  // const Cube = forwardRef(
  ({
    color = "#0391ba",
    args = [1, 1, 1] as Triplet,
    printCollisionInfo,
    ...props
  }: CubeProps) =>
    // propsRef
    {
      const cubeOptions = {
        mass: 100,
        material: "ground", // todo find or create better default physical material for physics simu;ation
        collisionFilterGroup: CUBE,
        collisionFilterMask:
          CHASSIS | WHEEL | SURFACE_FOR_PAINT | PILLAR | CUBE,
        args,
        ...props
      };

      const onCollideHandler = function (e: CollideEvent) {
        if (
          e.body.name !== "pillar" &&
          e.body.name !== "cube" &&
          e.target.name === "surface-for-paint"
        ) {
          debugger;
        }
        // console.log("collision with wheel", e.body.userData);
      };

      if (printCollisionInfo) {
        cubeOptions.onCollide = onCollideHandler;
      }

      const [ref, api] = useBox<Mesh>(
        () => cubeOptions
        // propsRef
      );

      // useFrame(() => {
      //   cube.current!.rotation.x += 0.01;
      //   cube.current!.rotation.y += 0.01;
      // });

      return (
        <mesh ref={ref} api={api} castShadow receiveShadow name="cube">
          <boxGeometry args={args} name="cube-mesh-geometry" />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    };
// );

export default Cube;
