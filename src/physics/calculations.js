/**
 * Calibrated Physics Computation Core
 * Pure deterministic mathematical models for all 8 laboratory modules.
 * Every equation uses explicit SI units and physical conservation laws.
 */

export const PHYSICAL_CONSTANTS = {
  G_EARTH: 9.81,          // m/s^2
  R_GAS: 8.3144626,       // J/(mol*K)
  PLANCK_H: 6.62607015e-34, // J*s
  SPEED_LIGHT: 2.99792458e8, // m/s
  EV_J: 1.602176634e-19   // J/eV
};

/**
 * Module 01: 3D Ballistic Kinematics with True Mass-Dependent Quadratic Air Drag & Crosswind
 * Fixes v1 bugs:
 *  1) Drag acceleration properly divides force by projectile mass (a_d = F_d / m)
 *  2) Supports 3D azimuth angle (yaw) so targets off the Z=0 plane are solvable
 *  3) Supports crosswind vector for advanced stages
 */
export function computeAnalyticalVacuumRange(velocity, elevationDeg, launchHeight = 1.6, gravity = 9.81) {
  const rad = (elevationDeg * Math.PI) / 180;
  const vx = velocity * Math.cos(rad);
  const vy = velocity * Math.sin(rad);
  const discriminant = vy * vy + 2 * gravity * Math.max(0, launchHeight);
  const flightTime = (vy + Math.sqrt(discriminant)) / gravity;
  const apexHeight = launchHeight + (vy * vy) / (2 * gravity);
  return {
    range: vx * flightTime,
    flightTime,
    apexHeight
  };
}

export function stepProjectile3D(state, dt, gravity = 9.81, windZ = 0) {
  const { pos, vel, mass, dragPercent } = state;
  // Relative air velocity vector (projectile velocity minus wind vector)
  const relVx = vel.x;
  const relVy = vel.y;
  const relVz = vel.z - windZ;
  const relSpeed = Math.hypot(relVx, relVy, relVz);

  // Effective quadratic drag coefficient scaled cleanly for lab range [0..50%]
  // F_drag = -k * v * v_vec, a_drag = F_drag / mass (Newton's 2nd Law!)
  const kDrag = (dragPercent / 100) * 0.085;
  const invMass = 1 / Math.max(0.25, mass);

  const ax = -(kDrag * relSpeed * relVx) * invMass;
  const ay = -gravity - (kDrag * relSpeed * relVy) * invMass;
  const az = -(kDrag * relSpeed * relVz) * invMass;

  // Semi-implicit (symplectic) Euler integration
  const nextVel = {
    x: vel.x + ax * dt,
    y: vel.y + ay * dt,
    z: vel.z + az * dt
  };

  const nextPos = {
    x: pos.x + nextVel.x * dt,
    y: pos.y + nextVel.y * dt,
    z: pos.z + nextVel.z * dt
  };

  return {
    pos: nextPos,
    vel: nextVel,
    accel: { x: ax, y: ay, z: az },
    dragForceMagnitude: kDrag * relSpeed * relSpeed
  };
}

export function simulateTrajectoryPreview({
  launchOrigin = { x: -16, y: 1.6, z: 0 },
  velocity = 25,
  elevationDeg = 45,
  azimuthDeg = 0,
  mass = 5,
  dragPercent = 10,
  gravity = 9.81,
  windZ = 0,
  groundRadius = 0.32
}) {
  const elev = (elevationDeg * Math.PI) / 180;
  const azim = (azimuthDeg * Math.PI) / 180;
  const vh = velocity * Math.cos(elev);

  let state = {
    pos: {
      x: launchOrigin.x + Math.cos(elev) * Math.cos(azim) * 2.2,
      y: launchOrigin.y + Math.sin(elev) * 2.2,
      z: launchOrigin.z + Math.cos(elev) * Math.sin(azim) * 2.2
    },
    vel: {
      x: vh * Math.cos(azim),
      y: velocity * Math.sin(elev),
      z: vh * Math.sin(azim)
    },
    mass,
    dragPercent
  };

  const points = [{ ...state.pos }];
  let t = 0;
  const dt = 1 / 120;
  let maxY = state.pos.y;

  while (t < 15 && state.pos.y > groundRadius) {
    const next = stepProjectile3D({ ...state, mass, dragPercent }, dt, gravity, windZ);
    state.pos = next.pos;
    state.vel = next.vel;
    if (state.pos.y > maxY) maxY = state.pos.y;
    t += dt;
    if (points.length < 360) {
      points.push({ ...state.pos });
    }
  }

  return {
    points,
    impact: { ...state.pos },
    flightTime: t,
    apexHeight: maxY
  };
}

