import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Track } from './Track';
import type { TrackData } from '../utils/trackGenerator';

interface SceneProps {
  trackData: TrackData;
}

export function Scene({ trackData }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 80, 80], fov: 60 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 50, 50]} intensity={1} />
      
      <Track trackData={trackData} showCenterLine={true} />
      
      <Grid
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#404040"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#606060"
        fadeDistance={150}
        position={[0, -0.1, 0]}
      />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
