# Physica Atelier — Interactive 3D Physics Laboratory (v2.0)

An open educational 3D physics laboratory and illustrated curriculum built for junior and secondary students. Every module pairs a calibrated Three.js physical bench (daylight studio PBR environment, 3D force vectors, slow-motion and single-frame stepping) with a real-time 2D scientific plotter, three quantitative lab challenges, and diagnostic check questions.

<a href="https://physica-atelier-v20-lilac.vercel.app/">Open this project live</a>

## Running on Your PC (Fully Tested for Node.js v22 LTS)

This project uses standard ES Modules (`"type": "module"`) and pure Node built-in APIs (`node:http`, `node:fs`, `node:path`, `node:url`, `node:assert/strict`), so it runs out of the box on **Node.js 18, 20, and 22 LTS** on Windows 10/11, macOS, and Linux.

### Option A — Instant Launch (Zero Install Needed)
Because the compiled production static bundle is already included in `./release/`:
- **Windows (Explorer)**: Double-click **`run-on-windows.bat`**
- **PowerShell / CMD / Terminal**:
  ```powershell
  node serve-local.mjs
  ```
  Opens `http://localhost:8080` automatically in your default browser.

### Option B — Full Development & Rebuild Workflow (Node.js v22 LTS)
Open PowerShell, Windows Terminal, CMD, or bash inside the extracted `physica-atelier-v2.0` directory:

```powershell
# 1. Install Three.js & Vite locally for your OS
npm install

# 2. Run the 8-module deterministic physics verification test suite
npm run verify:physics

# 3. Start Vite hot-reloading development server
npm run dev

# 4. Build fresh static deployment bundle into ./release/
npm run build
```

### Option C — Deploy to GitHub Pages / Netlify / Vercel / Cloudflare Pages
- **Netlify Drop / Cloudflare Pages**: Drag and drop the **`release`** folder directly into the dashboard.
- **GitHub Pages (Actions / Branch)**: Publish the contents of `./release` (`base: './'` works in both root domains and repository sub-paths such as `username.github.io/Physics-Game/game.html` or `index.html`).

---

## Eight Calibrated Experimental Benches

| No. | Module | Governing Equation | Key Student Concept |
| --- | --- | --- | --- |
| 01 | **Ballistic Kinematics & Air Drag** | `ma = mg - 1/2 rho Cd A |v| v` | Mass resists drag deceleration (`a = Fd/m`); 3D azimuth targeting & vacuum vs drag comparison |
| 02 | **Subsonic Wind Tunnel & Stall Lab** | `L = 1/2 rho v^2 S CL(alpha)` | Camber streamline acceleration, `v^2` dynamic pressure scaling, and boundary-layer stall past `15 deg` |
| 03 | **Kinetic Gas Law & Piston Chamber** | `P V = n R T` | Wall pressure from molecular collisions; Boyle isotherms & RMS molecular speed `sqrt(3RT/M)` |
| 04 | **Ohm's Law, EIA Resistors & RC Bench** | `I = V / R, Vc = V0(1 - e^(-t/RC))` | Live 4-band EIA resistor colors, `35 mA` LED fuse protection, and RC capacitor time constants |
| 05 | **Double-Slit Interference & Orbitals** | `dy = lambda L / d, E = hc / lambda` | Single-photon interference fringe buildup (`380-700 nm`) & observer wave-function collapse |
| 06 | **Isochronous Pendulum & Harmonics** | `T = 2 pi sqrt(L / g)` | Mass independence of swing period, Huygens seconds pendulum (`0.994 m`), and KE/PE exchange |
| 07 | **Snell's Law Refraction & Laser Target** | `n1 sin(theta1) = n2 sin(theta2)` | Normal-angle measurement, optical sensor alignment, and fiber-optic Total Internal Reflection |
| 08 | **Rigid Collisions & Friction Ramp** | `Sum m_i v_i = const, tan(theta_c) = mu` | Critical angle of repose on inclined planes, elastic vs inelastic restitution, and impulse breaks |

## License

MIT License.