/**
 * Module 02: Subsonic NACA 2412 Airfoil Lift, Drag & Critical Stall Model
 * Fixes v1 bugs:
 *  1) Models camber zero-lift angle (-2 deg) + realistic post-stall separation past +/-15 deg
 *  2) Computes dynamic pressure q = 0.5 * rho * v^2, L/D efficiency ratio, and stall regime
 */
export function computeAirfoilAerodynamics({
  windSpeed = 28,
  airDensity = 1.225,
  angleOfAttackDeg = 6,
  wingArea = 3.2
}) {
  const alphaRad = (angleOfAttackDeg * Math.PI) / 180;
  const alphaZeroLift = (-2.0 * Math.PI) / 180; // Cambered NACA 2412 lifts slightly at 0 deg AoA
  const effAlpha = alphaRad - alphaZeroLift;

  // Smooth blending between attached Prandtl thin-airfoil slope and separated post-stall regime
  const stallAngleDeg = 15.0;
  const absAoA = Math.abs(angleOfAttackDeg);
  const attachedCl = 2 * Math.PI * effAlpha;

  let cl;
  let stalled = false;
  if (absAoA <= 13.5) {
    cl = attachedCl;
  } else if (absAoA <= 18.5) {
    stalled = absAoA >= stallAngleDeg;
    const blend = (absAoA - 13.5) / 5.0; // 0 -> 1 drop-off
    const postStallCl = Math.sign(angleOfAttackDeg || 1) * (0.72 * Math.sin(2 * alphaRad) + 0.28);
    cl = attachedCl * (1 - blend) + postStallCl * blend;
  } else {
    stalled = true;
    cl = Math.sign(angleOfAttackDeg || 1) * (0.78 * Math.sin(2 * alphaRad) + 0.22);
  }

  // Parasitic + induced drag + post-stall flat-plate separated wake pressure drag (2*sin^2(alpha))
  const aspectRatio = 6.4;
  const oswaldEfficiency = 0.84;
  const cd0 = 0.018;
  const inducedCd = (cl * cl) / (Math.PI * aspectRatio * oswaldEfficiency);
  const separationPenalty = absAoA > 13.5
    ? Math.pow((absAoA - 13.5) / 5.0, 1.5) * 0.14 + 1.6 * Math.pow(Math.sin(alphaRad), 2)
    : 0;
  const cd = cd0 + inducedCd + separationPenalty;

  const dynamicPressure = 0.5 * airDensity * windSpeed * windSpeed;
  const liftN = dynamicPressure * wingArea * cl;
  const dragN = dynamicPressure * wingArea * cd;
  const liftToDrag = dragN > 0.001 ? liftN / dragN : 0;

  return {
    cl,
    cd,
    liftN,
    dragN,
    liftToDrag,
    dynamicPressure,
    stalled
  };
}

/**
 * Module 03: Ideal Gas Law & Elastic Cylinder Confinement
 * Fixes v1 bugs:
 *  1) Clamps particle positions inside radial & moving piston bounds so particles NEVER get trapped outside
 *  2) Computes exact pressure (kPa), RMS molecular speed (v_rms = sqrt(3RT/M)), and internal energy U
 */
