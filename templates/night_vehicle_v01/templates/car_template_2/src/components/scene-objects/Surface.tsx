import { BoxProps, Triplet, useBox } from "use-cannon";

type SurfaceSceneObjectProps = BoxProps &
  Partial<{
    width: number;
    height: number;
    depth: number;
    sector: Triplet;
  }>;

export default function SurfaceSceneObject({
  width = 10,
  height = 1,
  depth = 10,
  sector = [0, 0, 0],
  ...props
}: SurfaceSceneObjectProps) {
  const [ref] = useBox(() => ({
    mass: 1,
    position: [sector[0] * width, -height / 2, sector[2] * depth],
    type: "Static",
    material: "ground",
    args: [width, height, depth],
    ...props
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      {/* //todo replace boxGeometry on planeGeometry */}
      {/* <planeGeometry args={[10, 10]} /> */}
      <meshStandardMaterial color="#303030" />
      <meshBasicMaterial map={null}/>
    </mesh>
  );
}
