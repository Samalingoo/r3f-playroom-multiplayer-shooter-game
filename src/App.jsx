import { Loader, PerformanceMonitor, SoftShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { Suspense, useState } from "react";
import { Experience } from "./components/Experience";
import { Leaderboard } from "./components/Leaderboard";
import Reticle from "./components/Reticle";

function App() {
  const [downgradedPerformance, setDowngradedPerformance] = useState(false);
  
  return (
    <>
      <Loader />
      <Leaderboard />
      
      {/* Fixed reticle above Canvas */}
      <Reticle color="rgba(255, 255, 255, 0.8)" size={22} />
      
      <Canvas
        shadows
        camera={{ position: [0, 1, 0], fov: 90, near: 1}}
        dpr={[1, 1.5]} // optimization to increase performance on retina/4k devices
      >
        <color attach="background" args={["#242424"]} />
        <SoftShadows size={42} />

        <PerformanceMonitor
          // Detect low performance devices
          onDecline={(fps) => {
            setDowngradedPerformance(true);
          }}
        />
        <Suspense>
          <Physics>
            <Experience downgradedPerformance={downgradedPerformance} />
          </Physics>
        </Suspense>
        {!downgradedPerformance && (
          // disable the postprocessing on low-end devices
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={1} intensity={1.5} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </>
  );
}

export default App;
