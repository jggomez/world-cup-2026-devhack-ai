import * as THREE from 'three';

export class StickerCardPreview {
  constructor(canvasElement, stickerCanvas) {
    this.canvas = canvasElement;
    this.stickerCanvas = stickerCanvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cardMesh = null;
    this.isActive = false;
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const texture = new THREE.CanvasTexture(this.stickerCanvas);
    const geometry = new THREE.PlaneGeometry(2.2, 3.2);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

    this.cardMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.cardMesh);
  }

  start() {
    this.isActive = true;
    this.animate();
  }

  stop() {
    this.isActive = false;
  }

  animate() {
    if (!this.isActive) return;
    requestAnimationFrame(() => this.animate());

    if (this.cardMesh) {
      this.cardMesh.rotation.y += 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateTexture() {
    if (this.cardMesh && this.cardMesh.material.map) {
      this.cardMesh.material.map.needsUpdate = true;
    }
  }
}
