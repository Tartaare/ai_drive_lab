import { Triplet } from "@react-three/cannon";
import SurfaceForPaint from "components/scene-objects/SurfaceForPaint";

const TestAreaSurface = ({
  width = 3,
  height = 3,
  centerX = 0,
  centerY = 0,
  centerZ = 0,
  printCollisionInfo = false
}) => {
  const beginXIndex = (width % 2 ? Math.trunc(width / 2) : width / 2) + centerX;
  const beginYIndex =
    (height % 2 ? Math.trunc(height / 2) : height / 2) + centerY;

  const isWidthOdd = (value: number, maxValue: number) =>
    width % 2 ? value <= maxValue : value < maxValue;

  const isHeightOdd = (value: number, maxValue: number) =>
    height % 2 ? value <= maxValue : value < maxValue;

  let sectorPositions: Triplet[] = [];
  for (let y = -beginYIndex; isHeightOdd(y, +beginYIndex); y++) {
    for (let x = -beginXIndex; isWidthOdd(x, +beginXIndex); x++) {
      sectorPositions.push([x, centerZ, y]);
    }
  }

  return (
    <>
      {sectorPositions.map((position) => (
        <SurfaceForPaint
          key={position.join(":")}
          sector={position}
          printCollisionInfo={printCollisionInfo}
        />
      ))}
    </>
  );
};

export default TestAreaSurface;
