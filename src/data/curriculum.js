/**
 * Curriculum Monograph, Calibrated Challenges & Student Notes
 * Written specifically for junior & secondary physics students: clear physical mechanisms,
 * real numbers, historical context, zero buzzwords, zero emojis.
 */

export const CURRICULUM_MODULES = [
  {
    id: 'dynamics',
    num: '01',
    title: 'Ballistic Kinematics & Air Drag',
    discipline: 'Classical Mechanics',
    historicalRef: 'Galileo Galilei, Two New Sciences (Leiden, 1638)',
    photo: './media/hero-mechanics-lab.jpg',
    photoCaption: 'Fig. 01 — Undergraduate mechanics & optics bench with brass pendulum and vernier scale.',
    summary: 'Fire calibrated spheres from a trunnion cannon across 3D coordinates. Compare Galileo’s ideal vacuum parabola against real quadratic air resistance and crosswind drift.',
    formulaPlain: 'ma = mg + (-½ ρ Cd A |v| v)',
    formulaMarkup: 'm<strong>a</strong> = m<strong>g</strong> &minus; &frac12;&rho;C<sub>d</sub>A|<strong>v</strong>|<strong>v</strong>',
    equationLabel: 'Newtonian Trajectory with Quadratic Drag',
    variables: [
      { symbol: 'v₀', unit: 'm/s', meaning: 'Muzzle speed leaving the barrel' },
      { symbol: 'θ, φ', unit: 'deg (°)', meaning: 'Elevation pitch (θ) and horizontal azimuth yaw (φ)' },
      { symbol: 'm', unit: 'kg', meaning: 'Projectile mass — resists air deceleration (a = F/m)' },
      { symbol: 'Cd', unit: '%', meaning: 'Effective aerodynamic drag factor of the sphere' }
    ],
    studentGuide: [
      {
        heading: 'Why 45° is NOT the longest shot in real air',
        body: 'In a vacuum with flat ground, 45° splits muzzle speed equally between forward motion and time aloft, giving maximum range R = v₀²/g. Add air resistance and high shots spend too long fighting drag; real artillery and golf balls travel farthest between 32° and 40°.'
      },
      {
        heading: 'Why heavy cannonballs outfly ping-pong balls',
        body: 'Gravity pulls every kilogram with 9.81 N, so gravity accelerates 1 kg and 15 kg identically in a vacuum. Air drag pushes on surface area, not mass. Dividing the same drag force by 15 kg produces one-fifteenth the deceleration (a = Fd/m), preserving forward speed.'
      }
    ],
    challenges: [
      {
        id: 'dyn-1',
        code: 'LAB 01.A',
        title: 'Bullseye Calibration on Centerline',
        instruction: 'Strike within 1.2 m of the primary target center on Level 1 or higher.',
        hint: 'Check the dashed vacuum curve versus the solid predicted drag curve before firing.',
        check: (telemetry) => telemetry.lastHitDist !== null && telemetry.lastHitDist <= 1.2
      },
      {
        id: 'dyn-2',
        code: 'LAB 01.B',
        title: 'Heavy-Shot Drag Penetration',
        instruction: 'With Air Drag set to at least 25%, hit any target ring (< 2.5 m) using a mass of 10 kg or greater.',
        hint: 'Notice how raising mass moves the solid impact marker closer to the vacuum parabola.',
        check: (telemetry, params) => telemetry.lastHitDist !== null && telemetry.lastHitDist <= 2.5 && params.drag >= 25 && params.mass >= 10
      },
      {
        id: 'dyn-3',
        code: 'LAB 01.C',
        title: 'Off-Axis Cross-Range Artillery',
        instruction: 'Advance to Stage 2+ (where target Z ≠ 0) and score a hit using Azimuth (φ) steering.',
        hint: 'Rotate Azimuth (φ) until the predicted floor impact ring aligns with the target disc.',
        check: (telemetry) => telemetry.lastHitDist !== null && telemetry.lastHitDist <= 2.2 && Math.abs(telemetry.targetZ) >= 1.5
      }
    ],
    quiz: {
      question: 'Two identically sized spheres — a 1 kg hollow shell and a 12 kg solid steel ball — are fired at 30 m/s at 40° through thick air. Which lands farther downrange?',
      options: [
        'Both land at the exact same spot because gravity accelerates all masses equally.',
        'The 12 kg steel sphere lands farther because air drag decelerates higher mass less (a = Fd / m).',
        'The 1 kg hollow shell lands farther because gravity pulls it down with less force.'
      ],
      correctIndex: 1,
      explanation: 'Correct. Gravitational acceleration (-g) cancels mass, whereas drag deceleration (-Fd / m) shrinks inversely with mass. The 12 kg sphere loses far less horizontal velocity in flight.'
    }
  },
  {
    id: 'aerodynamics',
    num: '02',
    title: 'Subsonic Wind Tunnel & Stall Lab',
    discipline: 'Fluid Mechanics',
    historicalRef: 'Ludwig Prandtl, Aerodynamische Versuchsanstalt (Göttingen, 1908)',
    photo: './media/wind-tunnel-study.jpg',
    photoCaption: 'Fig. 02 — Machined NACA 2412 airfoil test section showing laminar smoke streamlines.',
    summary: 'Test a cambered NACA 2412 wing inside a glass test section. Observe streamline acceleration, Bernoulli pressure drop, lift-to-drag efficiency, and boundary-layer stall past 15°.',
    formulaPlain: 'L = ½ ρ v² S CL(α)',
    formulaMarkup: 'L = &frac12;&rho;v<sup>2</sup> S C<sub>L</sub>(&alpha;), &nbsp; P + &frac12;&rho;v<sup>2</sup> = const.',
    equationLabel: 'Dynamic Lift & Bernoulli Streamline Relation',
    variables: [
      { symbol: 'v', unit: 'm/s', meaning: 'Freestream airspeed entering the test section' },
      { symbol: 'α', unit: 'deg (°)', meaning: 'Angle of attack (nose-up pitch relative to incoming airflow)' },
      { symbol: 'ρ', unit: 'kg/m³', meaning: 'Air density (1.225 kg/m³ at sea level; ~0.53 at 8 km altitude)' },
      { symbol: 'L / D', unit: 'ratio', meaning: 'Aerodynamic glide efficiency — lift generated per Newton of drag' }
    ],
    studentGuide: [
      {
        heading: 'How a wing turns air downward and speeds air over top',
        body: 'Tilting the leading edge upward forces air smoothly over the curved upper camber. Tightly packed streamlines indicate higher local speed and lower static pressure above the wing (Bernoulli), while trailing airflow leaves angled downward (Newton’s third law).'
      },
      {
        heading: 'What happens during an aerodynamic stall (> 15°)',
        body: 'Raise Angle of Attack past 15° and air can no longer follow the steep upper slope. The boundary layer detaches into swirling wake eddies: lift drops abruptly while pressure drag triples.'
      }
    ],
    challenges: [
      {
        id: 'aero-1',
        code: 'LAB 02.A',
        title: 'Takeoff Weight Trim (1,500 N)',
        instruction: 'Generate between 1,450 N and 1,750 N of Lift WITHOUT stalling the wing (keep α < 15°).',
        hint: 'Try 6°–9° angle of attack and adjust Wind Speed near 25–30 m/s.',
        check: (telemetry) => !telemetry.stalled && telemetry.liftN >= 1450 && telemetry.liftN <= 1750
      },
      {
        id: 'aero-2',
        code: 'LAB 02.B',
        title: 'Peak Sailplane Efficiency',
        instruction: 'Achieve a Lift-to-Drag ratio (L/D) exceeding 14.5.',
        hint: 'Peak L/D occurs at a gentle nose-up angle (3° to 6°) before induced drag grows steep.',
        check: (telemetry) => !telemetry.stalled && telemetry.liftToDrag >= 14.5
      },
      {
        id: 'aero-3',
        code: 'LAB 02.C',
        title: 'High-Altitude Thin Air Compensation',
        instruction: 'Set Air Density (ρ) to 0.7 kg/m³ (cruising altitude) and still maintain at least 1,800 N of unstalled lift.',
        hint: 'Because lift scales with v², a modest speed increase offsets thin air rapidly.',
        check: (telemetry, params) => !telemetry.stalled && params.airDensity <= 0.7 && telemetry.liftN >= 1800
      }
    ],
    quiz: {
      question: 'If an aircraft doubles its airspeed v while keeping angle of attack and air density constant, how does aerodynamic lift change?',
      options: [
        'Lift doubles (2×).',
        'Lift quadruples (4×) because dynamic pressure scales with v².',
        'Lift stays constant until angle of attack changes.'
      ],
      correctIndex: 1,
      explanation: 'Correct. Because L = ½ ρ v² S CL, doubling airspeed multiplies v² by 2² = 4, quadrupling both lift and drag.'
    }
  },
  {
    id: 'thermodynamics',
    num: '03',
    title: 'Kinetic Gas Law & Piston Chamber',
    discipline: 'Thermodynamics',
    historicalRef: 'Robert Boyle (Oxford, 1662) & James Clerk Maxwell (1860)',
    photo: './media/thermodynamics-apparatus.jpg',
    photoCaption: 'Fig. 03 — Classical Boyle-Mariotte glass compression cylinder and brass Bourdon gauge.',
    summary: 'Compress or heat a confined gas column beneath a weighted steel piston. Observe molecular collision rates, RMS speed, internal energy, and the live P–V isotherm curve.',
    formulaPlain: 'P V = n R T,   v_rms = √(3RT / M)',
    formulaMarkup: 'P V = n R T, &nbsp; v<sub>rms</sub> = &radic;(3RT / M)',
    equationLabel: 'Ideal Gas State Equation & Molecular Speed',
    variables: [
      { symbol: 'T', unit: 'K', meaning: 'Absolute temperature in Kelvin (273 K = 0 °C)' },
      { symbol: 'V', unit: 'L', meaning: 'Chamber volume trapped below the piston head' },
      { symbol: 'n', unit: 'mol', meaning: 'Quantity of gas molecules sealed inside the cylinder' },
      { symbol: 'P', unit: 'kPa', meaning: 'Wall pressure produced by molecular momentum impacts (101.3 kPa = 1 atm)' }
    ],
    studentGuide: [
      {
        heading: 'Where gas pressure actually comes from',
        body: 'Gas molecules do not push one another like springs from afar. Pressure is simply billions of elastic collisions every microsecond against the cylinder walls and piston face.'
      },
      {
        heading: 'Halve the volume, double the collision rate',
        body: 'Keep temperature at 300 K so average speed stays 508 m/s. Push the piston halfway down (from 60 L to 30 L): every molecule crosses the chamber twice as often, doubling pressure from 83.1 kPa to 166.3 kPa (Boyle’s Law).'
      }
    ],
    challenges: [
      {
        id: 'thermo-1',
        code: 'LAB 03.A',
        title: 'Standard Sea-Level Atmosphere',
        instruction: 'Tune the chamber to match standard atmospheric pressure between 100.0 kPa and 103.0 kPa.',
        hint: 'At 1.0 mol and 300 K, V = nRT/P ≈ 24.6 L gives 101.3 kPa.',
        check: (telemetry) => telemetry.pressureKPa >= 100.0 && telemetry.pressureKPa <= 103.0
      },
      {
        id: 'thermo-2',
        code: 'LAB 03.B',
        title: 'High-Pressure Diesel Compression',
        instruction: 'Reach at least 550 kPa without exceeding 650 K temperature.',
        hint: 'Combine higher molar gas charge (n ≥ 2.5 mol) with small compressed cylinder volume (< 30 L).',
        check: (telemetry, params) => telemetry.pressureKPa >= 550 && params.temperature <= 650
      },
      {
        id: 'thermo-3',
        code: 'LAB 03.C',
        title: 'Supersonic Molecular Speed',
        instruction: 'Heat the gas until root-mean-square molecular speed (v_rms) exceeds 750 m/s.',
        hint: 'v_rms depends strictly on temperature T, independent of volume or moles!',
        check: (telemetry) => telemetry.vRms >= 750
      }
    ],
    quiz: {
      question: 'You compress an insulated cylinder slowly at constant temperature 300 K from 80 L down to 20 L. What happens to the pressure and RMS molecular speed?',
      options: [
        'Pressure quadruples (4×), while RMS speed stays unchanged because temperature is still 300 K.',
        'Both pressure and RMS molecular speed quadruple.',
        'Pressure drops by one fourth.'
      ],
      correctIndex: 0,
      explanation: 'Correct. At constant T = 300 K, molecular kinetic energy (and v_rms) stays constant, while packing molecules into 1/4 the volume multiplies wall collision rate 4×.'
    }
  },
  {
    id: 'electromagnetism',
    num: '04',
    title: 'Ohm’s Law, EIA Resistors & RC Bench',
    discipline: 'Electrodynamics',
    historicalRef: 'Georg Simon Ohm (Berlin, 1827) & Gustav Kirchhoff (1845)',
    photo: './media/optics-electro-bench.jpg',
    photoCaption: 'Fig. 04 — Benchtop digital oscilloscope, RC test circuit, copper inductor, and crown prism.',
    summary: 'Drive a DC supply across a precision carbon-film resistor (with live EIA 4-band color rings), parallel RC capacitor branch, and optical indicator LED protected by a 35 mA fuse.',
    formulaPlain: 'I = V / R,   Vc(t) = V₀(1 − e^(−t/RC))',
    formulaMarkup: 'I = V / R, &nbsp; P = V I, &nbsp; V<sub>C</sub>(t) = V<sub>0</sub>(1 &minus; e<sup>&minus;t/RC</sup>)',
    equationLabel: 'Ohm’s Law & RC Capacitor Charging Law',
    variables: [
      { symbol: 'V', unit: 'V', meaning: 'Electromotive potential difference across supply rails' },
      { symbol: 'R', unit: 'Ω', meaning: 'Series resistance limiting current flow (color-coded on resistor body)' },
      { symbol: 'I', unit: 'mA', meaning: 'Steady branch current through the LED loop (safe window: 15–35 mA)' },
      { symbol: 'τ = RC', unit: 'ms', meaning: 'RC time constant — time to charge capacitor to 63.2% of supply voltage' }
    ],
    studentGuide: [
      {
        heading: 'Reading real 4-band resistor color codes on the bench',
        body: 'Slide the Resistance control and watch the four painted bands on the 3D resistor body update automatically: Band 1 (tens digit), Band 2 (ones digit), Band 3 (power-of-ten multiplier), Band 4 (gold ±5% tolerance). For 220 Ω: Red (2), Red (2), Brown (×10¹).'
      },
      {
        heading: 'Why LEDs always need a series current-limiting resistor',
        body: 'Connect a 9 V or 12 V supply straight across an LED and excessive current burns out the semiconductor junction instantly (> 35 mA here). A series resistor sets exact safe current I = V / R.'
      }
    ],
    challenges: [
      {
        id: 'elec-1',
        code: 'LAB 04.A',
        title: 'Nominal 20 mA Optical Drive',
        instruction: 'Power the circuit with Switch CLOSED so current lands cleanly between 18.0 mA and 22.0 mA.',
        hint: 'At 5 V, try R near 240–270 Ω; at 9 V, try R near 450 Ω.',
        check: (telemetry) => telemetry.ledConducting && telemetry.currentMa >= 18.0 && telemetry.currentMa <= 22.0
      },
      {
        id: 'elec-2',
        code: 'LAB 04.B',
        title: 'Slow 250 ms RC Timer Design',
        instruction: 'Configure R and C so the RC time constant τ = R × C exceeds 250 ms without blowing the 35 mA fuse.',
        hint: 'Increase both Resistance (Ω) and Capacitance (μF), then toggle the circuit switch to watch slow charging on the scope!',
        check: (telemetry) => !telemetry.ledOverloaded && telemetry.tauMs >= 250
      },
      {
        id: 'elec-3',
        code: 'LAB 04.C',
        title: 'Quarter-Watt Power Efficiency',
        instruction: 'Deliver between 200 mW and 250 mW of circuit power safely without overloading the LED.',
        hint: 'At I = 25 mA and V = 9 V, P = V × I = 225 mW (check R = 9 / 0.025 = 360 Ω).',
        check: (telemetry) => !telemetry.ledOverloaded && telemetry.powerMw >= 200 && telemetry.powerMw <= 250
      }
    ],
    quiz: {
      question: 'You have a 12 V DC bench supply and an LED that burns out above 35 mA. Which resistor keeps the LED bright at 25 mA safely?',
      options: [
        '100 Ω (gives 120 mA)',
        '480 Ω (gives I = 12 V / 480 Ω = 0.025 A = 25 mA)',
        '4,800 Ω (gives 2.5 mA)'
      ],
      correctIndex: 1,
      explanation: 'Correct. By Ohm’s Law, R = V / I = 12 V / 0.025 A = 480 Ω (Yellow-Grey-Brown), keeping current safely below the 35 mA thermal fuse.'
    }
  },
  {
    id: 'quantum',
    num: '05',
    title: 'Double-Slit Interference & Orbitals',
    discipline: 'Quantum Physics',
    historicalRef: 'Thomas Young (1801), Louis de Broglie (1924) & Claus Jönsson (Tübingen, 1961)',
    photo: './media/optics-electro-bench.jpg',
    photoCaption: 'Fig. 05 — Spectral dispersion and coherent wave measurement apparatus.',
    summary: 'Fire monochromatic photons from 380 nm violet to 700 nm red through a double slit. Accumulate single-photon impacts on a phosphor screen and test observer wave-function collapse.',
    formulaPlain: 'Δy = λ L / d,   E = h c / λ',
    formulaMarkup: '&Delta;y = &lambda;L / d, &nbsp; E = hc / &lambda;',
    equationLabel: 'Young’s Fringe Spacing & Planck Photon Energy',
    variables: [
      { symbol: 'λ', unit: 'nm', meaning: 'Optical wavelength (380 nm violet → 532 nm green → 700 nm deep red)' },
      { symbol: 'd', unit: 'μm', meaning: 'Center-to-center spacing between Slit A and Slit B' },
      { symbol: 'E', unit: 'eV', meaning: 'Single-photon energy packet (inversely proportional to wavelength)' },
      { symbol: 'Detector', unit: 'ON/OFF', meaning: 'Which-way sensor at the slits — destroys phase interference when active' }
    ],
    studentGuide: [
      {
        heading: 'Why longer red wavelengths spread fringes wider apart',
        body: 'Constructive peaks appear wherever path length differs by whole wavelengths (d sinθ = mλ). Longer red waves (680 nm) require a larger angle θ than short violet waves (405 nm) to accumulate one full wavelength difference, stretching the fringe spacing Δy = λL/d.'
      },
      {
        heading: 'Single particles still build a wave pattern — unless watched',
        body: 'Even if photons arrive one dot at a time, dark bands appear where two paths cancel. Turn ON the Which-Way Slit Detector: knowing which slit each photon took erases interference, leaving two plain stripes!'
      }
    ],
    challenges: [
      {
        id: 'qm-1',
        code: 'LAB 05.A',
        title: 'Ultraviolet-Edge High Energy Photon',
        instruction: 'Tune Wavelength (λ) so single-photon energy exceeds 3.00 eV and collect at least 400 screen hits.',
        hint: 'Shorter blue/violet wavelengths near 380–410 nm carry the highest energy per photon (E = 1240 eV·nm / λ).',
        check: (telemetry) => telemetry.photonEv >= 3.0 && telemetry.hitCount >= 400
      },
      {
        id: 'qm-2',
        code: 'LAB 05.B',
        title: 'Wide-Angle Red Diffraction',
        instruction: 'With Detector OFF (Wave Coherence intact), widen fringe spacing by pairing red light (λ ≥ 630 nm) with narrow slit separation (d ≤ 1.5 μm).',
        hint: 'Watch both the 3D phosphor plate and 2D intensity curve spread outward.',
        check: (telemetry, params) => !params.detectorActive && params.wavelength >= 630 && params.slitSeparation <= 1.5
      },
      {
        id: 'qm-3',
        code: 'LAB 05.C',
        title: 'Quantum Observer Collapse Verification',
        instruction: 'Activate the Which-Way Slit Detector and accumulate 300+ classical two-band impacts.',
        hint: 'Notice the central bright maximum at y = 0 disappear into two offset Gaussian peaks.',
        check: (telemetry, params) => params.detectorActive && telemetry.hitCount >= 300
      }
    ],
    quiz: {
      question: 'In a double-slit experiment, how do you spread the bright interference fringes farther apart on the detector screen?',
      options: [
        'Use shorter violet wavelength and wider slit separation d.',
        'Use longer red wavelength (↑ λ) or move the two slits closer together (↓ d).',
        'Turn on a which-way detector directly behind one slit.'
      ],
      correctIndex: 1,
      explanation: 'Correct. Since Δy = λL / d, increasing wavelength λ in the numerator or decreasing slit spacing d in the denominator widens fringe spacing.'
    }
  },
  {
    id: 'pendulum',
    num: '06',
    title: 'Isochronous Pendulum & Harmonics',
    discipline: 'Oscillations & Energy',
    historicalRef: 'Christiaan Huygens, Horologium Oscillatorium (The Hague, 1673)',
    photo: './media/hero-mechanics-lab.jpg',
    photoCaption: 'Fig. 06 — Precision suspended brass bob demonstrating conservation of mechanical energy.',
    summary: 'Release a suspended brass bob under Earth, Lunar, Martian, or Jovian gravity. Measure exact swing period, test Galileo’s mass-independence law, and observe live kinetic-to-potential energy exchange.',
    formulaPlain: 'T = 2π √(L / g) · [1 + θ₀²/16]',
    formulaMarkup: 'T = 2&pi;&radic;(L / g), &nbsp; E = &frac12;mv<sup>2</sup> + mgh = const.',
    equationLabel: 'Huygens Pendulum Law & Energy Conservation',
    variables: [
      { symbol: 'L', unit: 'm', meaning: 'Suspension wire length from pivot knife-edge to bob center of mass' },
      { symbol: 'g', unit: 'm/s²', meaning: 'Local gravitational field (Earth 9.81, Moon 1.62, Jupiter 24.79 m/s²)' },
      { symbol: 'm', unit: 'kg', meaning: 'Brass bob mass — changes energy in Joules, NOT period T!' },
      { symbol: 'θ₀', unit: 'deg (°)', meaning: 'Initial release amplitude from vertical equilibrium' }
    ],
    studentGuide: [
      {
        heading: 'The surprise every student should test: Mass cancels out!',
        body: 'Slide Bob Mass from 1 kg to 10 kg while watching Period T. It stays rock steady! A 10× heavier bob feels 10× stronger gravitational restoring torque, which accelerates its 10× larger inertia at the exact same rate.'
      },
      {
        heading: 'How to quadruple a clock’s tick time',
        body: 'Because length sits inside a square root (T = 2π√(L/g)), making a pendulum twice as slow requires a wire FOUR times longer. A grandfather “seconds pendulum” (1 s each way = 2.00 s full period on Earth) measures almost exactly 0.994 meters.'
      }
    ],
    challenges: [
      {
        id: 'pend-1',
        code: 'LAB 06.A',
        title: 'Huygens 2.00-Second Grandfather Clock',
        instruction: 'Tune wire length L and release angle so the full period T sits between 1.98 s and 2.02 s.',
        hint: 'On Earth (g = 9.81 m/s²) with small angle (10°–15°), set L right near 1.00 m!',
        check: (telemetry) => telemetry.periodSec >= 1.98 && telemetry.periodSec <= 2.02
      },
      {
        id: 'pend-2',
        code: 'LAB 06.B',
        title: 'Lunar Slow-Motion Harmonic',
        instruction: 'Lower gravity to Lunar surface (≤ 1.7 m/s²) and achieve a slow period exceeding 5.50 seconds.',
        hint: 'Try gravity near 1.6 m/s² with wire length L ≥ 1.25 m.',
        check: (telemetry, params) => params.gravity <= 1.7 && telemetry.periodSec >= 5.5
      },
      {
        id: 'pend-3',
        code: 'LAB 06.C',
        title: 'High-Energy 25 Joule Swing',
        instruction: 'Store at least 25.0 J of total mechanical energy E_total at release.',
        hint: 'Potential energy at release is m g L (1 − cosθ₀): raise mass m, length L, and release angle θ₀!',
        check: (telemetry) => telemetry.totalEnergyJ >= 25.0
      }
    ],
    quiz: {
      question: 'A playground swing takes 3.0 seconds per full back-and-forth cycle with a 30 kg child seated on it. If a 60 kg adult sits in the exact same posture on the same chains, what is the period?',
      options: [
        '6.0 seconds',
        'Still 3.0 seconds — period depends on length L and gravity g, not mass.',
        '2.1 seconds'
      ],
      correctIndex: 1,
      explanation: 'Correct. Mass cancels identically from both sides of ma = −mg sinθ, leaving period T independent of rider mass.'
    }
  },
  {
    id: 'optics',
    num: '07',
    title: 'Snell’s Law Refraction & Laser Target',
    discipline: 'Geometric Wave Optics',
    historicalRef: 'Ibn Sahl (Baghdad, 984) & Willebrord Snellius (Leiden, 1621)',
    photo: './media/optics-electro-bench.jpg',
    photoCaption: 'Fig. 07 — Optical prism refraction on calibrated millimeter graph paper.',
    summary: 'Steer a collimated laser beam across planar interfaces between Air, Water (1.33), Crown Glass (1.52), Sapphire (1.77), and Diamond (2.42). Explore Total Internal Reflection and hit the optical sensor.',
    formulaPlain: 'n₁ sin(θ₁) = n₂ sin(θ₂),   θc = arcsin(n₂ / n₁)',
    formulaMarkup: 'n<sub>1</sub> sin(&theta;<sub>1</sub>) = n<sub>2</sub> sin(&theta;<sub>2</sub>), &nbsp; &theta;<sub>c</sub> = arcsin(n<sub>2</sub> / n<sub>1</sub>)',
    equationLabel: 'Snell’s Refraction Law & Critical Fiber Angle',
    variables: [
      { symbol: 'θ₁', unit: 'deg (°)', meaning: 'Incident ray angle measured from the perpendicular surface normal!' },
      { symbol: 'n₁', unit: 'index', meaning: 'Top medium refractive index (v₁ = c / n₁)' },
      { symbol: 'n₂', unit: 'index', meaning: 'Bottom medium refractive index (higher n = slower wave speed)' },
      { symbol: 'θ₂', unit: 'deg (°)', meaning: 'Refracted ray angle inside Medium 2 (or 100% reflection past θc)' }
    ],
    studentGuide: [
      {
        heading: 'Always measure angles from the perpendicular dashed Normal!',
        body: 'The #1 student exam error in optics is measuring from the glass surface instead of the vertical normal line. When light enters denser glass (n₂ > n₁), light slows down and bends TOWARD the normal (θ₂ < θ₁).'
      },
      {
        heading: 'How fiber-optic internet cables trap light (Total Internal Reflection)',
        body: 'Send light from dense glass (n₁ = 1.52) toward air (n₂ = 1.00). Past the critical angle θc = arcsin(1/1.52) = 41.1°, sin(θ₂) exceeds 1: refraction is mathematically impossible, turning the interface into a 100% lossless mirror!'
      }
    ],
    challenges: [
      {
        id: 'opt-1',
        code: 'LAB 07.A',
        title: 'Photodiode Sensor Alignment',
        instruction: 'Refract the transmitted beam cleanly onto the green optical photodiode receiver on the lower bench.',
        hint: 'Adjust Incident Angle (θ₁) or Bottom Refractive Index (n₂) until the transmitted laser spot strikes the green sensor.',
        check: (telemetry) => telemetry.sensorHit === true
      },
      {
        id: 'opt-2',
        code: 'LAB 07.B',
        title: 'Fiber-Optic Total Internal Reflection',
        instruction: 'Set Top Index n₁ higher than Bottom Index n₂ and trigger Total Internal Reflection (TIR).',
        hint: 'Set Top Medium n₁ ≥ 1.50, Bottom Medium n₂ = 1.00, and raise θ₁ past 42°.',
        check: (telemetry) => telemetry.totalInternalReflection === true
      },
      {
        id: 'opt-3',
        code: 'LAB 07.C',
        title: 'High-Dispersion Diamond Bending',
        instruction: 'With Top Medium Air (n₁ = 1.00) and Incident Angle θ₁ = 60°, bend light inside Diamond (n₂ ≥ 2.40) below 22°.',
        hint: 'Diamond slows light to 41% of c, bending even a steep 60° ray tightly toward the normal (~21.0°)!',
        check: (telemetry, params) => params.n1 <= 1.05 && params.incidentAngle >= 58 && !telemetry.totalInternalReflection && telemetry.refractedAngleDeg <= 22.0
      }
    ],
    quiz: {
      question: 'Under what condition can Total Internal Reflection (100% internal mirror bounce) occur?',
      options: [
        'Only when light travels from a higher-index medium (like glass, n₁ = 1.52) toward a lower-index medium (like air, n₂ = 1.00) beyond θc.',
        'Whenever light enters diamond from air at a shallow angle.',
        'At any angle whenever n₁ = n₂.'
      ],
      correctIndex: 0,
      explanation: 'Correct. Total internal reflection requires n₁ > n₂ so that (n₁/n₂)sin(θ₁) can exceed 1.0 once θ₁ passes critical angle arcsin(n₂/n₁).'
    }
  },
  {
    id: 'sandbox',
    num: '08',
    title: 'Rigid Collisions & Friction Ramp',
    discipline: 'Momentum & Tribology',
    historicalRef: 'René Descartes, John Wallis & Christiaan Huygens (Royal Society Contest, 1668)',
    photo: './media/hero-mechanics-lab.jpg',
    photoCaption: 'Fig. 08 — Multi-body momentum exchange and inclined plane friction apparatus.',
    summary: 'Combine free multi-body collisions with a calibrated inclined plane ramp. Test static versus kinetic friction angles (tan θ > μ), elastic restitution (e), and billiard impulse shots.',
    formulaPlain: 'Σ mᵢ vᵢ = const.,   a_ramp = g(sin θ − μ cos θ)',
    formulaMarkup: '&Sigma;m<sub>i</sub><strong>v</strong><sub>i</sub> = const., &nbsp; a<sub>ramp</sub> = g(sin&theta; &minus; &mu; cos&theta;)',
    equationLabel: 'Momentum Conservation & Inclined Ramp Law',
    variables: [
      { symbol: 'θ_ramp', unit: 'deg (°)', meaning: 'Inclined plane tilt angle — block slides once tan(θ) > μ!' },
      { symbol: 'μ', unit: 'coeff', meaning: 'Coefficient of surface friction between test block and oak ramp' },
      { symbol: 'e', unit: '0–1', meaning: 'Restitution bounciness (1.0 = super-elastic steel; 0.1 = dead clay)' },
      { symbol: 'g', unit: 'm/s²', meaning: 'Chamber gravitational acceleration (0 m/s² = orbital weightlessness)' }
    ],
    studentGuide: [
      {
        heading: 'How engineers measure friction with nothing but a protractor',
        body: 'Place any block on a plank and tilt slowly until it begins to slide at critical angle θc. Because m g sin(θc) = μ m g cos(θc), mass cancels completely and μ = tan(θc)! At μ = 0.40, sliding begins right past arctan(0.40) = 21.8°.'
      },
      {
        heading: 'Elastic vs. Inelastic collisions',
        body: 'Momentum (m·v) is conserved in EVERY isolated collision, even sticky clay (e = 0.1). Kinetic energy (½mv²) is conserved only when restitution e = 1.0.'
      }
    ],
    challenges: [
      {
        id: 'sb-1',
        code: 'LAB 08.A',
        title: 'Critical Angle of Repose Breakaway',
        instruction: 'Set Friction (μ) ≥ 0.35 and tilt the Ramp Angle just past the breakaway angle so the test block accelerates down the ramp.',
        hint: 'For μ = 0.40, tilt Ramp Angle above 22° and click Release Block / Spawn.',
        check: (telemetry, params) => params.friction >= 0.35 && telemetry.rampSliding === true
      },
      {
        id: 'sb-2',
        code: 'LAB 08.B',
        title: 'Zero-Gravity Orbital Cluster',
        instruction: 'Set Gravity to 0.0 m/s², Elastic Restitution (e) ≥ 0.90, and maintain at least 6 colliding spheres/polyhedra in motion.',
        hint: 'Click Impulse Shot to stir the floating bodies and watch momentum transfer in weightless space!',
        check: (telemetry, params) => params.gravity === 0 && params.restitution >= 0.9 && telemetry.bodyCount >= 6
      },
      {
        id: 'sb-3',
        code: 'LAB 08.C',
        title: 'High-Kinetic Billiard Break',
        instruction: 'Trigger an Impulse Shot that pushes total system kinetic energy above 120 Joules.',
        hint: 'Spawn 5+ bodies first, then click Fire Impulse Cue.',
        check: (telemetry) => telemetry.kineticEnergyJ >= 120
      }
    ],
    quiz: {
      question: 'A wooden crate begins sliding down a ramp the moment the ramp angle passes 26.6° (tan 26.6° = 0.50). If you stack bricks inside the crate to triple its mass, at what angle does it start sliding?',
      options: [
        'Nearly 60° because three times the weight presses harder on the ramp.',
        'Still 26.6° — doubling/tripling mass multiplies both downslope pull (mg sinθ) and friction (μmg cosθ) equally!',
        '9° because heavier objects slide much earlier.'
      ],
      correctIndex: 1,
      explanation: 'Correct. Mass m cancels out of mg sinθ = μ mg cosθ, leaving tan(θc) = μ = 0.50 regardless of crate weight.'
    }
  }
];
