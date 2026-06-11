import * as THREE from 'three';
import gsap from 'gsap';

export class SoccerBallHero {
  constructor(scene, camera, onCompleteCallback) {
    this.scene = scene;
    this.camera = camera;
    this.onComplete = onCompleteCallback;
    this.group = new THREE.Group();
    
    this.goal = new THREE.Group();
    this.ball = null;
    this.ballOrbitGroup = new THREE.Group();
    this.particles = null;
    this.netMesh = null;
    this.shockwave = null;
    this.trailParticles = [];
    this.isActive = true;
    this.clock = new THREE.Clock();
  }

  init() {
    this.scene.add(this.group);

    // Dynamic, angled starting camera looking down the pitch
    this.camera.position.set(-1.0, 3.5, 11);
    this.camera.lookAt(0, 1.0, -10);

    // 1. Create a Classic Soccer Ball texture procedurally
    const ballTexture = this.createSoccerBallTexture();
    const ballGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true
    });
    this.ball = new THREE.Mesh(ballGeo, ballMat);
    this.ball.castShadow = true;
    this.ballOrbitGroup.add(this.ball);
    
    // Position ball at the penalty spot
    this.ballOrbitGroup.position.set(-0.5, 0.5, 5.0);
    this.group.add(this.ballOrbitGroup);

    // 2. Add intersecting glowing neon orbital rings
    this.buildOrbitalRings();

    // 3. Create Goal frame
    this.buildGoal();
    this.group.add(this.goal);

    // 4. Create particle shockwave generator
    this.buildParticles();

    // 5. Create visual impact shockwave ring
    this.buildShockwaveRing();

    // 6. Trigger the dramatic animation timeline
    this.playAnimationSequence();
  }

  createSoccerBallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#111111';

    const rows = 6;
    const cols = 12;
    const w = canvas.width / cols;
    const h = canvas.height / rows;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = c * w + (r % 2 === 0 ? w / 2 : 0);
        const y = r * h;
        
        ctx.beginPath();
        ctx.arc(x, y, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  buildOrbitalRings() {
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xfbbd23, // Bright Latin Gold
      transparent: true,
      opacity: 0.7,
      linewidth: 3
    });

    const ringGeo1 = new THREE.BufferGeometry();
    const points1 = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      points1.push(new THREE.Vector3(0, Math.sin(theta) * 0.75, Math.cos(theta) * 0.75));
    }
    ringGeo1.setFromPoints(points1);
    const ring1 = new THREE.Line(ringGeo1, ringMat);
    this.ballOrbitGroup.add(ring1);

    const ringGeo2 = new THREE.BufferGeometry();
    const points2 = [];
    const ringMat2 = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.7 }); // Pitch green glow
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      points2.push(new THREE.Vector3(Math.cos(theta) * 0.75, 0, Math.sin(theta) * 0.75));
    }
    ringGeo2.setFromPoints(points2);
    const ring2 = new THREE.Line(ringGeo2, ringMat2);
    this.ballOrbitGroup.add(ring2);
  }

  buildGoal() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true });
    this.postMat = postMat;
    const postRadius = 0.1;
    const goalWidth = 6.0;
    const goalHeight = 2.8;
    const goalDepth = 2.0;
    const goalZ = -10;

    this.goal.position.set(0, 0, goalZ);

    const leftPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);
    const leftPost = new THREE.Mesh(leftPostGeo, postMat);
    leftPost.position.set(-goalWidth / 2, goalHeight / 2, 0);
    this.goal.add(leftPost);

    const rightPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);
    const rightPost = new THREE.Mesh(rightPostGeo, postMat);
    rightPost.position.set(goalWidth / 2, goalHeight / 2, 0);
    this.goal.add(rightPost);

    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.position.set(0, goalHeight, 0);
    crossbar.rotation.z = Math.PI / 2;
    this.goal.add(crossbar);

    const netGeo = new THREE.BoxGeometry(goalWidth, goalHeight, goalDepth);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    this.netMesh = new THREE.Mesh(netGeo, netMat);
    this.netMesh.position.set(0, goalHeight / 2, -goalDepth / 2);
    this.goal.add(this.netMesh);
  }

  buildParticles() {
    const count = 750; // Denser explosion
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorsPalette = [
      new THREE.Color('#fbbf24'), // Gold
      new THREE.Color('#10b981'), // Emerald
      new THREE.Color('#f43f5e'), // Rose
      new THREE.Color('#06b6d4')  // Teal
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 1.6;
      positions[i * 3 + 2] = -10; // Point of net impact

      const targetCol = colorsPalette[Math.floor(Math.random() * colorsPalette.length)];
      colors[i * 3] = targetCol.r;
      colors[i * 3 + 1] = targetCol.g;
      colors[i * 3 + 2] = targetCol.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  buildShockwaveRing() {
    const ringGeo = new THREE.RingGeometry(0.1, 0.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Latin Emerald
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.shockwave = new THREE.Mesh(ringGeo, ringMat);
    this.shockwave.position.set(0.6, 2.2, -10.0); // Impact coordinate
    this.group.add(this.shockwave);
  }

  playAnimationSequence() {
    const tl = gsap.timeline();
    const duration = 1.3; // Fast whip shot

    // 1. Ball Path: Fast spin-curve acceleration towards goal
    tl.to(this.ballOrbitGroup.position, {
      x: 0.6,
      y: 2.2,
      z: -10.0,
      duration: duration,
      ease: 'power3.in'
    });

    tl.to(this.ball.rotation, {
      x: Math.PI * 18,
      y: Math.PI * 9,
      duration: duration,
      ease: 'none'
    }, 0);

    tl.to(this.ballOrbitGroup.rotation, {
      y: Math.PI * 6,
      z: Math.PI * 3,
      duration: duration,
      ease: 'power2.out'
    }, 0);

    // 2. Bullet-time Camera: Zoom alongside ball, then dramatic slowdown at the goalmouth
    tl.to(this.camera.position, {
      x: -1.8,
      y: 2.8,
      z: -3.5, // Close details inside the box
      duration: duration,
      ease: 'power2.out'
    }, 0);

    tl.to(this.camera, {
      onUpdate: () => {
        if (this.ballOrbitGroup) {
          this.camera.lookAt(this.ballOrbitGroup.position);
        }
      },
      duration: duration
    }, 0);

    // 3. Goalmouth Impact Trigger: shockwave, net flex, and slow-motion expansion
    tl.to(this.netMesh.scale, {
      z: 2.2,
      duration: 0.12,
      ease: 'power3.out',
      onStart: () => {
        this.triggerGoalExplosion();
        this.triggerShockwave();
      }
    }, duration);

    tl.to(this.netMesh.scale, {
      z: 1.0,
      duration: 1.2,
      ease: 'elastic.out(1, 0.3)'
    }, duration + 0.12);
  }

  spawnTrailParticle() {
    if (!this.ballOrbitGroup || !this.isActive) return;

    const colors = [0xfbbd23, 0x10b981, 0xf43f5e, 0x06b6d4];
    const randCol = colors[Math.floor(Math.random() * colors.length)];

    const trailGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const trailMat = new THREE.MeshBasicMaterial({
      color: randCol,
      transparent: true,
      opacity: 0.85
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.copy(this.ballOrbitGroup.position);
    
    trail.position.x += (Math.random() - 0.5) * 0.18;
    trail.position.y += (Math.random() - 0.5) * 0.18;
    trail.position.z += (Math.random() - 0.5) * 0.18;

    this.group.add(trail);
    this.trailParticles.push(trail);

    gsap.to(trail.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.6 });
    gsap.to(trail.material, {
      opacity: 0,
      duration: 0.6,
      onComplete: () => {
        this.group.remove(trail);
        trailGeo.dispose();
        trailMat.dispose();
        this.trailParticles = this.trailParticles.filter(p => p !== trail);
      }
    });
  }

  triggerShockwave() {
    if (!this.shockwave) return;
    this.shockwave.material.opacity = 1.0;
    
    gsap.to(this.shockwave.scale, {
      x: 42,
      y: 42,
      z: 42,
      duration: 1.6,
      ease: 'power2.out'
    });
    
    gsap.to(this.shockwave.material, {
      opacity: 0,
      duration: 1.6,
      ease: 'power2.out'
    });
  }

  triggerGoalExplosion() {
    this.particles.material.opacity = 1.0;

    const positions = this.particles.geometry.attributes.position.array;
    const targets = [];
    
    for (let i = 0; i < positions.length / 3; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const force = 6.0 + Math.random() * 12.0;

      targets.push(0.6 + force * Math.sin(phi) * Math.cos(theta));
      targets.push(2.2 + force * Math.sin(phi) * Math.sin(theta));
      targets.push(-10.5 + force * Math.cos(phi));
    }

    // Majestic slow-motion expansion of colorful confetti particles
    gsap.to(positions, {
      endArray: targets,
      duration: 2.2,
      ease: 'expo.out',
      onUpdate: () => {
        this.particles.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Slow cinematic fade-out of the scene
    gsap.to([
      this.ball.material, 
      this.netMesh.material, 
      this.particles.material, 
      this.postMat,
      this.shockwave.material
    ], {
      opacity: 0,
      duration: 1.6,
      ease: 'power1.inOut',
      onComplete: () => {
        this.cleanup();
        if (this.onComplete) this.onComplete();
      }
    });
  }

  update(elapsedTime) {
    if (!this.isActive) return;

    const time = this.clock.getElapsedTime();
    if (time < 1.3) {
      this.spawnTrailParticle();
    }
  }

  cleanup() {
    this.isActive = false;
    this.scene.remove(this.group);
    
    if (this.ball) {
      this.ball.geometry.dispose();
      this.ball.material.dispose();
    }
    if (this.netMesh) {
      this.netMesh.geometry.dispose();
      this.netMesh.material.dispose();
    }
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
    if (this.shockwave) {
      this.shockwave.geometry.dispose();
      this.shockwave.material.dispose();
    }
    this.trailParticles.forEach(p => {
      this.group.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    });
  }
}
