import * as THREE from 'three';

// Helper function for smooth morphing
export const lerpMorphTarget = (groupRef, smileIntensity, target, value, speed = 0.1) => {
  if (!groupRef.current) return;

  groupRef.current.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
          const index = child.morphTargetDictionary[target];
          if (index === undefined || child.morphTargetInfluences[index] === undefined) return;

          child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              value * smileIntensity,
              speed
          );
      }
  });
};