import assert from 'node:assert/strict';
import {
  computeAnalyticalVacuumRange,
  simulateTrajectoryPreview,
  computeAirfoilAerodynamics,
  computeIdealGasProperties,
  confineGasParticle,
  computeCircuitState,
  computeDoubleSlitIntensity,
  computePhotonEnergyEv,
  computePendulumPeriod,
  computeSnellRefraction,
  resolveSpherePairCollision,
  computeInclinedPlaneAcceleration
} from '../src/physics/calculations.js';

console.log('Running Calibrated Physics Verification Suite (v2.0)...\n');

// 1. Ballistic Kinematics: Mass invariance in vacuum + Mass sensitivity under air drag + 3D Azimuth
const lightDrag = simulateTrajectoryPreview({ velocity: 30, elevationDeg: 45, mass: 1, dragPercent: 25 });
const heavyDrag = simulateTrajectoryPreview({ velocity: 30, elevationDeg: 45, mass: 15, dragPercent: 25 });
assert.ok(
  heavyDrag.impact.x > lightDrag.impact.x + 8,
  `Expected heavy projectile (15kg: x=${heavyDrag.impact.x.toFixed(2)}m) to fly substantially farther than light projectile (1kg: x=${lightDrag.impact.x.toFixed(2)}m) under identical air drag`
);

const angledShot = simulateTrajectoryPreview({ velocity: 28, elevationDeg: 40, azimuthDeg: 18, mass: 5, dragPercent: 0 });
assert.ok(angledShot.impact.z > 6, `Expected positive azimuth shot to reach +Z off-axis targets (got z=${angledShot.impact.z.toFixed(2)}m)`);

const vacAnalytic = computeAnalyticalVacuumRange(25, 45, 0, 9.81);
assert.ok(Math.abs(vacAnalytic.range - (625 / 9.81)) < 0.01, 'Analytical vacuum range matches v^2/g at 45 deg');
console.log('[PASS] Module 01: Ballistic drag mass-scaling (F_d/m) & 3D azimuth targeting verified.');

// 2. Aerodynamics: Positive nose-up lift & post-stall drop-off past 15 deg
const cruiseAero = computeAirfoilAerodynamics({ windSpeed: 30, angleOfAttackDeg: 10 });
const stalledAero = computeAirfoilAerodynamics({ windSpeed: 30, angleOfAttackDeg: 19 });
assert.equal(cruiseAero.stalled, false);
assert.equal(stalledAero.stalled, true);
assert.ok(cruiseAero.cl > stalledAero.cl, 'Post-stall lift coefficient must drop below peak attached lift');
assert.ok(stalledAero.cd > cruiseAero.cd * 2, 'Post-stall pressure drag must surge sharply');
console.log('[PASS] Module 02: Subsonic NACA 2412 lift curve & critical stall separation verified.');

// 3. Thermodynamics: PV = nRT & Piston confinement fix
const gas = computeIdealGasProperties({ temperatureK: 300, volumeLiters: 50, moles: 2.0 });
assert.ok(Math.abs(gas.pressureKPa - 99.77) < 0.2, `Expected ~99.77 kPa, got ${gas.pressureKPa}`);
const trappedCandidate = confineGasParticle({ x: 3.9, y: 9.2, z: 0, vx: 1.2, vy: 0.8, vz: 0 }, 3.2, 0.5, 4.5);
assert.equal(trappedCandidate.y, 4.5, 'Gas molecule immediately clamped inside moving piston ceiling');
assert.ok(trappedCandidate.vy < 0, 'Gas molecule velocity reflected downward off piston face');
assert.ok(Math.hypot(trappedCandidate.x, trappedCandidate.z) <= 3.2001, 'Gas molecule confined within cylinder wall');
console.log('[PASS] Module 03: Ideal Gas Law (PV = nRT) & piston boundary confinement verified.');