export function computeIdealGasProperties({
  temperatureK = 300,
  volumeLiters = 50,
  moles = 1.0,
  molarMassKg = 0.02897 // Dry air / N2 (~28.97 g/mol)
}) {
  const volumeM3 = Math.max(0.001, volumeLiters / 1000);
  const pressurePa = (moles * PHYSICAL_CONSTANTS.R_GAS * temperatureK) / volumeM3;
  const pressureKPa = pressurePa / 1000;
  const vRms = Math.sqrt((3 * PHYSICAL_CONSTANTS.R_GAS * temperatureK) / molarMassKg);
  const internalEnergyKJ = (1.5 * moles * PHYSICAL_CONSTANTS.R_GAS * temperatureK) / 1000;

  return {
    pressureKPa,
    vRms,
    internalEnergyKJ
  };
}

export function confineGasParticle(p, radiusMax, minY, maxY) {
  // Floor & moving piston ceiling reflection with position clamping (fixes piston-trap bug!)
  if (p.y < minY) {
    p.y = minY;
    p.vy = Math.abs(p.vy);
  } else if (p.y > maxY) {
    p.y = maxY;
    p.vy = -Math.abs(p.vy);
  }

  // Radial cylindrical glass wall reflection with exact outward normal projection
  const r = Math.hypot(p.x, p.z);
  if (r > radiusMax && r > 1e-6) {
    const nx = p.x / r;
    const nz = p.z / r;
    p.x = nx * radiusMax;
    p.z = nz * radiusMax;
    const dot = p.vx * nx + p.vz * nz;
    if (dot > 0) {
      p.vx -= 2 * dot * nx;
      p.vz -= 2 * dot * nz;
    }
  }
  return p;
}

/**
 * Module 04: Ohm's Law, EIA 4-Band Resistor Color Decoder, and RC Transient Model
 */
const EIA_DIGIT_COLORS = [
  { name: 'Black', hex: '#1C1E21' },
  { name: 'Brown', hex: '#7C4A21' },
  { name: 'Red', hex: '#C9332B' },
  { name: 'Orange', hex: '#D96B1B' },
  { name: 'Yellow', hex: '#DFB11B' },
  { name: 'Green', hex: '#2B8A4E' },
  { name: 'Blue', hex: '#1E5FA8' },
  { name: 'Violet', hex: '#6E3FA3' },
  { name: 'Grey', hex: '#7B818A' },
  { name: 'White', hex: '#F4F4F6' }
];

export function getResistorColorBands(ohms) {
  const clamped = Math.max(10, Math.min(9900, Math.round(ohms)));
  let multiplier = 0;
  let scaled = clamped;
  while (scaled >= 100) {
    scaled = Math.round(scaled / 10);
    multiplier++;
  }
  const d1 = Math.floor(scaled / 10) % 10;
  const d2 = scaled % 10;
  return [
    EIA_DIGIT_COLORS[d1],
    EIA_DIGIT_COLORS[d2],
    EIA_DIGIT_COLORS[Math.min(9, multiplier)],
    { name: 'Gold (±5%)', hex: '#C89B3C' }
  ];
}

export function computeCircuitState({
  voltage = 12,
  resistanceOhms = 220,
  capacitanceUf = 470,
  switchClosed = true,
  elapsedSec = 0
}) {
  const currentAmps = switchClosed ? voltage / Math.max(1, resistanceOhms) : 0;
  const currentMa = currentAmps * 1000;
  const powerMw = voltage * currentMa;
  const tauSec = (resistanceOhms * (capacitanceUf * 1e-6));
  const capacitorVolts = switchClosed
    ? voltage * (1 - Math.exp(-elapsedSec / Math.max(0.001, tauSec)))
    : voltage * Math.exp(-elapsedSec / Math.max(0.001, tauSec));

  // Realistic 20mA standard indicator LED model with 35mA thermal overload fuse check
  const ledOverloaded = currentMa > 35;
  const ledConducting = switchClosed && voltage >= 1.8 && !ledOverloaded;

  return {
    currentAmps,
    currentMa,
    powerMw,
    tauMs: tauSec * 1000,
    capacitorVolts,
    ledConducting,
    ledOverloaded,
    bands: getResistorColorBands(resistanceOhms)
  };
}

