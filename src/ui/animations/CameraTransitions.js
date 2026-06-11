import { gsap } from 'gsap';

export class CameraTransitions {
  static panToBracketStage(camera, stageIndex, totalStages = 5) {
    const targetX = (stageIndex - 2) * 5;
    const targetZ = 8 - Math.abs(stageIndex - 2) * 1.2;

    const timeline = gsap.timeline();
    timeline.to(camera.position, {
      x: targetX,
      y: 0,
      z: targetZ,
      duration: 1.5,
      ease: 'power2.inOut'
    });

    return timeline;
  }

  static resetToOverview(camera) {
    const timeline = gsap.timeline();
    timeline.to(camera.position, {
      x: 0,
      y: 0,
      z: 8,
      duration: 1.2,
      ease: 'power2.out'
    });
    return timeline;
  }
}