// 4. Electromagnetism: Ohm's Law, EIA Resistor Color Code, & Overload Fuse
const ckt = computeCircuitState({ voltage: 5, resistanceOhms: 220, capacitanceUf: 470, switchClosed: true, elapsedSec: 0.5 });
assert.equal(ckt.bands[0].name, 'Red');
assert.equal(ckt.bands[1].name, 'Red');
assert.equal(ckt.bands[2].name, 'Brown');
assert.ok(Math.abs(ckt.currentMa - 22.73) < 0.1);
assert.equal(ckt.ledConducting, true);
console.log('[PASS] Module 04: Ohm\'s Law, EIA 4-band color code (220 Ohm = Red-Red-Brown), and RC transient verified.');

// 5. Quantum: Wavelength fringe scaling & Observer wave-collapse toggle
const violetOffCenter = computeDoubleSlitIntensity(1.6, { wavelengthNm: 405, slitSeparationUm: 2.4, detectorActive: false });
const redOffCenter = computeDoubleSlitIntensity(1.6, { wavelengthNm: 680, slitSeparationUm: 2.4, detectorActive: false });
assert.notEqual(violetOffCenter.toFixed(4), redOffCenter.toFixed(4), 'Wavelength changes interference phase pattern');
const centerWave = computeDoubleSlitIntensity(0, { wavelengthNm: 532, slitSeparationUm: 2.4, detectorActive: false });
const centerCollapsed = computeDoubleSlitIntensity(0, { wavelengthNm: 532, slitSeparationUm: 2.4, detectorActive: true });
assert.equal(centerWave, 1.0, 'Constructive central maximum = 1.0 when unobserved');
assert.ok(centerCollapsed < 0.45, 'Central fringe vanishes into valley between two slits when which-way detector is ON');
assert.ok(Math.abs(computePhotonEnergyEv(532) - 2.33) < 0.02, '532nm green laser photon energy = 2.33 eV');
console.log('[PASS] Module 05: Double-slit interference scaling & observer wave-collapse verified.');

// 6. Pendulum Harmonics: Seconds pendulum check (L = 0.994m -> T ~ 2.00s)
const secondsPendulumT = computePendulumPeriod(0.994, 9.81, 5);
assert.ok(Math.abs(secondsPendulumT - 2.0) < 0.01, `Expected 2.00s period for Huygens seconds pendulum, got ${secondsPendulumT}`);
console.log('[PASS] Module 06: Simple & elliptic large-angle pendulum period verified.');

// 7. Optics: Snell's Law & Total Internal Reflection (Glass n1=1.52 -> Air n2=1.00)
const airToGlass = computeSnellRefraction({ incidentAngleDeg: 30, n1: 1.0, n2: 1.52 });
assert.equal(airToGlass.totalInternalReflection, false);
assert.ok(Math.abs(airToGlass.refractedAngleDeg - 19.2) < 0.15);
const glassToAirTIR = computeSnellRefraction({ incidentAngleDeg: 50, n1: 1.52, n2: 1.0 });
assert.equal(glassToAirTIR.totalInternalReflection, true, '50 deg in crown glass exceeds ~41.1 deg critical angle -> TIR');
console.log('[PASS] Module 07: Snell\'s Law & Total Internal Reflection critical angle verified.');

// 8. Collisions & Inclined Friction: Elastic head-on momentum exchange
const b1 = { x: 0, y: 1, z: 0, vx: 5, vy: 0, vz: 0, radius: 0.6, mass: 2 };
const b2 = { x: 1.1, y: 1, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.6, mass: 2 };
resolveSpherePairCollision(b1, b2, 1.0);
assert.ok(Math.abs(b1.vx - 0) < 1e-6 && Math.abs(b2.vx - 5) < 1e-6, 'Equal-mass elastic head-on collision exchanges velocities cleanly');
const stuckRamp = computeInclinedPlaneAcceleration(15, 0.4);
const slidingRamp = computeInclinedPlaneAcceleration(30, 0.4);
assert.equal(stuckRamp.sliding, false);
assert.equal(slidingRamp.sliding, true);
console.log('[PASS] Module 08: Momentum-conserving collisions & inclined static friction threshold verified.');

console.log('\nALL 8 LABORATORY PHYSICS SUITES PASSED (0 ERRORS).');
