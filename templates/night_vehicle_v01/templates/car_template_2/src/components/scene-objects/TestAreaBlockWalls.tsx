import Cube from "components/scene-objects/Cube";
import { useRef } from "react";
import { Object3D } from "three";

const TestAreaBlockWalls = () => {
  const cubeRef = useRef<Object3D<Event>>(null);
  const wallBrickMass = 1000;

  return (
    <>
      {/* walls */}
      {/* walls left row */}
      <Cube
        // ref={cubeRef}
        position={[-2, -1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-2, 0, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-2, 1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-3, -1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 0, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 2, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-4, -1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-4, 0, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-4, 1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-5, -1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 0, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 1, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 2, 5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      {/* /walls left row */}

      {/* /walls right row */}
      <Cube
        // ref={cubeRef}
        position={[-2, -1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-2, 0, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-2, 1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-3, -1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 0, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-3, 2, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-4, -1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-4, 0, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-4, 1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />

      <Cube
        // ref={cubeRef}
        position={[-5, -1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 0, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 1, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      <Cube
        // ref={cubeRef}
        position={[-5, 2, 7.5]}
        args={[0.5, 0.5, 2]}
        mass={wallBrickMass}
      />
      {/* /walls right row */}
      {/* /walls */}
    </>
  );
};

export default TestAreaBlockWalls;
