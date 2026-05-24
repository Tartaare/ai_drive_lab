import { Triplet } from "@react-three/cannon";
import Cube from "components/scene-objects/Cube";
import { useMemo } from "react";
import { Material as PhysicsMaterial } from "cannon-es";

const defaultBrickSizes = [0.5, 0.5, 1] as Triplet;

const TestAreaBrickWall = ({
  position = [0, 0, 0],
  widthCount = 9,
  heightCount = 9,
  brickSize = defaultBrickSizes,
  brickMass = 100,
  brickLinearDamping = 0.01,
  printCollisionInfo = false,
  material = new PhysicsMaterial()
}) => {
  const bricksPositions: Triplet[] = useMemo(() => {
    const positions: Triplet[] = [];

    const [centerX, centerY, centerZ] = position;

    const halfWidthCount = widthCount / 2;
    const halfHeightCount = heightCount / 2;

    const beginRowIndex =
      (heightCount % 2 ? Math.trunc(halfHeightCount) : halfHeightCount) * -1;
    const beginColumnIndex =
      (widthCount % 2 ? Math.trunc(halfWidthCount) : halfWidthCount) * -1;

    const endRowIndex =
      heightCount % 2 ? beginRowIndex * -1 : beginRowIndex * -1 - 1;
    const endColumnIndex =
      widthCount % 2 ? beginColumnIndex * -1 : beginColumnIndex * -1 - 1;

    // console.log({
    //   beginRowIndex,
    //   endRowIndex,
    //   beginColumnIndex,
    //   endColumnIndex
    // });

    const padding = 0;
    const halfSizeByX = brickSize[0] / 2;
    const halfSizeByY = brickSize[1] / 2;
    const halfSizeByZ = brickSize[2] / 2;

    for (let row = beginRowIndex; row <= endRowIndex; row++) {
      const shiftByX = 0; //row % 2 ? halfSizeByX : 0;
      const shiftByY = 0; //row % 2 ? halfSizeByY : 0;
      const shiftByZ = row % 2 ? halfSizeByZ : 0;

      for (let column = beginColumnIndex; column <= endColumnIndex; column++) {
        const x = centerX + (0 + 0) * brickSize[0] + shiftByX + padding;
        const y = centerY + (0 + row) * brickSize[1] + shiftByY + padding;
        const z = centerZ + (0 + column) * brickSize[2] + shiftByZ + padding;

        positions.push([x, y, z]);

        // console.log({ x, y, z });
        // console.log(
        //   { row, column, isEven: row % 2 === 0 },
        //   { x, y, z },
        //   { shiftByZ }
        // );
      }
    }

    return positions;
  }, [position, widthCount, heightCount, brickSize]);

  return (
    <>
      {bricksPositions.map((position, index) => (
        <Cube
          key={`brick_${position.join(":")}_index${index}`}
          position={position}
          args={brickSize}
          mass={brickMass}
          printCollisionInfo={printCollisionInfo}
          material={material}
          linearDamping={brickLinearDamping}
        />
      ))}
    </>
  );
};

export default TestAreaBrickWall;
