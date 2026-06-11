export class LoopOptimizer {
  static trackVisibility(sceneManagerInstance) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        sceneManagerInstance.stop();
        console.log('WebGL animation loop paused (tab inactive).');
      } else {
        sceneManagerInstance.start();
        console.log('WebGL animation loop resumed.');
      }
    });
  }
}