/**
 * Module 05: Double-Slit Quantum Interference & Spectral Wavelength Color
 * Fixes v1 bugs:
 *  1) Fringe spacing dy = (lambda * L) / d properly INCREASES with longer wavelength!
 *  2) Slit detector toggle genuinely switches wave interference distribution vs two-slit particle sum!
 */
export function wavelengthNmToHex(nm) {
  const w = Math.max(380, Math.min(700, nm));
  let r = 0, g = 0, b = 0;
  if (w < 440) {
    r = -(w - 440) / 60; g = 0; b = 1;
  } else if (w < 490) {
    r = 0; g = (w - 440) / 50; b = 1;
  } else if (w < 510) {
    r = 0; g = 1; b = -(w - 510) / 20;
  } else if (w < 580) {
    r = (w - 510) / 70; g = 1; b = 0;
  } else if (w < 645) {
    r = 1; g = -(w - 645) / 65; b = 0;
  } else {
    r = 1; g = 0; b = 0;
  }
  const toHex = (c) => Math.round(Math.max(0, Math.min(1, c)) * 235 + 15).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function computeDoubleSlitIntensity(screenY, {
  wavelengthNm = 532,
  slitSeparationUm = 2.4,
  detectorActive = false
}) {
  // Normalized screen scale where y in [-8, +8] represents angular screen coordinate
  const lambdaUm = wavelengthNm / 1000;
  const slitWidthUm = slitSeparationUm * 0.24;
  const sinTheta = screenY / 28; // L = 28 screen distance scale

  if (detectorActive) {
    // Which-way measurement destroys phase coherence -> classical sum of two Gaussian single-slit beams!
    const centerOffset = slitSeparationUm * 0.65;
    const g1 = Math.exp(-Math.pow((screenY - centerOffset) / 1.45, 2));
    const g2 = Math.exp(-Math.pow((screenY + centerOffset) / 1.45, 2));
    return Math.min(1, 0.55 * (g1 + g2));
  }

  // Coherent wave interference: cos^2(pi * d * sin(theta) / lambda) * sinc^2(pi * a * sin(theta) / lambda)
  const beta = (Math.PI * slitWidthUm * sinTheta) / lambdaUm;
  const delta = (Math.PI * slitSeparationUm * sinTheta) / lambdaUm;
  const envelope = Math.abs(beta) < 1e-6 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
  return envelope * Math.pow(Math.cos(delta), 2);
}

export function computePhotonEnergyEv(wavelengthNm) {
  const joules = (PHYSICAL_CONSTANTS.PLANCK_H * PHYSICAL_CONSTANTS.SPEED_LIGHT) / (wavelengthNm * 1e-9);
  return joules / PHYSICAL_CONSTANTS.EV_J;
}

/**
 * Module 06: Simple & Large-Angle Pendulum Harmonics
 */
export function computePendulumPeriod(lengthMeters = 1.0, gravity = 9.81, initialAngleDeg = 20) {
  const theta0 = (Math.abs(initialAngleDeg) * Math.PI) / 180;
  const smallAngleT = 2 * Math.PI * Math.sqrt(Math.max(0.05, lengthMeters) / Math.max(0.1, gravity));
  // 2nd-order elliptic integral correction for larger amplitudes
  const correction = 1 + (1 / 16) * theta0 * theta0 + (11 / 3072) * Math.pow(theta0, 4);
  return smallAngleT * correction;
}

/**
 * Module 07: Snell's Law Optical Refraction & Total Internal Reflection
 */
export function computeSnellRefraction({
  incidentAngleDeg = 35,
  n1 = 1.0,
  n2 = 1.52
}) {
  const theta1Rad = (Math.abs(incidentAngleDeg) * Math.PI) / 180;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  const criticalAngleDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;

  if (Math.abs(sinTheta2) > 1.0) {
    return {
      totalInternalReflection: true,
      refractedAngleDeg: null,
      reflectionAngleDeg: Math.abs(incidentAngleDeg),
      criticalAngleDeg,
      fresnelReflectance: 1.0
    };
  }

  const theta2Rad = Math.asin(sinTheta2);
  const refractedAngleDeg = (theta2Rad * 180) / Math.PI;
  // Unpolarized Fresnel reflectance estimate
  const rs = Math.pow((n1 * Math.cos(theta1Rad) - n2 * Math.cos(theta2Rad)) / (n1 * Math.cos(theta1Rad) + n2 * Math.cos(theta2Rad)), 2);
  const rp = Math.pow((n1 * Math.cos(theta2Rad) - n2 * Math.cos(theta1Rad)) / (n1 * Math.cos(theta2Rad) + n2 * Math.cos(theta1Rad)), 2);

  return {
    totalInternalReflection: false,
    refractedAngleDeg,
    reflectionAngleDeg: Math.abs(incidentAngleDeg),
    criticalAngleDeg,
    fresnelReflectance: 0.5 * (rs + rp)
  };
}

/**
 * Module 08: Rigid-Body Elastic/Inelastic Sphere Collision & Inclined Plane Friction
 */
export function resolveSpherePairCollision(b1, b2, restitution = 0.85) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dz = b2.z - b1.z;
  const dist = Math.hypot(dx, dy, dz);
  const minDist = b1.radius + b2.radius;

  if (dist >= minDist || dist < 1e-6) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  // Positional separation weighted by inverse mass
  const invM1 = 1 / b1.mass;
  const invM2 = 1 / b2.mass;
  const totalInvMass = invM1 + invM2;
  const overlap = minDist - dist;

  b1.x -= nx * overlap * (invM1 / totalInvMass);
  b1.y -= ny * overlap * (invM1 / totalInvMass);
  b1.z -= nz * overlap * (invM1 / totalInvMass);
  b2.x += nx * overlap * (invM2 / totalInvMass);
  b2.y += ny * overlap * (invM2 / totalInvMass);
  b2.z += nz * overlap * (invM2 / totalInvMass);

  // Relative velocity along normal
  const rvx = b2.vx - b1.vx;
  const rvy = b2.vy - b1.vy;
  const rvz = b2.vz - b1.vz;
  const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

  if (velAlongNormal > 0) return true; // Already separating

  const j = (-(1 + restitution) * velAlongNormal) / totalInvMass;
  b1.vx -= j * invM1 * nx;
  b1.vy -= j * invM1 * ny;
  b1.vz -= j * invM1 * nz;
  b2.vx += j * invM2 * nx;
  b2.vy += j * invM2 * ny;
  b2.vz += j * invM2 * nz;

  return true;
}

export function computeInclinedPlaneAcceleration(rampAngleDeg, frictionCoeff, gravity = 9.81) {
  const theta = (rampAngleDeg * Math.PI) / 180;
  const downslopeGravity = gravity * Math.sin(theta);
  const maxFriction = frictionCoeff * gravity * Math.cos(theta);
  if (downslopeGravity <= maxFriction) {
    return { sliding: false, netAcceleration: 0, criticalAngleDeg: (Math.atan(frictionCoeff) * 180) / Math.PI };
  }
  return {
    sliding: true,
    netAcceleration: downslopeGravity - maxFriction,
    criticalAngleDeg: (Math.atan(frictionCoeff) * 180) / Math.PI
  };
}
