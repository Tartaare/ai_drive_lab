import Cube from "components/scene-objects/Cube";
import Pillar from "components/scene-objects/Pillar";
import TestAreaBlockWalls from "components/scene-objects/TestAreaBlockWalls";
import TestAreaBrickWallWithColumns from "components/scene-objects/TestAreaBrickWallWithColumns";
import TestAreaGroundBlocks from "components/scene-objects/TestAreaGroundBlocks";
import TestAreaSurface from "components/scene-objects/TestAreaSurface";
import Vehicle from "components/scene-objects/Vehicle";
import { useMemo } from "react";
import Heightfield, { generateHeightmap } from "./scene-objects/HeightField";

const PhysicsScene = () => {
  const sideScale = 100;

  const heightMapParameters = useMemo(
    () => ({
      width: 512,
      height: 512,
      amountOfSeedPoints: 100,
      scale: 1
    }),
    []
  );
  const heights = useMemo(() => generateHeightmap(heightMapParameters), [
    heightMapParameters
  ]);

  return (
    <>
      <Heightfield
        elementSize={(sideScale * 1) / heightMapParameters.width}
        heights={heights}
        position={[-sideScale / 2, -10, sideScale / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* TestAreaSurface commented due implementing Heightfield */}
      {/* <TestAreaSurface width={5} height={5} /> */}

      <Pillar position={[-5, 0, -6]} userData={{ id: "pillar-1" }} />
      <Pillar position={[0, 0, -6]} userData={{ id: "pillar-2" }} />
      <Pillar position={[5, 0, -6]} userData={{ id: "pillar-3" }} />

      {/* pillars blocks */}
      <Cube position={[-2.5, 4, -6.5]} args={[5, 0.5, 0.5]} />
      <Cube position={[-2.5, 4, -6.0]} args={[5, 0.5, 0.5]} />
      <Cube position={[-2.5, 4, -5.5]} args={[5, 0.5, 0.5]} />

      <Cube position={[+2.5, 4, -6.5]} args={[5, 0.5, 0.5]} />
      <Cube position={[+2.5, 4, -6.0]} args={[5, 0.5, 0.5]} />
      <Cube position={[+2.5, 4, -5.5]} args={[5, 0.5, 0.5]} />
      {/* /pillars blocks */}

      {/* column */}
      <Cube position={[5, -1.5, 0]} args={[1, 2, 1]} />
      {/* /column */}

      {/* brick column */}
      {/* <Cube position={[-7, -3, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, -1.5, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, -1, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, -0.5, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, 0, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, 0.5, 0]} args={[0.5, 0.5, 1]} />
      <Cube position={[-7, 1, 0]} args={[0.5, 0.5, 1]} /> */}
      {/* /brick column */}

      {/* vvv /disabled due perfomance of collision detection */}
      {/* <TestAreaBrickWallWithColumns />

      <TestAreaBlockWalls />
      <TestAreaGroundBlocks /> */}
      {/* ^^^ /disabled due perfomance of collision detection */}

      {/* <Vehicle rotation={[0, -Math.PI / 4, 0]} angularVelocity={[0, 0.5, 0]} /> */}

      <Vehicle rotation={[0, -Math.PI / 4, 0]} position={[0, 2, 0]} />

      {/* debug vehicle wheels */}
      {/* <Cube type='Static'position={[0, 0, 0]} args={[1, 2, 1]} /> */}
    </>
  );
};

export default PhysicsScene;
