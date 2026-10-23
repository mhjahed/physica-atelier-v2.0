import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  stepProjectile3D,
  simulateTrajectoryPreview,
  computeAirfoilAerodynamics,
  computeIdealGasProperties,
  confineGasParticle,
  computeCircuitState,
  wavelengthNmToHex,
  computeDoubleSlitIntensity,
  computePhotonEnergyEv,
  computePendulumPeriod,
  computeSnellRefraction,
  resolveSpherePairCollision,
  computeInclinedPlaneAcceleration
} from '../physics/calculations.js';

export class SceneManager {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.onTelemetry = callbacks.onTelemetry || (() => {});
    this.onEvent = callbacks.onEvent || (() => {});

    this.zone = 'dynamics';
    this.timeScale = 1.0;
    this.paused = false;
    this.showVectors = true;
    this.stepRequested = false;
    this.webglSupported = true;

    // Calibrated parameters for all 8 labs (framed cleanly inside viewport on initial load)
    this.params = {
      dynamics: { angle: 44, azimuth: 0, velocity: 18.0, mass: 6, drag: 12, windZ: 0, showPrediction: true },
      aerodynamics: { windSpeed: 28, airDensity: 1.225, angleOfAttack: 7 },
      thermodynamics: { temperature: 300, volume: 48, moles: 1.5 },
      electromagnetism: { voltage: 9, resistance: 360, capacitance: 470, switchClosed: true },
      quantum: { wavelength: 532, slitSeparation: 2.2, detectorActive: false },
      pendulum: { length: 1.0, mass: 3.0, gravity: 9.81, releaseAngle: 22, damping: 0.02 },
      optics: { incidentAngle: 36, n1: 1.0, n2: 1.52 },
      sandbox: { gravity: 9.81, restitution: 0.82, rampAngle: 24, friction: 0.4, spawnType: 'sphere' }
    };

    this.stageLevel = 1;
    this.score = 0;
    this.zoneRoot = null;
    this.disposables = [];
    this.telemetry = {};
    this.stateData = {};

