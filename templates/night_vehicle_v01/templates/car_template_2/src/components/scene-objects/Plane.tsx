import { PlaneProps, usePlane } from "use-cannon";

type PlaneSceneObjectProps = Partial<{
  width: number;
  height: number;
}> &
  PlaneProps;

export default function PlaneSceneObject({
  width = 100,
  height = 100,
  ...props
}: PlaneSceneObjectProps) {
  const [ref] = usePlane(() => ({
    type: "Static",
    material: "ground",
    ...props
  }));

  return (
    <group ref={ref}>
      <mesh receiveShadow>
        <planeGeometry args={[width, height]} />
        {/* <planeGeometry args={[100, 100]} /> */}
        <meshStandardMaterial color="#303030" />
      </mesh>
    </group>
  );
}
