import Cube from "components/scene-objects/Cube";
import { useRef } from "react";
import { Object3D } from "three";

const TestAreaGroundBlocks = () => {
  const cubeRef = useRef<Object3D<Event>>(null);
  const blockMass = 1000;

  return (
    <>
      {/* // ground blocks */}
      <Cube
        // ref={cubeRef}
        position={[5, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[4, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[3, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[2, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[1, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[0, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-1, -2, 5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />

      <Cube
        // ref={cubeRef}
        position={[5.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[4.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[3.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[2.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[1.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[0.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-0.5, -2, 7.5]}
        args={[0.25, 0.25, 2]}
        mass={blockMass}
      />
      {/* // /ground blocks */}
    </>
  );
};

export default TestAreaGroundBlocks;
