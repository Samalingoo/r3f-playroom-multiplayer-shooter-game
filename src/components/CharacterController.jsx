import { Billboard, CameraControls, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { isHost } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import { CharacterSoldier } from "./CharacterSoldier";
const MOVEMENT_SPEED = 202;
const FIRE_RATE = 380;
export const WEAPON_OFFSET = {
  // x: -0.2,
  // y: 1.4,
  // z: 0.8,
  x: 0,
  y: 1.4,
  z: 0,
};

export const CharacterController = ({
  state,
  controls,
  userPlayer,
  onKilled,
  onFire,
  downgradedPerformance,
  ...props
}) => {
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const [animation, setAnimation] = useState("Idle");
  const [weapon, setWeapon] = useState("AK");
  const lastShoot = useRef(0);

  const scene = useThree((state) => state.scene);
  const spawnRandomly = () => {
    const spawns = [];
    for (let i = 0; i < 1000; i++) {
      const spawn = scene.getObjectByName(`spawn_${i}`);
      if (spawn) {
        spawns.push(spawn);
      } else {
        break;
      }
    }
    const spawnPos = spawns[Math.floor(Math.random() * spawns.length)].position;
    rigidbody.current.setTranslation(spawnPos);
  };

  useEffect(() => {
    if (isHost()) {
      spawnRandomly();
    }
  }, []);

  useEffect(() => {
    if (state.state.dead) {
      const audio = new Audio("/audios/dead.mp3");
      audio.volume = 0.5;
      audio.play();
    }
  }, [state.state.dead]);

  useEffect(() => {
    if (state.state.health < 100) {
      const audio = new Audio("/audios/hurt.mp3");
      audio.volume = 0.4;
      audio.play();
    }
  }, [state.state.health]);

  useFrame((_, delta) => {
    if (state.state.dead) {
      setAnimation("Death");
      return;
    }

    // Get the current rotation from state for non-user players or from controls for user player
    let rotationX = 0;
    let rotationY = 0;

    if (userPlayer) {
      rotationX = controls.rotation.x;
      rotationY = controls.rotation.y;
    } else {
      // Get rotation from network state for other players
      const networkRotation = state.getState("rotation");
      if (networkRotation) {
        rotationX = networkRotation.x;
        rotationY = networkRotation.y;
      }
    }

    // Apply rotation to character
    if (character.current) {
      character.current.rotation.y = rotationY;
    }

    // CAMERA FOLLOW - First Person
    if (cameraControls.current && userPlayer) {
      const playerWorldPos = vec3(rigidbody.current.translation());
      
      // Position camera at eye level
      const eyeHeight = 1.7;
      
      // Calculate camera position and look target based on player rotation
      const forwardX = Math.sin(rotationY);
      const forwardZ = Math.cos(rotationY);
      
      // Position the camera at player's head
      cameraControls.current.setLookAt(
        playerWorldPos.x,
        playerWorldPos.y + eyeHeight,
        playerWorldPos.z,
        // Look in the direction determined by mouse rotation
        playerWorldPos.x + Math.sin(rotationY) * Math.cos(rotationX) * 10,
        playerWorldPos.y + eyeHeight + Math.sin(rotationX) * 10,
        playerWorldPos.z + Math.cos(rotationY) * Math.cos(rotationX) * 10,
        false // Disabled smooth transition
      );
    }

    // Handle WASD movement for the current player
    if (userPlayer) {
      let moving = false;
      let moveX = 0;
      let moveZ = 0;

      // Calculate movement direction based on WASD keys
      if (controls.movement.forward) {
        moveZ += Math.cos(rotationY);
        moveX += Math.sin(rotationY);
        moving = true;
      }
      if (controls.movement.backward) {
        moveZ -= Math.cos(rotationY);
        moveX -= Math.sin(rotationY);
        moving = true;
      }
      if (controls.movement.left) {
        moveZ -= Math.sin(rotationY);
        moveX += Math.cos(rotationY);
        moving = true;
      }
      if (controls.movement.right) {
        moveZ += Math.sin(rotationY);
        moveX -= Math.cos(rotationY);
        moving = true;
      }

      // Normalize movement vector if moving diagonally
      if (moveX !== 0 && moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= length;
        moveZ /= length;
      }

      // Apply movement impulse
      if (moving) {
        setAnimation(controls.shooting ? "Run_Shoot" : "Run");
        const impulse = {
          x: moveX * MOVEMENT_SPEED * delta,
          y: 0,
          z: moveZ * MOVEMENT_SPEED * delta,
        };
        rigidbody.current.applyImpulse(impulse, true);
      } else {
        setAnimation(controls.shooting ? "Idle_Shoot" : "Idle");
      }

      // Handle shooting
      if (controls.shooting) {
        if (isHost()) {
          if (Date.now() - lastShoot.current > FIRE_RATE) {
            lastShoot.current = Date.now();
            // Generate a more unique ID with a random component
            const uniqueId = state.id + "-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
            
            // Get player position
            const playerPos = vec3(rigidbody.current.translation());
            
            // Calculate bullet spawn position with forward offset based on player rotation
            const forwardOffset = 1.0; // Distance in front of player
            const bulletPosition = {
              x: playerPos.x + Math.sin(rotationY) * forwardOffset,
              y: playerPos.y + 0, // Adjust to match weapon height
              z: playerPos.z + Math.cos(rotationY) * forwardOffset,
            };
            
            const newBullet = {
              id: uniqueId,
              position: bulletPosition,
              angle: rotationY,  // Horizontal rotation (yaw)
              rotationX: rotationX, // Vertical rotation (pitch)
              player: state.id,
            };
            onFire(newBullet);
          }
        }
      }
    }

    if (isHost()) {
      state.setState("pos", rigidbody.current.translation());
    } else {
      const pos = state.getState("pos");
      if (pos) {
        rigidbody.current.setTranslation(pos);
      }
    }
  });
  const cameraControls = useRef();
  const directionalLight = useRef();

  useEffect(() => {
    if (character.current && userPlayer) {
      directionalLight.current.target = character.current;
    }
  }, [character.current]);

  return (
    <group {...props} ref={group}>
      {userPlayer && <CameraControls 
        ref={cameraControls} 
        dampingFactor={0} 
        draggingDampingFactor={0}
        smoothTime={0}
      />}
      <RigidBody
        ref={rigidbody}
        colliders={false}
        linearDamping={12}
        lockRotations
        type={isHost() ? "dynamic" : "kinematicPosition"}
        onIntersectionEnter={({ other }) => {
          if (
            isHost() &&
            other.rigidBody.userData.type === "bullet" &&
            state.state.health > 0
          ) {
            const newHealth =
              state.state.health - other.rigidBody.userData.damage;
            if (newHealth <= 0) {
              state.setState("deaths", state.state.deaths + 1);
              state.setState("dead", true);
              state.setState("health", 0);
              rigidbody.current.setEnabled(false);
              setTimeout(() => {
                spawnRandomly();
                rigidbody.current.setEnabled(true);
                state.setState("health", 100);
                state.setState("dead", false);
              }, 2000);
              onKilled(state.id, other.rigidBody.userData.player);
            } else {
              state.setState("health", newHealth);
            }
          }
        }}
      >
        <PlayerInfo state={state.state} />
        <group ref={character}>
          {(!userPlayer || state.state.dead) && (
            <CharacterSoldier
              color={state.state.profile?.color}
              animation={animation}
              weapon={weapon}
            />
          )}
        </group>
        {userPlayer && (
          // Finally I moved the light to follow the player
          // This way we won't need to calculate ALL the shadows but only the ones
          // that are in the camera view
          <directionalLight
            ref={directionalLight}
            position={[25, 18, -25]}
            intensity={0.3}
            castShadow={!downgradedPerformance} // Disable shadows on low-end devices
            shadow-camera-near={0}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
        )}
        <CapsuleCollider args={[0.7, 0.6]} position={[0, 1.28, 0]} />
      </RigidBody>
    </group>
  );
};

const PlayerInfo = ({ state }) => {
  const health = state.health;
  const name = state.profile.name;
  return (
    <Billboard position-y={2.5}>
      <Text position-y={0.36} fontSize={0.4}>
        {name}
        <meshBasicMaterial color={state.profile.color} />
      </Text>
      <mesh position-z={-0.1}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="black" transparent opacity={0.5} />
      </mesh>
      <mesh scale-x={health / 100} position-x={-0.5 * (1 - health / 100)}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </Billboard>
  );
};
