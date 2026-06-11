import { gsap } from 'gsap';

export const onAnalysisComplete = (predictedWinnerCode, sceneManager) => {
  if (!sceneManager || !predictedWinnerCode) return;
  
  const targetFlag = sceneManager.flags.find(flag => flag.name === predictedWinnerCode);
  if (targetFlag) {
    gsap.to(targetFlag.rotation, { y: Math.PI * 2, duration: 1.5, ease: 'back.out(1.7)' });
    gsap.to(targetFlag.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.5, yoyo: true, repeat: 1 });
  }
};
