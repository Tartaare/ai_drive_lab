import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { TrackData } from '../lib/track-generator';

interface CircuitTrackProps {
  trackData: TrackData;
  showCenterLine?: boolean;
}

export function CircuitTrack({ trackData, showCenterLine = false }: CircuitTrackProps) {
  const roadGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const n = trackData.centerPoints.length;

    for (let i = 0; i < n; i++) {
      const left = trackData.leftBorder[i];
      const right = trackData.rightBorder[i];

      vertices.push(left.x, left.y + 0.01, left.z);
      vertices.push(right.x, right.y + 0.01, right.z);

      const t = i / n;
      uvs.push(0, t);
      uvs.push(1, t);
    }

    for (let i = 0; i < n; i++) {
      const nextI = (i + 1) % n;
      const bl = i * 2;
      const br = i * 2 + 1;
      const tl = nextI * 2;
      const tr = nextI * 2 + 1;

      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [trackData]);

  const leftBorderPoints = useMemo(() => {
    const points = [...trackData.leftBorder, trackData.leftBorder[0]];
    return points.map(p => [p.x, p.y + 0.1, p.z] as [number, number, number]);
  }, [trackData]);

  const rightBorderPoints = useMemo(() => {
    const points = [...trackData.rightBorder, trackData.rightBorder[0]];
    return points.map(p => [p.x, p.y + 0.1, p.z] as [number, number, number]);
  }, [trackData]);

  const centerLinePoints = useMemo(() => {
    if (!showCenterLine) return null;
    const points = [...trackData.centerPoints, trackData.centerPoints[0]];
    return points.map(p => [p.x, p.y + 0.05, p.z] as [number, number, number]);
  }, [trackData, showCenterLine]);

  const startLinePoints = useMemo(() => {
    const idx = trackData.startLineIndex;
    const left = trackData.leftBorder[idx];
    const right = trackData.rightBorder[idx];
    return [
      [left.x, left.y + 0.15, left.z] as [number, number, number],
      [right.x, right.y + 0.15, right.z] as [number, number, number],
    ];
  }, [trackData]);

  return (
    <group>
      <mesh geometry={roadGeometry}>
        <meshStandardMaterial
          color="#333333"
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>

      <Line points={leftBorderPoints} color="#ffffff" lineWidth={2} />

      <Line points={rightBorderPoints} color="#ffffff" lineWidth={2} />

      {centerLinePoints && (
        <Line points={centerLinePoints} color="#ffff00" lineWidth={1} />
      )}

      <Line points={startLinePoints} color="#ff0000" lineWidth={4} />
    </group>
  );
}
