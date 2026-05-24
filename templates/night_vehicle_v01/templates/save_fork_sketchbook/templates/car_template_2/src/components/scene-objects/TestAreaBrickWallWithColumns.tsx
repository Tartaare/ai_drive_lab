import { Triplet, useContactMaterial } from "@react-three/cannon";
import Cube from "components/scene-objects/Cube";
import TestAreaBrickWall from "components/scene-objects/TestAreaBrickWall";
import {
  Material as CannonMaterial,
  ContactMaterial as CannonContactMaterial
} from "cannon-es";

const TestAreaBrickWallWithColumns = () => {
  const position = [-10, -1, 0];

  const brickMass = 10;
  const bricksWidthCount = 6;
  const bricksHeightCount = 12;
  const brickSize: Triplet = [2, 1, 4].map((v) => v / 8) as Triplet;

  const columnMass = 1000;
  const columnSize = [1, 4, 1].map((v) => (v / 8) * 3) as Triplet;
  const halfOfShortColumnSize = columnSize[0] / 2;
  const halfOfLongColumnSize = columnSize[1] / 2;

  const longSideOfBrickWall = bricksWidthCount * 2 * brickSize[1];

  const brickCannonMaterial = new CannonMaterial({
    friction: 0.01,
    restitution: 1e-12
  });
  brickCannonMaterial.name = "brick";

  const brickLinearDamping = 0.01;

  useContactMaterial(
    "brick",
    "ground",
    {
      friction: 0.01,
      restitution: 1e-12,
      contactEquationStiffness: 1e12,
      contactEquationRelaxation: 1,
      frictionEquationStiffness: 1e12,
      frictionEquationRelaxation: 1e12
    },
    []
  );

  useContactMaterial(
    "brick",
    "brick",
    {
      friction: 0.01,
      restitution: 1e-12,
      contactEquationStiffness: 1e12,
      contactEquationRelaxation: 1,
      frictionEquationStiffness: 1e12,
      frictionEquationRelaxation: 1e12
    },
    []
  );
  // useContactMaterial(
  //   materialA: MaterialOptions,
  //   materialB: MaterialOptions,
  //   options: ContactMaterialOptions,
  // options: {
  //     friction: number;
  //   restitution: number;
  //   contactEquationStiffness: number;
  //   contactEquationRelaxation: number;
  //   frictionEquationStiffness: number;
  //   frictionEquationRelaxation: number;
  // }
  //   deps: React.DependencyList = [],
  // )

  return (
    <>
      <Cube
        position={[
          position[0] + (columnSize[0] / 2 + brickSize[0] / 2),
          position[1] - halfOfLongColumnSize,
          position[2] - (longSideOfBrickWall + halfOfShortColumnSize)
        ]}
        args={columnSize}
        mass={columnMass}
      />
      {/* <Cube
        position={[
          position[0],
          position[1] - halfOfLongColumnSize,
          position[2] - (longSideOfBrickWall + brickSize[2])
        ]}
        args={columnSize}
        mass={columnMass}
      /> */}
      <Cube
        position={[
          position[0] - (columnSize[0] / 2 + brickSize[0] / 2),
          position[1] - halfOfLongColumnSize,
          position[2] - (longSideOfBrickWall + halfOfShortColumnSize)
        ]}
        args={columnSize}
        mass={columnMass}
      />

      <TestAreaBrickWall
        position={[
          position[0],
          position[1] -
            (bricksHeightCount / 2) * brickSize[1] +
            brickSize[1] / 2,
          position[2]
        ]}
        brickSize={brickSize}
        brickMass={brickMass}
        brickLinearDamping={brickLinearDamping}
        widthCount={bricksWidthCount}
        heightCount={bricksHeightCount}
        material={brickCannonMaterial}
      />

      <Cube
        position={[
          position[0] + (columnSize[0] / 2 + brickSize[0] / 2),
          position[1] - halfOfLongColumnSize,
          position[2] + (longSideOfBrickWall + halfOfShortColumnSize)
        ]}
        args={columnSize}
        mass={columnMass}
      />
      {/* <Cube
        position={[
          position[0],
          position[1] - halfOfLongColumnSize,
          position[2] + (longSideOfBrickWall + brickSize[2])
        ]}
        args={columnSize}
        mass={columnMass}
      /> */}
      <Cube
        position={[
          position[0] - (columnSize[0] / 2 + brickSize[0] / 2),
          position[1] - halfOfLongColumnSize,
          position[2] + (longSideOfBrickWall + halfOfShortColumnSize)
        ]}
        args={columnSize}
        mass={columnMass}
      />
    </>
  );
};

export default TestAreaBrickWallWithColumns;
