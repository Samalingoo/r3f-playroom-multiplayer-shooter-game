import { RigidBody, vec3 } from "@react-three/rapier";
import { isHost } from "playroomkit";
import { useEffect, useRef } from "react";
import { MeshBasicMaterial } from "three";
import { WEAPON_OFFSET } from "./CharacterController";

const BULLET_SPEED = 20;

const bulletMaterial = new MeshBasicMaterial({
  color: "hotpink",
  toneMapped: false,
});

bulletMaterial.color.multiplyScalar(42);

export const Bullet = ({ player, position, angle, rotationX = 0, onHit }) => {
  const rigidbody = useRef();

  useEffect(() => {
    const audio = new Audio("/audios/rifle.mp3");
    audio.play();
    
    // Calculate velocity with both horizontal and vertical components
    const velocity = {
      x: Math.sin(angle) * Math.cos(rotationX) * BULLET_SPEED,
      y: Math.sin(rotationX) * BULLET_SPEED, // Vertical component
      z: Math.cos(angle) * Math.cos(rotationX) * BULLET_SPEED,
    };

    rigidbody.current.setLinvel(velocity, true);
  }, []);

  return (
    <group position={[position.x, position.y, position.z]}>
      <group
        position-x={WEAPON_OFFSET.x}
        position-y={WEAPON_OFFSET.y}
        position-z={WEAPON_OFFSET.z}
        rotation-y={angle}
        rotation-x={rotationX}
      >
        <RigidBody
          ref={rigidbody}
          gravityScale={0}
          onIntersectionEnter={(e) => {
            if (isHost() && e.other.rigidBody.userData?.type !== "bullet") {
              rigidbody.current.setEnabled(false);
              onHit(vec3(rigidbody.current.translation()));
            }
          }}
          sensor
          userData={{
            type: "bullet",
            player,
            damage: 10,
          }}
        >
          <mesh position-z={0.25} material={bulletMaterial} castShadow>
            <boxGeometry args={[0.05, 0.05, 0.5]} />
          </mesh>
        </RigidBody>
      </group>
    </group>
  );
};
