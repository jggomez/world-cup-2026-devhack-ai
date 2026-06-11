import * as THREE from 'three';

export class InteractionManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.onSelectCallback = null;
  }

  init(domElement) {
    domElement.addEventListener('click', (event) => this.onClick(event, domElement));
  }

  onSelect(callback) {
    this.onSelectCallback = callback;
  }

  onClick(event, domElement) {
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / domElement.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const intersects = this.raycaster.intersectObjects(this.sceneManager.flags);

    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      const index = this.sceneManager.flags.indexOf(selectedMesh);
      if (this.onSelectCallback) {
        this.onSelectCallback(index, selectedMesh);
      }
    }
  }
}
