import * as THREE from 'three';

export class FlagFactory {
  static createFlagMesh(svgContent, width = 3, height = 2) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 256, 256);
      texture.needsUpdate = true;
      URL.revokeObjectURL(url);
    };
    img.src = url;

    const geometry = new THREE.PlaneGeometry(width, height, 30, 20);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uWindSpeed: { value: 2.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWindSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z = sin(pos.x * 2.0 + uTime * uWindSpeed) * 0.12 * sin(pos.y * 1.5 + uTime * uWindSpeed);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `,
      side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
  }
}
