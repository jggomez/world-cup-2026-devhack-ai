import * as THREE from 'three';
import { FlagFactory } from './FlagFactory.js';
import { SoccerBallHero } from './SoccerBallHero.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.isActive = false;
    this.flags = [];
    this.soccerBallHero = null;
  }

  init(canvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d0f14');

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvasElement.clientWidth / canvasElement.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  animate() {
    if (!this.isActive) return;
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();
    
    // Update the soccer ball hero effects if running
    if (this.soccerBallHero && this.soccerBallHero.isActive) {
      this.soccerBallHero.update(elapsedTime);
    }

    this.flags.forEach(flag => {
      if (flag.material.uniforms && flag.material.uniforms.uTime) {
        flag.material.uniforms.uTime.value = elapsedTime;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  // Starts the awesome soccer ball entry animation
  startSoccerHero(onCompleteCallback) {
    this.soccerBallHero = new SoccerBallHero(this.scene, this.camera, onCompleteCallback);
    this.soccerBallHero.init();
    this.start();
  }

  loadFlags(svgContentList) {
    this.flags.forEach(flag => this.scene.remove(flag));
    this.flags = [];

    svgContentList.forEach((svgContent, index) => {
      const flagMesh = FlagFactory.createFlagMesh(svgContent);
      flagMesh.position.set((index - 1.5) * 3.5, 0, 0);
      this.scene.add(flagMesh);
      this.flags.push(flagMesh);
    });
  }

  onWindowResize() {
    if (!this.renderer || !this.renderer.domElement || !this.renderer.domElement.parentElement) {
      return;
    }
    const width = this.renderer.domElement.parentElement.clientWidth;
    const height = this.renderer.domElement.parentElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