    this.initRenderer();
    if (this.webglSupported) {
      this.setupStudioEnvironment();
      this.loadZone('dynamics');
      this.bindResize();
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }
  }

  initRenderer() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF2F0EA);
    this.scene.fog = new THREE.Fog(0xF2F0EA, 55, 145);

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 560;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    this.camera.position.set(0, 14, 34);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        preserveDrawingBuffer: true
      });
    } catch (err) {
      this.webglSupported = false;
      this.renderFallbackMessage(err?.message || 'WebGL context unavailable');
      return;
    }

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 75;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.target.set(0, 3.5, 0);

    this.clock = new THREE.Clock();
  }

  renderFallbackMessage(reason) {
    this.container.innerHTML = `
      <div style="padding:2rem;max-width:480px;margin:auto;text-align:left;color:#14181F;font-family:Georgia,serif;">
        <p style="font-family:monospace;font-size:0.75rem;color:#B83A2D;margin-bottom:0.5rem;">HARDWARE ACCELERATION NOTICE</p>
        <h3 style="margin-bottom:0.6rem;">3D Laboratory Viewport Inactive</h3>
        <p style="font-family:system-ui,sans-serif;font-size:0.9rem;color:#49505B;line-height:1.5;">
          Your browser environment reported: <code>${reason}</code>. All live 2D oscilloscope graphs, equations, and numerical simulations remain operational.
        </p>
      </div>
    `;
  }

  setupStudioEnvironment() {
    // Procedural European daylight studio reflection map (zero external network fetches)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Soft daylight hemisphere + crisp directional north-window sun
    const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xD8D2C5, 0.85);
    hemi.position.set(0, 40, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xFFFDF8, 1.35);
    sun.position.set(18, 34, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 95;
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xE3ECF5, 0.45);
    fill.position.set(-20, 14, -14);
    this.scene.add(fill);

    // Calibrated architectural laboratory floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xEAE6DD,
      roughness: 0.88,
      metalness: 0.02
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Major 5m & minor 1m drafting grids
    const minorGrid = new THREE.GridHelper(80, 80, 0xC6C1B5, 0xDCD8CE);
    minorGrid.position.y = 0.005;
    minorGrid.material.transparent = true;
    minorGrid.material.opacity = 0.55;
    this.scene.add(minorGrid);

    const majorGrid = new THREE.GridHelper(80, 16, 0x8F96A2, 0xB5B0A4);
    majorGrid.position.y = 0.01;
    majorGrid.material.transparent = true;
    majorGrid.material.opacity = 0.65;
    this.scene.add(majorGrid);

    // Shared PBR studio materials library
    this.materials = {
      brass: new THREE.MeshStandardMaterial({ color: 0xC59B48, metalness: 0.86, roughness: 0.24 }),
      steel: new THREE.MeshStandardMaterial({ color: 0xC8D0D8, metalness: 0.82, roughness: 0.28 }),
      castIron: new THREE.MeshStandardMaterial({ color: 0x2B313A, metalness: 0.55, roughness: 0.52 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xC86D44, metalness: 0.88, roughness: 0.22 }),
      oak: new THREE.MeshStandardMaterial({ color: 0xB99362, metalness: 0.05, roughness: 0.72 }),
      cobalt: new THREE.MeshStandardMaterial({ color: 0x164863, metalness: 0.35, roughness: 0.35 }),
      vermilion: new THREE.MeshStandardMaterial({ color: 0xB83A2D, metalness: 0.25, roughness: 0.35 }),
      // Non-occluding crystal laboratory glass (depthWrite: false keeps internal streamlines & tracers crisp!)
      glass: new THREE.MeshStandardMaterial({
        color: 0xCFE4F2,
        metalness: 0.12,
        roughness: 0.08,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    };
  }

  disposeObjectTree(root) {
    if (!root) return;
    root.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          // Do not dispose shared studio library materials
          const isShared = Object.values(this.materials || {}).includes(m);
          if (!isShared) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        });
      }
    });
    if (root.parent) root.parent.remove(root);
  }

  clearCurrentZone() {
    if (this.zoneRoot) {
      this.disposeObjectTree(this.zoneRoot);
      this.zoneRoot = null;
    }
    this.stateData = {};
    this.telemetry = {};
  }

  setCameraPreset(preset = 'isometric') {
    if (!this.webglSupported) return;
    if (preset === 'elevation') {
      this.camera.position.set(0, 7.5, 36);
      this.controls.target.set(0, 4.5, 0);
    } else if (preset === 'plan') {
      this.camera.position.set(0, 38, 0.01);
      this.controls.target.set(0, 0, 0);
    } else {
      this.camera.position.set(12, 14, 32);
      this.controls.target.set(0, 3.8, 0);
    }
    this.controls.update();
  }

  makeScaleSprite(text, worldPos, color = '#14181F') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(4, 8, 248, 48);
    ctx.strokeStyle = '#C8C3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 8, 248, 48);
    ctx.fillStyle = color;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 33);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.4, 0.85, 1);
    sprite.position.copy(worldPos);
    return sprite;
  }

  loadZone(zoneName) {
    if (!this.webglSupported) return;
    this.clearCurrentZone();
    this.zone = zoneName;
    this.zoneRoot = new THREE.Group();
    this.scene.add(this.zoneRoot);

    switch (zoneName) {
      case 'dynamics': this.buildDynamicsZone(); break;
      case 'aerodynamics': this.buildAerodynamicsZone(); break;
      case 'thermodynamics': this.buildThermodynamicsZone(); break;
      case 'electromagnetism': this.buildElectromagnetismZone(); break;
      case 'quantum': this.buildQuantumZone(); break;
      case 'pendulum': this.buildPendulumZone(); break;
      case 'optics': this.buildOpticsZone(); break;
      case 'sandbox': this.buildSandboxZone(); break;
    }
  }

  // =========================================================================
  // MODULE 01: DYNAMICS & BALLISTICS LAB
  // =========================================================================
  buildDynamicsZone() {
    this.camera.position.set(1.0, 13.5, 41);
    this.controls.target.set(1.0, 4.2, 0);
    this.controls.update();

    // Distance markers along X bench
    [-15, -5, 5, 15, 25].forEach((x) => {
      const lbl = this.makeScaleSprite(`${x > 0 ? '+' : ''}${x} m`, new THREE.Vector3(x, 0.45, 5.2), '#49505B');
      this.zoneRoot.add(lbl);
    });

    // Oak & cast-iron cannon base at X = -16
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.6, 2.8), this.materials.oak);
    basePlinth.position.set(-16, 0.3, 0);
    basePlinth.castShadow = true;
    basePlinth.receiveShadow = true;
    this.zoneRoot.add(basePlinth);

    // Turntable yaw group (rotates around Y by azimuth!)
    const yawGroup = new THREE.Group();
    yawGroup.position.set(-16, 0.6, 0);
    this.zoneRoot.add(yawGroup);

    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.35, 32), this.materials.castIron);
    turntable.position.y = 0.18;
    turntable.castShadow = true;
    yawGroup.add(turntable);

    // Trunnion cheeks
    [-0.55, 0.55].forEach((zOff) => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.16), this.materials.castIron);
      cheek.position.set(0, 0.72, zOff);
      cheek.castShadow = true;
      yawGroup.add(cheek);
    });

    // Hinged barrel group pivoting around breech trunnion pin at (0, 1.0, 0)
    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(0, 1.0, 0);
    yawGroup.add(pitchGroup);

    // Machined brass cannon barrel pointing along +X when angle = 0!
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 2.5, 24), this.materials.brass);
    barrel.rotation.z = -Math.PI / 2; // +Y cylinder laid along +X!
    barrel.position.x = 0.95;
    barrel.castShadow = true;
    pitchGroup.add(barrel);

    const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 12, 24), this.materials.steel);
    muzzleRing.rotation.y = Math.PI / 2;
    muzzleRing.position.x = 2.2;
    pitchGroup.add(muzzleRing);

    // Calibrated Target Assembly
    const targetGroup = new THREE.Group();
    const targetPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.22, 36), this.materials.oak);
    targetPedestal.position.y = 0.11;
    targetPedestal.receiveShadow = true;
    targetGroup.add(targetPedestal);

    const ringSpecs = [
      { r: 2.5, c: 0xFFFFFF },
      { r: 2.0, c: 0x164863 },
      { r: 1.5, c: 0xFFFFFF },
      { r: 1.0, c: 0xB83A2D },
      { r: 0.48, c: 0xC59B48 }
    ];
    ringSpecs.forEach((spec, idx) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.r, spec.r, 0.05, 36),
        new THREE.MeshStandardMaterial({ color: spec.c, roughness: 0.45, metalness: 0.1 })
      );
      m.position.y = 0.23 + idx * 0.015;
      m.receiveShadow = true;
      targetGroup.add(m);
    });
    targetGroup.position.set(17, 0, 0);
    this.zoneRoot.add(targetGroup);

    // Predicted drag trajectory curve (solid cobalt) & vacuum reference (dashed grey)
    const dragLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x164863 })
    );
    this.zoneRoot.add(dragLine);

    const vacLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0x7A828F, dashSize: 0.55, gapSize: 0.35 })
    );
    this.zoneRoot.add(vacLine);

    // Predicted floor reticle ring
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.46, 28),
      new THREE.MeshBasicMaterial({ color: 0x164863, side: THREE.DoubleSide })
    );
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.y = 0.04;
    this.zoneRoot.add(reticle);

    // Live vector helpers for active projectile
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0x164863, 0.45, 0.26);
    const dragArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1.5, 0xB83A2D, 0.4, 0.24);
    velArrow.visible = false;
    dragArrow.visible = false;
    this.zoneRoot.add(velArrow, dragArrow);

    this.stateData = {
      yawGroup,
      pitchGroup,
      targetGroup,
      dragLine,
      vacLine,
      reticle,
      velArrow,
      dragArrow,
      projectiles: [],
      lastHitDist: null
    };

    this.refreshDynamicsPrediction();
  }

  refreshDynamicsPrediction() {
    if (this.zone !== 'dynamics' || !this.stateData.pitchGroup) return;
    const p = this.params.dynamics;
    // Positive elevation tilts +X barrel UP (+Y) via POSITIVE rotation around +Z!
    this.stateData.pitchGroup.rotation.z = (p.angle * Math.PI) / 180;
    // Azimuth rotates turntable so +Z target corresponds cleanly to positive azimuth angle:
    // In Three.js, rotating around Y by -azimuth moves (+X, 0, 0) to (cos(az), 0, sin(az))!
    this.stateData.yawGroup.rotation.y = (-p.azimuth * Math.PI) / 180;

    const dragSim = simulateTrajectoryPreview({
      launchOrigin: { x: -16, y: 1.6, z: 0 },
      velocity: p.velocity,
      elevationDeg: p.angle,
      azimuthDeg: p.azimuth,
      mass: p.mass,
      dragPercent: p.drag,
      windZ: p.windZ
    });

    const vacSim = simulateTrajectoryPreview({
      launchOrigin: { x: -16, y: 1.6, z: 0 },
      velocity: p.velocity,
      elevationDeg: p.angle,
      azimuthDeg: p.azimuth,
      mass: p.mass,
      dragPercent: 0,
      windZ: 0
    });

    this.stateData.dragLine.visible = p.showPrediction;
    this.stateData.vacLine.visible = p.showPrediction;
    this.stateData.reticle.visible = p.showPrediction;

    this.stateData.dragLine.geometry.setFromPoints(
      dragSim.points.map((pt) => new THREE.Vector3(pt.x, pt.y, pt.z))
    );
    this.stateData.vacLine.geometry.setFromPoints(
      vacSim.points.map((pt) => new THREE.Vector3(pt.x, pt.y, pt.z))
    );
    this.stateData.vacLine.computeLineDistances();

    this.stateData.reticle.position.set(dragSim.impact.x, 0.04, dragSim.impact.z);
    this.stateData.previewSim = dragSim;
    this.stateData.vacuumSim = vacSim;
  }

  triggerPrimaryAction() {
    if (this.zone === 'dynamics') {
      this.fireProjectile();
    } else if (this.zone === 'electromagnetism') {
      this.params.electromagnetism.switchClosed = !this.params.electromagnetism.switchClosed;
      this.stateData.switchElapsed = 0;
    } else if (this.zone === 'quantum') {
      this.clearQuantumScreen();
    } else if (this.zone === 'pendulum') {
      this.resetPendulumSwing();
    } else if (this.zone === 'sandbox') {
      this.spawnSandboxBody();
    }
  }

  fireProjectile() {
    if (this.zone !== 'dynamics') return;
    const p = this.params.dynamics;
    const d = this.stateData;

    if (d.projectiles.length >= 4) {
      const oldest = d.projectiles.shift();
      this.disposeObjectTree(oldest.mesh);
      this.disposeObjectTree(oldest.trail);
    }

    const elev = (p.angle * Math.PI) / 180;
    const azim = (p.azimuth * Math.PI) / 180;
    const radius = 0.22 + p.mass * 0.014;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 24),
      this.materials.vermilion
    );
    sphere.castShadow = true;

    const startPos = {
      x: -16 + Math.cos(elev) * Math.cos(azim) * 2.2,
      y: 1.6 + Math.sin(elev) * 2.2,
      z: Math.cos(elev) * Math.sin(azim) * 2.2
    };
    sphere.position.set(startPos.x, startPos.y, startPos.z);
    this.zoneRoot.add(sphere);

    const trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xB83A2D })
    );
    this.zoneRoot.add(trail);

    const vh = p.velocity * Math.cos(elev);
    d.projectiles.push({
      mesh: sphere,
      trail,
      radius,
      pos: { ...startPos },
      vel: {
        x: vh * Math.cos(azim),
        y: p.velocity * Math.sin(elev),
        z: vh * Math.sin(azim)
      },
      mass: p.mass,
      dragPercent: p.drag,
      points: [sphere.position.clone()],
      active: true
    });

    this.onEvent({
      type: 'info',
      title: 'Shot Released',
      detail: `${p.velocity} m/s at θ = ${p.angle}°, φ = ${p.azimuth}°, mass = ${p.mass} kg`
    });
  }

  advanceDynamicsStage() {
    if (this.zone !== 'dynamics' || !this.stateData.targetGroup) return;
    this.stageLevel += 1;
    const newX = 14 + ((this.stageLevel * 3.7) % 14);
    const newZ = ((this.stageLevel % 2 === 0 ? 1 : -1) * (2.2 + (this.stageLevel % 3) * 1.6));
    const crossWind = this.stageLevel >= 3 ? ((this.stageLevel % 2 === 0 ? -3.5 : 4.0)) : 0;
    this.stateData.targetGroup.position.set(newX, 0, newZ);
    this.params.dynamics.windZ = crossWind;
    this.refreshDynamicsPrediction();
    this.onEvent({
      type: 'stage',
      title: `Stage 0${this.stageLevel} Target Positioned`,
      detail: `Target at X = +${newX.toFixed(1)} m, Z = ${newZ >= 0 ? '+' : ''}${newZ.toFixed(1)} m${crossWind ? ` (Crosswind ${crossWind} m/s)` : ''}`
    });
  }

  updateDynamics(dt) {
    const d = this.stateData;
    const p = this.params.dynamics;
    let latestActive = null;

    for (let i = d.projectiles.length - 1; i >= 0; i--) {
      const proj = d.projectiles[i];
      if (!proj.active) continue;

      const subSteps = 3;
      const subDt = dt / subSteps;
      let stepOut = null;
      for (let s = 0; s < subSteps; s++) {
        stepOut = stepProjectile3D(proj, subDt, 9.81, p.windZ);
        proj.pos = stepOut.pos;
        proj.vel = stepOut.vel;
        if (proj.pos.y <= proj.radius + 0.22) break;
      }

      proj.mesh.position.set(proj.pos.x, proj.pos.y, proj.pos.z);
      proj.points.push(proj.mesh.position.clone());
      if (proj.points.length > 220) proj.points.shift();
      proj.trail.geometry.setFromPoints(proj.points);
      latestActive = { proj, stepOut };

      // Ground/target plane collision check
      if (proj.pos.y <= proj.radius + 0.22) {
        proj.pos.y = proj.radius + 0.22;
        proj.mesh.position.y = proj.pos.y;
        proj.active = false;

        const tx = d.targetGroup.position.x;
        const tz = d.targetGroup.position.z;
        const dist = Math.hypot(proj.pos.x - tx, proj.pos.z - tz);
        d.lastHitDist = dist;

        if (dist <= 2.5) {
          const pts = dist <= 0.5 ? 1000 : dist <= 1.2 ? 600 : 300;
          this.score += pts;
          this.onEvent({
            type: 'hit',
            title: dist <= 0.5 ? 'Bullseye Impact Verified' : 'Target Ring Impact',
            detail: `Radial miss: ${dist.toFixed(2)} m · +${pts} pts`,
            score: this.score,
            dist
          });
        } else {
          this.onEvent({
            type: 'miss',
            title: 'Downrange Impact Logged',
            detail: `Landed ${dist.toFixed(2)} m from target center (X=${proj.pos.x.toFixed(1)}m, Z=${proj.pos.z.toFixed(1)}m)`
          });
        }
      }
    }

    if (latestActive && this.showVectors) {
      const { proj, stepOut } = latestActive;
      const speed = Math.hypot(proj.vel.x, proj.vel.y, proj.vel.z);
      d.velArrow.visible = speed > 0.2;
      if (speed > 0.2) {
        d.velArrow.position.copy(proj.mesh.position);
        d.velArrow.setDirection(new THREE.Vector3(proj.vel.x, proj.vel.y, proj.vel.z).normalize());
        d.velArrow.setLength(Math.min(5, speed * 0.14), 0.45, 0.24);
      }
      d.dragArrow.visible = stepOut.dragForceMagnitude > 0.2;
      if (stepOut.dragForceMagnitude > 0.2) {
        d.dragArrow.position.copy(proj.mesh.position);
        d.dragArrow.setDirection(new THREE.Vector3(-proj.vel.x, -proj.vel.y, -proj.vel.z).normalize());
        d.dragArrow.setLength(Math.min(4.2, stepOut.dragForceMagnitude * 0.12), 0.4, 0.22);
      }
    } else if (d.velArrow) {
      d.velArrow.visible = false;
      d.dragArrow.visible = false;
    }

    const activeProj = latestActive?.proj || d.projectiles[d.projectiles.length - 1] || null;
    this.telemetry = {
      predictedRangeX: d.previewSim?.impact.x ?? 0,
      vacuumRangeX: d.vacuumSim?.impact.x ?? 0,
      apexHeight: d.previewSim?.apexHeight ?? 0,
      targetX: d.targetGroup.position.x,
      targetZ: d.targetGroup.position.z,
      windZ: p.windZ,
      lastHitDist: d.lastHitDist,
      currentSpeed: activeProj ? Math.hypot(activeProj.vel.x, activeProj.vel.y, activeProj.vel.z) : p.velocity,
      activePos: activeProj ? { ...activeProj.pos } : null,
      previewPoints: d.previewSim?.points || [],
      vacuumPoints: d.vacuumSim?.points || [],
      stageLevel: this.stageLevel
    };
  }

  // =========================================================================
  // MODULE 02: SUBSONIC WIND TUNNEL & NACA 2412 STALL LAB
  // =========================================================================
  buildAerodynamicsZone() {
    this.camera.position.set(0, 8.5, 22);
    this.controls.target.set(0, 5.2, 0);
    this.controls.update();

    // Aluminum framed glass test section
    const chamberGlass = new THREE.Mesh(new THREE.BoxGeometry(24, 8.5, 9), this.materials.glass);
    chamberGlass.position.set(0, 5.2, 0);
    this.zoneRoot.add(chamberGlass);

    // Extruded aluminum corner beams
    const beamOffsets = [
      [-12, 1.0, -4.5], [-12, 1.0, 4.5], [-12, 9.4, -4.5], [-12, 9.4, 4.5]
    ];
    beamOffsets.forEach(([, y, z]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.22, 0.22), this.materials.steel);
      rail.position.set(0, y, z);
      this.zoneRoot.add(rail);
    });

    // Sting balance pylon on floor
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 5.0, 20), this.materials.castIron);
    pylon.position.set(0, 2.5, 0);
    this.zoneRoot.add(pylon);

    // NACA 2412 Cambered Airfoil group pivoted about quarter-chord!
    const wingPivot = new THREE.Group();
    wingPivot.position.set(0, 5.2, 0);
    this.zoneRoot.add(wingPivot);

    const shape = new THREE.Shape();
    // Leading edge at x = -1.2, trailing edge at x = +3.3 (quarter-chord = 0,0!)
    shape.moveTo(-1.2, 0);
    shape.bezierCurveTo(-1.18, 0.42, -0.2, 0.58, 3.3, 0.03);
    shape.bezierCurveTo(3.35, 0.0, 3.35, -0.02, 3.3, -0.04);
    shape.bezierCurveTo(0.8, -0.14, -0.9, -0.22, -1.2, 0);

    const wingGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 6.4,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      curveSegments: 32
    });
    wingGeo.translate(0, 0, -3.2);
    const wingMesh = new THREE.Mesh(wingGeo, this.materials.steel);
    wingMesh.castShadow = true;
    wingPivot.add(wingMesh);

    // 11 continuous curved streamline ribbons across upper/lower camber
    const ribbons = [];
    for (let s = 0; s < 11; s++) {
      const yBase = 2.0 + s * 0.64;
      const lineGeo = new THREE.BufferGeometry();
      const isUpper = yBase > 5.2;
      const lineMat = new THREE.LineBasicMaterial({
        color: isUpper ? 0x164863 : 0x5B6777,
        transparent: true,
        opacity: 0.78
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.zoneRoot.add(line);
      ribbons.push({ line, yBase });
    }

    // Smoke tracer particles riding the real streamlines
    const count = 260;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(count * 3);
    const pSeeds = [];
    for (let i = 0; i < count; i++) {
      const seed = {
        x: -11.5 + Math.random() * 23,
        yBase: 1.8 + Math.random() * 6.8,
        z: (Math.random() - 0.5) * 6.2,
        phase: Math.random() * Math.PI * 2
      };
      pSeeds.push(seed);
      pPos[i * 3] = seed.x;
      pPos[i * 3 + 1] = seed.yBase;
      pPos[i * 3 + 2] = seed.z;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const smokePoints = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0x164863, size: 0.14, transparent: true, opacity: 0.85 })
    );
    this.zoneRoot.add(smokePoints);

    // Live Lift (vertical cobalt) & Drag (horizontal vermilion) arrows
    const liftArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 5.2, 0), 2.5, 0x164863, 0.5, 0.28);
    const dragArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 5.2, 0), 1.5, 0xB83A2D, 0.45, 0.24);
    this.zoneRoot.add(liftArrow, dragArrow);

    this.stateData = { wingPivot, ribbons, smokePoints, pSeeds, liftArrow, dragArrow };
  }

  sampleStreamlineY(x, yBase, aoaDeg, stalled, time) {
    const dy = yBase - 5.2;
    const aoaRad = (aoaDeg * Math.PI) / 180;
    // Potential-flow style dipole deflection + circulation downwash + separated wake turbulence
    const r2 = x * x + dy * dy + 1.4;
    const thicknessBump = (1.35 * dy) / r2;
    const circulationLift = (aoaRad * 2.4) * Math.exp(-(x * x) / 14) - (aoaRad * 1.35) * (1 / (1 + Math.exp(-x * 0.7)));
    let wakeJitter = 0;
    if (stalled && x > -0.4 && dy > -0.3 && dy < 2.6) {
      wakeJitter = Math.sin(x * 2.4 - time * 9.0 + yBase * 3.1) * 0.42 * Math.min(1, (x + 0.5) / 3);
    }
    return yBase + thicknessBump + circulationLift + wakeJitter;
  }

  updateAerodynamics(dt, time) {
    const p = this.params.aerodynamics;
    const d = this.stateData;
    const aero = computeAirfoilAerodynamics({
      windSpeed: p.windSpeed,
      airDensity: p.airDensity,
      angleOfAttackDeg: p.angleOfAttack
    });

    // Wind travels -X -> +X: positive Angle of Attack MUST raise the leading edge (-X) UP (+Y),
    // which is NEGATIVE Z rotation in right-handed coordinates! (Fixes v1 inverted pitch bug!)
    d.wingPivot.rotation.z = (-p.angleOfAttack * Math.PI) / 180;

    // Update curved streamline ribbons
    d.ribbons.forEach(({ line, yBase }) => {
      const pts = [];
      for (let x = -11.5; x <= 11.5; x += 0.5) {
        const y = this.sampleStreamlineY(x, yBase, p.angleOfAttack, aero.stalled, time);
        pts.push(new THREE.Vector3(x, y, 0));
      }
      line.geometry.setFromPoints(pts);
      line.material.color.setHex(aero.stalled && yBase > 5.0 ? 0xB83A2D : (yBase > 5.2 ? 0x164863 : 0x6C7785));
    });

    // Advance tracer particles with local Bernoulli speedup over upper surface
    const arr = d.smokePoints.geometry.attributes.position.array;
    for (let i = 0; i < d.pSeeds.length; i++) {
      const s = d.pSeeds[i];
      const upperBoost = s.yBase > 5.2 && Math.abs(s.x) < 3.5 ? 1.32 : 1.0;
      s.x += p.windSpeed * 0.22 * upperBoost * dt;
      if (s.x > 11.5) s.x = -11.5;
      arr[i * 3] = s.x;
      arr[i * 3 + 1] = this.sampleStreamlineY(s.x, s.yBase, p.angleOfAttack, aero.stalled, time + s.phase * 0.1);
      arr[i * 3 + 2] = s.z;
    }
    d.smokePoints.geometry.attributes.position.needsUpdate = true;

    // Force vectors
    d.liftArrow.visible = this.showVectors && Math.abs(aero.liftN) > 5;
    d.dragArrow.visible = this.showVectors && aero.dragN > 2;
    if (d.liftArrow.visible) {
      d.liftArrow.setDirection(new THREE.Vector3(0, aero.liftN >= 0 ? 1 : -1, 0));
      d.liftArrow.setLength(Math.min(4.5, Math.max(0.6, Math.abs(aero.liftN) / 650)), 0.48, 0.26);
    }
    if (d.dragArrow.visible) {
      d.dragArrow.setDirection(new THREE.Vector3(1, 0, 0));
      d.dragArrow.setLength(Math.min(4.2, Math.max(0.5, aero.dragN / 280)), 0.42, 0.22);
    }

    this.telemetry = { ...aero };
  }

  // =========================================================================
  // MODULE 03: THERMODYNAMICS KINETIC GAS CYLINDER
  // =========================================================================
  buildThermodynamicsZone() {
    this.camera.position.set(10, 10, 20);
    this.controls.target.set(0, 4.8, 0);
    this.controls.update();

    // Cast-iron heater plinth & glowing resistive element
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.6, 0.6, 36), this.materials.castIron);
    plinth.position.y = 0.3;
    plinth.receiveShadow = true;
    this.zoneRoot.add(plinth);

    const heaterRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.16, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0xB83A2D, emissive: 0xB83A2D, emissiveIntensity: 0.4, roughness: 0.4 })
    );
    heaterRing.rotation.x = Math.PI / 2;
    heaterRing.position.y = 0.64;
    this.zoneRoot.add(heaterRing);

    // Borosilicate glass cylinder wall
    const cylinderWall = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 9.6, 40, 1, true),
      this.materials.glass
    );
    cylinderWall.position.y = 5.4;
    this.zoneRoot.add(cylinderWall);

    // Brass tie-rods around glass cylinder
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 10.0, 12), this.materials.brass);
      rod.position.set(Math.cos(ang) * 3.85, 5.4, Math.sin(ang) * 3.85);
      this.zoneRoot.add(rod);
    }

    // Calibrated volume markings alongside glass wall
    [20, 40, 60, 80, 100].forEach((liters) => {
      const h = 0.8 + (liters / 100) * 8.2;
      const sprite = this.makeScaleSprite(`${liters} L`, new THREE.Vector3(5.0, h, 0), '#164863');
      sprite.scale.set(2.3, 0.6, 1);
      this.zoneRoot.add(sprite);
    });

    // Movable steel piston + shaft
    const pistonGroup = new THREE.Group();
    const pistonHead = new THREE.Mesh(new THREE.CylinderGeometry(3.42, 3.42, 0.55, 36), this.materials.steel);
    pistonHead.castShadow = true;
    pistonGroup.add(pistonHead);

    const oRing = new THREE.Mesh(new THREE.TorusGeometry(3.43, 0.06, 10, 36), this.materials.castIron);
    oRing.rotation.x = Math.PI / 2;
    pistonGroup.add(oRing);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 6.0, 18), this.materials.brass);
    shaft.position.y = 3.2;
    pistonGroup.add(shaft);
    this.zoneRoot.add(pistonGroup);

    // Up to 400 gas molecules (count dynamically rendered via drawRange proportional to moles!)
    const maxMolecules = 400;
    const mGeo = new THREE.BufferGeometry();
    const mPos = new Float32Array(maxMolecules * 3);
    const mCol = new Float32Array(maxMolecules * 3);
    const molecules = [];

    for (let i = 0; i < maxMolecules; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * 3.1;
      const m = {
        x: Math.cos(ang) * rad,
        y: 1.0 + Math.random() * 3.5,
        z: Math.sin(ang) * rad,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        vz: (Math.random() - 0.5) * 9
      };
      molecules.push(m);
      mPos[i * 3] = m.x;
      mPos[i * 3 + 1] = m.y;
      mPos[i * 3 + 2] = m.z;
      mCol[i * 3] = 0.09; mCol[i * 3 + 1] = 0.28; mCol[i * 3 + 2] = 0.39;
    }

    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    mGeo.setAttribute('color', new THREE.BufferAttribute(mCol, 3));
    const moleculePoints = new THREE.Points(
      mGeo,
      new THREE.PointsMaterial({ size: 0.2, vertexColors: true })
    );
    this.zoneRoot.add(moleculePoints);

    this.stateData = { pistonGroup, heaterRing, moleculePoints, molecules, maxMolecules };
  }

  updateThermodynamics(dt) {
    const p = this.params.thermodynamics;
    const d = this.stateData;
    const gas = computeIdealGasProperties({
      temperatureK: p.temperature,
      volumeLiters: p.volume,
      moles: p.moles
    });

    const ceilingY = 0.8 + (p.volume / 100) * 8.2;
    d.pistonGroup.position.y = ceilingY + 0.3;

    // Heater thermal glow tracks temperature
    const heatNorm = (p.temperature - 200) / 600;
    d.heaterRing.material.emissiveIntensity = 0.1 + heatNorm * 1.4;

    // Visible molecule count matches molar amount n directly!
    const visibleCount = Math.min(d.maxMolecules, Math.max(30, Math.round(p.moles * 95)));
    d.moleculePoints.geometry.setDrawRange(0, visibleCount);

    const speedScale = Math.sqrt(p.temperature / 300) * 1.15;
    const posArr = d.moleculePoints.geometry.attributes.position.array;
    const colArr = d.moleculePoints.geometry.attributes.color.array;

    for (let i = 0; i < visibleCount; i++) {
      const m = d.molecules[i];
      m.x += m.vx * speedScale * dt;
      m.y += m.vy * speedScale * dt;
      m.z += m.vz * speedScale * dt;

      confineGasParticle(m, 3.22, 0.72, ceilingY);

      posArr[i * 3] = m.x;
      posArr[i * 3 + 1] = m.y;
      posArr[i * 3 + 2] = m.z;

      // Color gradient from cool cobalt (200K) to energetic vermilion (800K)
      colArr[i * 3] = 0.09 + heatNorm * 0.68;
      colArr[i * 3 + 1] = 0.28 - heatNorm * 0.08;
      colArr[i * 3 + 2] = 0.39 - heatNorm * 0.25;
    }

    d.moleculePoints.geometry.attributes.position.needsUpdate = true;
    d.moleculePoints.geometry.attributes.color.needsUpdate = true;

    this.telemetry = { ...gas, visibleCount };
  }

  // =========================================================================
  // MODULE 04: OHM'S LAW, EIA COLOR RESISTOR & RC OSCILLOSCOPE BENCH
  // =========================================================================
  buildElectromagnetismZone() {
    this.camera.position.set(0, 15, 22);
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();

    // Precision dark-slate & oak electronics breadboard
    const slateBase = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.5, 15),
      new THREE.MeshStandardMaterial({ color: 0x262B31, roughness: 0.72 })
    );
    slateBase.position.y = 0.25;
    slateBase.receiveShadow = true;
    this.zoneRoot.add(slateBase);

    // DC Bench Power Supply at left (-9, y, 0)
    const supplyBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 4.4), this.materials.steel);
    supplyBox.position.set(-9, 2.0, 0);
    supplyBox.castShadow = true;
    this.zoneRoot.add(supplyBox);

    // Positive (red) and Negative (black) brass binding posts
    const plusPost = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 16), this.materials.vermilion);
    plusPost.position.set(-7.3, 1.2, -2.5);
    const minusPost = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 16), this.materials.castIron);
    minusPost.position.set(-7.3, 1.2, 2.5);
    this.zoneRoot.add(plusPost, minusPost);

    // Knife Switch blade on top busbar
    const switchPivot = new THREE.Group();
    switchPivot.position.set(-4.2, 0.85, -4.5);
    const switchBlade = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.22), this.materials.brass);
    switchBlade.position.x = 1.2;
    switchPivot.add(switchBlade);
    this.zoneRoot.add(switchPivot);

    // Ceramic carbon-film Resistor with 4 live EIA painted color bands!
    const resistorGroup = new THREE.Group();
    resistorGroup.position.set(1.5, 1.0, -4.5);
    const rBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 3.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xE2C799, roughness: 0.6 })
    );
    rBody.rotation.z = Math.PI / 2;
    rBody.castShadow = true;
    resistorGroup.add(rBody);

    const bandMeshes = [];
    [-1.05, -0.45, 0.15, 0.95].forEach((xOff) => {
      const bMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.35 });
      const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.545, 0.545, 0.24, 24), bMat);
      bMesh.rotation.z = Math.PI / 2;
      bMesh.position.x = xOff;
      resistorGroup.add(bMesh);
      bandMeshes.push(bMesh);
    });
    this.zoneRoot.add(resistorGroup);

    // Parallel Electrolytic Capacitor with visible charge level sleeve
    const capGroup = new THREE.Group();
    capGroup.position.set(2.5, 0.5, 0);
    const capCan = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.6, 24), this.materials.cobalt);
    capCan.position.y = 1.3;
    capCan.castShadow = true;
    capGroup.add(capCan);

    const chargeRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.88, 2.4, 24),
      new THREE.MeshStandardMaterial({ color: 0xC59B48, emissive: 0xC59B48, emissiveIntensity: 0.35 })
    );
    chargeRing.position.y = 0.2;
    chargeRing.scale.y = 0.05;
    capGroup.add(chargeRing);
    this.zoneRoot.add(capGroup);

    // Optical Indicator Lamp / LED Assembly at right (+8.5, y, 0)
    const lampGroup = new THREE.Group();
    lampGroup.position.set(8.5, 0.5, 0);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.5, 24), this.materials.brass);
    lampBase.position.y = 0.25;
    lampGroup.add(lampBase);

    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x2A8A56,
      emissive: 0x2A8A56,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.88,
      roughness: 0.15
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), domeMat);
    dome.position.y = 1.05;
    lampGroup.add(dome);

    const lampLight = new THREE.PointLight(0x38B26F, 1.0, 10);
    lampLight.position.y = 1.4;
    lampGroup.add(lampLight);
    this.zoneRoot.add(lampGroup);

    // Solid 3D copper busbars (replaces invisible WebGL linewidth:2 hairlines!)
    const loopWaypoints = [
      new THREE.Vector3(-7.3, 0.62, -2.5),
      new THREE.Vector3(-7.3, 0.62, -4.5),
      new THREE.Vector3(8.5, 0.62, -4.5),
      new THREE.Vector3(8.5, 0.62, 4.5),
      new THREE.Vector3(-7.3, 0.62, 4.5),
      new THREE.Vector3(-7.3, 0.62, 2.5)
    ];

    for (let i = 0; i < loopWaypoints.length - 1; i++) {
      const a = loopWaypoints[i];
      const b = loopWaypoints[i + 1];
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(b.x - a.x) > 0.01 ? len + 0.14 : 0.14, 0.08, Math.abs(b.z - a.z) > 0.01 ? len + 0.14 : 0.14),
        this.materials.copper
      );
      bar.position.copy(mid);
      this.zoneRoot.add(bar);
    }
    // Capacitor parallel branch busbar at x = 2.5
    const capBranch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 9.0), this.materials.copper);
    capBranch.position.set(2.5, 0.62, 0);
    this.zoneRoot.add(capBranch);

    // Discrete charge carriers strictly constrained along loopWaypoints!
    const carrierCurve = new THREE.CatmullRomCurve3(loopWaypoints, false, 'catmullrom', 0.02);
    const carrierCount = 46;
    const carrierMeshes = [];
    const sphereGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x164863, emissive: 0x164863, emissiveIntensity: 0.35 });
    for (let i = 0; i < carrierCount; i++) {
      const m = new THREE.Mesh(sphereGeo, sphereMat);
      m.userData.u = i / carrierCount;
      this.zoneRoot.add(m);
      carrierMeshes.push(m);
    }

    this.stateData = {
      switchPivot,
      bandMeshes,
      chargeRing,
      dome,
      domeMat,
      lampLight,
      carrierCurve,
      carrierMeshes,
      switchElapsed: 2.0
    };
  }

  updateElectromagnetism(dt) {
    const p = this.params.electromagnetism;
    const d = this.stateData;
    d.switchElapsed += dt;

    const ckt = computeCircuitState({
      voltage: p.voltage,
      resistanceOhms: p.resistance,
      capacitanceUf: p.capacitance,
      switchClosed: p.switchClosed,
      elapsedSec: d.switchElapsed
    });

    // Switch physical angle
    d.switchPivot.rotation.z = p.switchClosed ? 0 : 0.48;

    // Live 4-band EIA resistor colors!
    ckt.bands.forEach((b, idx) => {
      d.bandMeshes[idx].material.color.set(b.hex);
    });

    // Capacitor voltage sleeve height
    const vRatio = Math.min(1, Math.max(0.04, ckt.capacitorVolts / 24));
    d.chargeRing.scale.y = vRatio;
    d.chargeRing.position.y = 0.15 + vRatio * 1.15;

    // LED optical status (normal green vs overloaded vermilion warning vs off)
    if (ckt.ledOverloaded) {
      d.domeMat.color.setHex(0xB83A2D);
      d.domeMat.emissive.setHex(0xB83A2D);
      d.domeMat.emissiveIntensity = 1.1;
      d.lampLight.color.setHex(0xB83A2D);
      d.lampLight.intensity = 1.6;
    } else if (ckt.ledConducting) {
      const norm = Math.min(1.4, ckt.currentMa / 22);
      d.domeMat.color.setHex(0x2A8A56);
      d.domeMat.emissive.setHex(0x2A8A56);
      d.domeMat.emissiveIntensity = 0.2 + norm * 0.9;
      d.lampLight.color.setHex(0x38B26F);
      d.lampLight.intensity = norm * 1.5;
    } else {
      d.domeMat.color.setHex(0x6D7580);
      d.domeMat.emissiveIntensity = 0.02;
      d.lampLight.intensity = 0;
    }

    // Move charge carriers strictly along copper busbar path proportional to current I
    const flowRate = ckt.ledOverloaded ? 0 : (ckt.currentMa / 1000) * 2.4;
    d.carrierMeshes.forEach((m) => {
      m.userData.u = (m.userData.u + flowRate * dt) % 1;
      const pt = d.carrierCurve.getPointAt(m.userData.u);
      m.position.set(pt.x, 0.74, pt.z);
    });

    this.telemetry = { ...ckt };
  }

  // =========================================================================
  // MODULE 05: QUANTUM DOUBLE-SLIT WAVE-PARTICLE BENCH
  // =========================================================================
  buildQuantumZone() {
    this.camera.position.set(2.5, 11.2, 26);
    this.controls.target.set(1.8, 4.4, 0);
    this.controls.update();

    // Optical rail spine
    const rail = new THREE.Mesh(new THREE.BoxGeometry(28, 0.35, 1.4), this.materials.steel);
    rail.position.y = 0.2;
    this.zoneRoot.add(rail);

    // Tunable monochromatic laser emitter at X = -12
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 3.2, 24), this.materials.castIron);
    emitter.rotation.z = Math.PI / 2;
    emitter.position.set(-12, 4.2, 0);
    this.zoneRoot.add(emitter);

    // Coherent incoming wave line from -10.4 to 0
    const waveLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x22A559 })
    );
    this.zoneRoot.add(waveLine);

    // Double-slit aperture barrier at X = 0 (3 vertical plates creating 2 visible slits!)
    const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.4, 0.5), this.materials.brass);
    centerPillar.position.set(0, 4.2, 0);
    const leftJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.4, 3.2), this.materials.castIron);
    leftJaw.position.set(0, 4.2, -2.5);
    const rightJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.4, 3.2), this.materials.castIron);
    rightJaw.position.set(0, 4.2, 2.5);
    this.zoneRoot.add(centerPillar, leftJaw, rightJaw);

    // Which-Way Photodetector Housing right behind Slit A (visible & illuminated when active!)
    const detectorSensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.1, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xB83A2D, emissive: 0xB83A2D, emissiveIntensity: 0.0 })
    );
    detectorSensor.position.set(0.75, 5.2, 0.9);
    this.zoneRoot.add(detectorSensor);

    // Phosphor Detector Screen at X = +12 (dark slate face so single photon hits glow brightly!)
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.6, 16.8), this.materials.oak);
    screenFrame.position.set(12.25, 4.5, 0);
    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(16.0, 7.8),
      new THREE.MeshStandardMaterial({ color: 0x161B22, roughness: 0.9 })
    );
    screenFace.rotation.y = -Math.PI / 2;
    screenFace.position.set(12.02, 4.5, 0);
    this.zoneRoot.add(screenFrame, screenFace);

    // Accumulated single-photon screen hits buffer (up to 3,200 discrete impacts)
    const maxHits = 3200;
    const hitGeo = new THREE.BufferGeometry();
    const hitPos = new Float32Array(maxHits * 3);
    hitGeo.setAttribute('position', new THREE.BufferAttribute(hitPos, 3));
    hitGeo.setDrawRange(0, 0);

    const hitMat = new THREE.PointsMaterial({ color: 0x38D399, size: 0.14 });
    const hitPoints = new THREE.Points(hitGeo, hitMat);
    this.zoneRoot.add(hitPoints);

    this.stateData = {
      waveLine,
      centerPillar,
      leftJaw,
      rightJaw,
      detectorSensor,
      hitPoints,
      hitMat,
      maxHits,
      hitCount: 0,
      lastSignature: ''
    };
  }

  clearQuantumScreen() {
    if (!this.stateData.hitPoints) return;
    this.stateData.hitCount = 0;
    this.stateData.hitPoints.geometry.setDrawRange(0, 0);
  }

  updateQuantum(dt, time) {
    const p = this.params.quantum;
    const d = this.stateData;

    const sig = `${p.wavelength}-${p.slitSeparation}-${p.detectorActive}`;
    if (d.lastSignature && d.lastSignature !== sig) {
      // Clear accumulated hits automatically whenever optical setup changes so fringes rebuild truthfully!
      this.clearQuantumScreen();
    }
    d.lastSignature = sig;

    const hex = wavelengthNmToHex(p.wavelength);
    d.hitMat.color.set(hex);
    d.waveLine.material.color.set(hex);

    // Spatial wavenumber k = 2*pi / lambda -> longer wavelength = WIDER wave crests (fixes v1 inverted bug!)
    const kSpatial = (520 / p.wavelength) * 2.1;
    const wPts = [];
    for (let x = -10.4; x <= -0.15; x += 0.18) {
      wPts.push(new THREE.Vector3(x, 4.2 + Math.sin(x * kSpatial - time * 8.0) * 0.75, 0));
    }
    d.waveLine.geometry.setFromPoints(wPts);

    // Physical slit jaw spacing
    const halfGap = 0.22 + p.slitSeparation * 0.16;
    d.centerPillar.scale.z = Math.max(0.4, p.slitSeparation * 0.35);
    d.leftJaw.position.z = -(halfGap + 1.75);
    d.rightJaw.position.z = halfGap + 1.75;
    d.detectorSensor.visible = p.detectorActive;
    d.detectorSensor.material.emissiveIntensity = p.detectorActive ? 0.65 : 0;

    // Monte-Carlo rejection sampling of discrete quantum arrivals on phosphor screen!
    const hitsPerFrame = Math.min(28, Math.ceil(650 * dt));
    const arr = d.hitPoints.geometry.attributes.position.array;
    let added = 0;
    let guard = 0;
    while (added < hitsPerFrame && d.hitCount < d.maxHits && guard < 220) {
      guard++;
      const zScreen = (Math.random() - 0.5) * 15.2;
      const prob = computeDoubleSlitIntensity(zScreen, {
        wavelengthNm: p.wavelength,
        slitSeparationUm: p.slitSeparation,
        detectorActive: p.detectorActive
      });
      if (Math.random() <= prob) {
        const ySpread = 4.5 + (Math.random() - 0.5) * 5.2 * Math.exp(-Math.pow(zScreen / 9.5, 2));
        const idx = d.hitCount * 3;
        arr[idx] = 11.98;
        arr[idx + 1] = ySpread;
        arr[idx + 2] = zScreen;
        d.hitCount++;
        added++;
      }
    }
    if (added > 0) {
      d.hitPoints.geometry.setDrawRange(0, d.hitCount);
      d.hitPoints.geometry.attributes.position.needsUpdate = true;
    }

    this.telemetry = {
      photonEv: computePhotonEnergyEv(p.wavelength),
      spectralHex: hex,
      hitCount: d.hitCount,
      fringeSpacingMm: ((p.wavelength / 1000) * 28) / p.slitSeparation
    };
  }

  // =========================================================================
  // MODULE 06: ISOCHRONOUS PENDULUM & HARMONIC ENERGY BENCH
  // =========================================================================
  buildPendulumZone() {
    this.camera.position.set(0, 8.5, 19);
    this.controls.target.set(0, 5.2, 0);
    this.controls.update();

    const pivotY = 9.2;
    // Brushed aluminum A-frame gantry
    [-3.6, 3.6].forEach((xPos) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, pivotY + 0.4, 0.32), this.materials.steel);
      col.position.set(xPos, (pivotY + 0.4) / 2, 0);
      col.castShadow = true;
      this.zoneRoot.add(col);
    });
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.36, 0.45), this.materials.steel);
    crossBeam.position.set(0, pivotY + 0.2, 0);
    this.zoneRoot.add(crossBeam);

    // Brass floor protractor dial
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.3, 0.08, 48), this.materials.brass);
    dial.position.y = 0.05;
    dial.receiveShadow = true;
    this.zoneRoot.add(dial);

    // Suspension wire & solid brass bob
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 12), this.materials.castIron);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), this.materials.brass);
    bob.castShadow = true;
    this.zoneRoot.add(rod, bob);

    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0xB83A2D, 0.42, 0.24);
    this.zoneRoot.add(velArrow);

    this.stateData = {
      pivotY,
      rod,
      bob,
      velArrow,
      theta: (this.params.pendulum.releaseAngle * Math.PI) / 180,
      omega: 0
    };
  }

  resetPendulumSwing() {
    if (!this.stateData) return;
    this.stateData.theta = (this.params.pendulum.releaseAngle * Math.PI) / 180;
    this.stateData.omega = 0;
  }

  updatePendulum(dt) {
    const p = this.params.pendulum;
    const d = this.stateData;

    // 4-substep RK2 midpoint integration of nonlinear pendulum ODE: theta'' = -(g/L)*sin(theta) - c*theta'
    const visualScale = 3.2; // 1.0m lab wire scaled cleanly inside 9.2m gantry
    const sub = 4;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const a1 = -(p.gravity / p.length) * Math.sin(d.theta) - p.damping * d.omega;
      const midTheta = d.theta + 0.5 * h * d.omega;
      const midOmega = d.omega + 0.5 * h * a1;
      const aMid = -(p.gravity / p.length) * Math.sin(midTheta) - p.damping * midOmega;
      d.theta += h * midOmega;
      d.omega += h * aMid;
    }

    const rDraw = p.length * visualScale;
    const bx = Math.sin(d.theta) * rDraw;
    const by = d.pivotY - Math.cos(d.theta) * rDraw;

    d.bob.position.set(bx, by, 0);
    const bobScale = 0.72 + p.mass * 0.08;
    d.bob.scale.setScalar(bobScale);

    d.rod.position.set(bx / 2, (d.pivotY + by) / 2, 0);
    d.rod.scale.y = rDraw;
    d.rod.rotation.z = d.theta;

    const linearSpeed = Math.abs(d.omega) * p.length;
    const heightM = p.length * (1 - Math.cos(d.theta));
    const ke = 0.5 * p.mass * linearSpeed * linearSpeed;
    const pe = p.mass * p.gravity * heightM;

    d.velArrow.visible = this.showVectors && linearSpeed > 0.05;
    if (d.velArrow.visible) {
      const dir = new THREE.Vector3(Math.cos(d.theta), Math.sin(d.theta), 0).multiplyScalar(Math.sign(d.omega || 1));
      d.velArrow.position.copy(d.bob.position);
      d.velArrow.setDirection(dir.normalize());
      d.velArrow.setLength(Math.min(3.6, linearSpeed * 0.65), 0.4, 0.22);
    }

    this.telemetry = {
      periodSec: computePendulumPeriod(p.length, p.gravity, p.releaseAngle),
      linearSpeed,
      kineticEnergyJ: ke,
      potentialEnergyJ: pe,
      totalEnergyJ: ke + pe,
      angleDeg: (d.theta * 180) / Math.PI
    };
  }

  // =========================================================================
  // MODULE 07: SNELL'S LAW OPTICAL REFRACTION & LASER TARGET BENCH
  // =========================================================================
  buildOpticsZone() {
    this.camera.position.set(0, 18, 17);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();

    // Optical breadboard table at y = 0.4
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.4, 18),
      new THREE.MeshStandardMaterial({ color: 0xF5F3EE, roughness: 0.65 })
    );
    table.position.y = 0.2;
    table.receiveShadow = true;
    this.zoneRoot.add(table);

    // Calibrated brass degree ring around interface origin (0, 0.42, 0)
    const ring = new THREE.Mesh(new THREE.RingGeometry(6.8, 7.2, 64), this.materials.brass);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.43;
    this.zoneRoot.add(ring);

    // Lower refractive slab (Medium n2 occupying z > 0, top surface at y = 0.72 so beams at y = 0.88 shine crisply!)
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x62A8D8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.14,
      metalness: 0.05,
      depthWrite: false
    });
    const lowerSlab = new THREE.Mesh(new THREE.BoxGeometry(15, 0.32, 7.6), slabMat);
    lowerSlab.position.set(0, 0.56, 3.8);
    this.zoneRoot.add(lowerSlab);

    // Upper medium slab (subtle tint when n1 > 1.0)
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0xA8CFE8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.14,
      depthWrite: false
    });
    const upperSlab = new THREE.Mesh(new THREE.BoxGeometry(15, 0.32, 7.6), upperMat);
    upperSlab.position.set(0, 0.56, -3.8);
    this.zoneRoot.add(upperSlab);

    // Dashed perpendicular Normal line along Z axis
    const normalLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.88, -7.4),
        new THREE.Vector3(0, 0.88, 7.4)
      ]),
      new THREE.LineDashedMaterial({ color: 0x1C2026, dashSize: 0.4, gapSize: 0.25 })
    );
    normalLine.computeLineDistances();
    this.zoneRoot.add(normalLine);

    // Laser emitter diode head
    const laserHead = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.8), this.materials.castIron);
    this.zoneRoot.add(laserHead);

    // 3 volumetric laser beam cylinders (Incident, Transmitted, Fresnel/TIR Reflected)
    const makeBeam = (hex, opacity = 0.96) => new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 1.0, 14),
      new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, toneMapped: false })
    );
    const incidentBeam = makeBeam(0xC92A2A, 0.98);
    const refractedBeam = makeBeam(0x164863, 0.98);
    const reflectedBeam = makeBeam(0xD9480F, 0.55);
    this.zoneRoot.add(incidentBeam, refractedBeam, reflectedBeam);

    // Target Photodiode Sensor at X = +3.35, Z = +7.6 (solvable e.g. Air->Crown Glass around 38.5 deg!)
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0x2A8A56,
      emissive: 0x2A8A56,
      emissiveIntensity: 0.15
    });
    const sensorGate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.9, 24), sensorMat);
    sensorGate.position.set(3.35, 0.95, 7.6);
    this.zoneRoot.add(sensorGate);

    this.stateData = {
      lowerSlab,
      upperSlab,
      laserHead,
      incidentBeam,
      refractedBeam,
      reflectedBeam,
      sensorGate,
      sensorMat
    };
  }

  placeBeamSegment(mesh, pA, pB) {
    const dir = new THREE.Vector3().subVectors(pB, pA);
    const len = dir.length();
    mesh.position.copy(pA).add(pB).multiplyScalar(0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }

  updateOptics() {
    const p = this.params.optics;
    const d = this.stateData;
    const snell = computeSnellRefraction({
      incidentAngleDeg: p.incidentAngle,
      n1: p.n1,
      n2: p.n2
    });

    d.upperSlab.material.opacity = 0.06 + (p.n1 - 1.0) * 0.28;
    d.lowerSlab.material.opacity = 0.14 + (p.n2 - 1.0) * 0.30;

    const origin = new THREE.Vector3(0, 0.95, 0);
    const th1 = (p.incidentAngle * Math.PI) / 180;
    const rIn = 7.4;
    const srcPos = new THREE.Vector3(-Math.sin(th1) * rIn, 0.95, -Math.cos(th1) * rIn);

    d.laserHead.position.copy(srcPos);
    d.laserHead.lookAt(origin);
    this.placeBeamSegment(d.incidentBeam, srcPos, origin);

    // Reflected ray (either partial Fresnel reflection OR 100% Total Internal Reflection!)
    const reflPos = new THREE.Vector3(Math.sin(th1) * rIn, 0.95, -Math.cos(th1) * rIn);
    this.placeBeamSegment(d.reflectedBeam, origin, reflPos);
    d.reflectedBeam.material.opacity = snell.totalInternalReflection ? 0.98 : Math.max(0.18, snell.fresnelReflectance * 2.2);

    let sensorHit = false;
    if (snell.totalInternalReflection) {
      d.refractedBeam.visible = false;
    } else {
      d.refractedBeam.visible = true;
      const th2 = (snell.refractedAngleDeg * Math.PI) / 180;
      // Intersection at z = 7.6 sensor plane: x = 7.6 * tan(th2)
      const zExit = 7.6;
      const xExit = Math.tan(th2) * zExit;
      const endPos = new THREE.Vector3(xExit, 0.95, zExit);
      this.placeBeamSegment(d.refractedBeam, origin, endPos);

      if (Math.abs(xExit - d.sensorGate.position.x) <= 0.52) {
        sensorHit = true;
      }
    }

    d.sensorMat.emissiveIntensity = sensorHit ? 1.25 : 0.12;
    this.telemetry = { ...snell, sensorHit };
  }

  // =========================================================================
  // MODULE 08: RIGID-BODY COLLISIONS & INCLINED FRICTION RAMP SANDBOX
  // =========================================================================
  buildSandboxZone() {
    this.camera.position.set(14, 13, 24);
    this.controls.target.set(0, 3.0, 0);
    this.controls.update();

    // Arena containment curb
    const curb = new THREE.Mesh(
      new THREE.RingGeometry(13.8, 14.3, 4),
      this.materials.castIron
    );
    curb.rotation.x = -Math.PI / 2;
    curb.rotation.z = Math.PI / 4;
    curb.position.y = 0.04;
    this.zoneRoot.add(curb);

    // Calibrated Oak Inclined Plane Ramp on left side (-7, y, -4)
    const rampPivot = new THREE.Group();
    rampPivot.position.set(-3.5, 0.1, -4.5);

    const plank = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.28, 3.2), this.materials.oak);
    plank.position.set(-3.75, 0.14, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    rampPivot.add(plank);

    // Brass test block resting on inclined plank!
    const testBlock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), this.materials.brass);
    testBlock.castShadow = true;
    rampPivot.add(testBlock);
    this.zoneRoot.add(rampPivot);

    this.stateData = {
      rampPivot,
      testBlock,
      blockOffset: -6.2, // near top of 7.5m plank
      blockSpeed: 0,
      bodies: []
    };

    // Seed 5 initial bodies for instant visual engagement
    for (let i = 0; i < 5; i++) {
      this.spawnSandboxBody(true);
    }
  }

  spawnSandboxBody(silent = false) {
    if (this.zone !== 'sandbox' || !this.stateData.bodies) return;
    const d = this.stateData;
    const p = this.params.sandbox;

    if (d.bodies.length >= 16) {
      const oldest = d.bodies.shift();
      this.disposeObjectTree(oldest.mesh);
    }

    const palette = [this.materials.cobalt, this.materials.vermilion, this.materials.brass, this.materials.steel];
    const mat = palette[d.bodies.length % palette.length];
    const radius = 0.55 + Math.random() * 0.25;
    let geo;
    if (p.spawnType === 'cube') {
      geo = new THREE.BoxGeometry(radius * 1.75, radius * 1.75, radius * 1.75);
    } else if (p.spawnType === 'cylinder') {
      geo = new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, radius * 1.8, 20);
    } else {
      geo = new THREE.SphereGeometry(radius, 24, 24);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    const body = {
      mesh,
      radius,
      mass: Math.pow(radius / 0.55, 3) * 2.5,
      x: (Math.random() - 0.3) * 9,
      y: 4.5 + Math.random() * 4.5,
      z: (Math.random() - 0.1) * 9,
      vx: (Math.random() - 0.5) * 6,
      vy: 0,
      vz: (Math.random() - 0.5) * 6
    };
    mesh.position.set(body.x, body.y, body.z);
    this.zoneRoot.add(mesh);
    d.bodies.push(body);

    // Also reset the ramp block to top of plank so ramp experiment updates crisply
    d.blockOffset = -6.2;
    d.blockSpeed = 0;

    if (!silent) {
      this.onEvent({
        type: 'info',
        title: 'Rigid Body Added',
        detail: `${p.spawnType.toUpperCase()} (${body.mass.toFixed(1)} kg) released into arena`
      });
    }
  }

  fireSandboxImpulse() {
    if (this.zone !== 'sandbox' || !this.stateData.bodies) return;
    if (this.stateData.bodies.length === 0) this.spawnSandboxBody(true);
    this.stateData.bodies.forEach((b, idx) => {
      b.vx += (idx === 0 ? 15 : (Math.random() - 0.5) * 9);
      b.vy += 3.5 + Math.random() * 3;
      b.vz += (Math.random() - 0.5) * 9;
    });
    this.onEvent({
      type: 'info',
      title: 'Impulse Cue Applied',
      detail: 'High-momentum kinetic impulse injected across rigid bodies'
    });
  }

  updateSandbox(dt) {
    const p = this.params.sandbox;
    const d = this.stateData;

    // Update inclined plane tilt & test block sliding physics
    d.rampPivot.rotation.z = (-p.rampAngle * Math.PI) / 180; // left end rises smoothly!
    const rampPhys = computeInclinedPlaneAcceleration(p.rampAngle, p.friction, p.gravity);
    if (rampPhys.sliding) {
      d.blockSpeed += rampPhys.netAcceleration * dt;
      d.blockOffset += d.blockSpeed * dt;
      if (d.blockOffset > -0.6) {
        d.blockOffset = -6.2;
        d.blockSpeed = 0;
      }
    } else {
      d.blockSpeed = 0;
    }
    d.testBlock.position.set(d.blockOffset, 0.58, 0);

    // Update free rigid bodies + elastic/inelastic pairwise collisions
    let ke = 0;
    let pe = 0;
    const bound = 9.4;

    d.bodies.forEach((b) => {
      b.vy -= p.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      if (b.y < b.radius) {
        b.y = b.radius;
        b.vy = -b.vy * p.restitution;
        b.vx *= 0.992;
        b.vz *= 0.992;
      }
      if (b.x > bound) { b.x = bound; b.vx = -Math.abs(b.vx) * p.restitution; }
      if (b.x < -bound) { b.x = -bound; b.vx = Math.abs(b.vx) * p.restitution; }
      if (b.z > bound) { b.z = bound; b.vz = -Math.abs(b.vz) * p.restitution; }
      if (b.z < -bound) { b.z = -bound; b.vz = Math.abs(b.vz) * p.restitution; }
    });

    for (let i = 0; i < d.bodies.length; i++) {
      for (let j = i + 1; j < d.bodies.length; j++) {
        resolveSpherePairCollision(d.bodies[i], d.bodies[j], p.restitution);
      }
    }

    d.bodies.forEach((b) => {
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.x += b.vz * 0.04;
      b.mesh.rotation.z -= b.vx * 0.04;
      const v2 = b.vx * b.vx + b.vy * b.vy + b.vz * b.vz;
      ke += 0.5 * b.mass * v2;
      pe += b.mass * p.gravity * Math.max(0, b.y - b.radius);
    });

    this.telemetry = {
      bodyCount: d.bodies.length,
      kineticEnergyJ: ke,
      totalEnergyJ: ke + pe,
      rampSliding: rampPhys.sliding,
      rampAccel: rampPhys.netAcceleration,
      criticalAngleDeg: rampPhys.criticalAngleDeg
    };
  }

  // =========================================================================
  // MAIN SIMULATION LOOP
  // =========================================================================
  bindResize() {
    this.handleResize = () => {
      if (!this.webglSupported || !this.container) return;
      const w = this.container.clientWidth || 800;
      const h = this.container.clientHeight || 560;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    this.rafId = requestAnimationFrame(this.animate);
    if (!this.webglSupported) return;
    // Skip WebGL rasterization completely when Studio view is hidden (0% idle GPU overhead)
    if (!this.container.offsetParent) return;

    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    if (this.paused && !this.stepRequested) {
      this.controls.update();
      return;
    }
    const effDt = this.stepRequested ? 1 / 60 : rawDt * this.timeScale;
    this.stepRequested = false;

    const elapsed = this.clock.elapsedTime;

    if (this.zone === 'dynamics') this.updateDynamics(effDt);
    else if (this.zone === 'aerodynamics') this.updateAerodynamics(effDt, elapsed);
    else if (this.zone === 'thermodynamics') this.updateThermodynamics(effDt);
    else if (this.zone === 'electromagnetism') this.updateElectromagnetism(effDt);
    else if (this.zone === 'quantum') this.updateQuantum(effDt, elapsed);
    else if (this.zone === 'pendulum') this.updatePendulum(effDt);
    else if (this.zone === 'optics') this.updateOptics();
    else if (this.zone === 'sandbox') this.updateSandbox(effDt);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.onTelemetry(this.zone, this.params[this.zone], this.telemetry);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    this.clearCurrentZone();
    if (this.envRT) this.envRT.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
