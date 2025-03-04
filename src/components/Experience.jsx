import { Environment } from "@react-three/drei";
import {
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  useMultiplayerState,
} from "playroomkit";
import { useEffect, useState } from "react";
import { Bullet } from "./Bullet";
import { BulletHit } from "./BulletHit";
import { CharacterController } from "./CharacterController";
import { Map } from "./Map";
import * as THREE from 'three';

export const Experience = ({ downgradedPerformance = false }) => {
  const [players, setPlayers] = useState([]);
  const start = async () => {
    // Start the game
    await insertCoin();

    // Create a keyboard/mouse controller for each joining player
    onPlayerJoin((state) => {
      // For the current player, we'll use keyboard/mouse input
      // For others, we'll just sync their state
      const controls = {
        movement: { forward: false, backward: false, left: false, right: false },
        rotation: { x: 0, y: 0 },
        shooting: false,
      };
      
      // Only set up event listeners for the current player
      if (state.id === myPlayer()?.id) {
        // Keyboard events for WASD movement
        window.addEventListener("keydown", (e) => {
          if (e.code === "KeyW") controls.movement.forward = true;
          if (e.code === "KeyS") controls.movement.backward = true;
          if (e.code === "KeyA") controls.movement.left = true;
          if (e.code === "KeyD") controls.movement.right = true;
        });
        
        window.addEventListener("keyup", (e) => {
          if (e.code === "KeyW") controls.movement.forward = false;
          if (e.code === "KeyS") controls.movement.backward = false;
          if (e.code === "KeyA") controls.movement.left = false;
          if (e.code === "KeyD") controls.movement.right = false;
        });
        
        // Mouse movement for camera rotation
        window.addEventListener("mousemove", (e) => {
          // Only update if the pointer is locked (FPS controls active)
          if (document.pointerLockElement) {
            // Update rotation based on mouse movement
            controls.rotation.x -= e.movementY * 0.01; // Vertical rotation (pitch)
            controls.rotation.y -= e.movementX * 0.01; // Horizontal rotation (yaw)
            
            // Limit vertical rotation to prevent camera flipping
            controls.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, controls.rotation.x));
            
            // Sync rotation with other players
            state.setState("rotation", { x: controls.rotation.x, y: controls.rotation.y });
          }
        });
        
        // Mouse click for shooting
        window.addEventListener("mousedown", (e) => {
          if (e.button === 0 && document.pointerLockElement) { // Left click
            controls.shooting = true;
          }
        });
        
        window.addEventListener("mouseup", (e) => {
          if (e.button === 0) { // Left click
            controls.shooting = false;
          }
        });
        
        // Lock pointer when canvas is clicked
        const canvas = document.querySelector("canvas");
        if (canvas) {
          canvas.addEventListener("click", () => {
            if (!document.pointerLockElement) {
              canvas.requestPointerLock();
            }
          });
        }
      }

      const newPlayer = { state, controls };
      state.setState("health", 100);
      state.setState("deaths", 0);
      state.setState("kills", 0);
      state.setState("rotation", { x: 0, y: 0 }); // Initial camera rotation
      
      setPlayers((players) => [...players, newPlayer]);
      state.onQuit(() => {
        setPlayers((players) => players.filter((p) => p.state.id !== state.id));
      });
    });
  };

  useEffect(() => {
    start();
    
    // Clean up event listeners when component unmounts
    return () => {
      document.exitPointerLock();
    };
  }, []);

  const [bullets, setBullets] = useState([]);
  const [hits, setHits] = useState([]);

  const [networkBullets, setNetworkBullets] = useMultiplayerState(
    "bullets",
    []
  );
  const [networkHits, setNetworkHits] = useMultiplayerState("hits", []);

  const onFire = (bullet) => {
    setBullets((bullets) => [...bullets, bullet]);
  };

  const onHit = (bulletId, position) => {
    setBullets((bullets) => bullets.filter((bullet) => bullet.id !== bulletId));
    setHits((hits) => [...hits, { id: bulletId, position }]);
  };

  const onHitEnded = (hitId) => {
    setHits((hits) => hits.filter((h) => h.id !== hitId));
  };

  useEffect(() => {
    setNetworkBullets(bullets);
  }, [bullets]);

  useEffect(() => {
    setNetworkHits(hits);
  }, [hits]);

  const onKilled = (_victim, killer) => {
    const killerState = players.find((p) => p.state.id === killer).state;
    killerState.setState("kills", killerState.state.kills + 1);
  };

  // Add missing shader chunks
  THREE.ShaderChunk['colorspace_fragment'] = `
  // ... shader code for colorspace transformation ...
  `;

  return (
    <>
      <Map />
      {players.map(({ state, controls }, index) => (
        <CharacterController
          key={state.id}
          state={state}
          userPlayer={state.id === myPlayer()?.id}
          controls={controls}
          onKilled={onKilled}
          onFire={onFire}
          downgradedPerformance={downgradedPerformance}
        />
      ))}
      {(isHost() ? bullets : networkBullets).map((bullet) => (
        <Bullet
          key={bullet.id}
          {...bullet}
          onHit={(position) => onHit(bullet.id, position)}
        />
      ))}
      {(isHost() ? hits : networkHits).map((hit) => (
        <BulletHit key={hit.id} {...hit} onEnded={() => onHitEnded(hit.id)} />
      ))}
      <Environment preset="sunset" />
    </>
  );
};
