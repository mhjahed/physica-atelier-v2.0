/**
 * High-DPI 2D Scientific Oscilloscope & Phase-Space Plotter
 * Draws crisp editorial plots in real time alongside the 3D WebGL apparatus.
 */

import {
  computeAirfoilAerodynamics,
  computeIdealGasProperties,
  computeDoubleSlitIntensity
} from '../physics/calculations.js';

export class OscilloscopePlotter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.history = [];
    this.maxHistory = 180;
  }

  resetHistory() {
    this.history = [];
  }

  pushSample(sample) {
    this.history.push(sample);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  prepareFrame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width || 300));
    const h = Math.max(135, Math.floor(rect.height || 155));
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Warm archival drafting paper grid
    ctx.fillStyle = '#FAF9F5';
    ctx.fillRect(0, 0, w, h);

    const pad = { l: 38, r: 14, t: 22, b: 24 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;

    ctx.strokeStyle = '#E6E2D8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = pad.l + (pw * i) / 4;
      const gy = pad.t + (ph * i) / 4;
      ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, pad.t + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + pw, gy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#8C939E';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(pad.l, pad.t, pw, ph);

    return { ctx, w, h, pad, pw, ph };
  }

  drawLabels(ctx, w, h, pad, title, xLabel, yLabel) {
    ctx.fillStyle = '#14181F';
    ctx.font = w < 370
      ? '600 9.5px "Plus Jakarta Sans", system-ui, sans-serif'
      : '600 10.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, pad.l, 14, w - pad.l - 8);

    ctx.fillStyle = '#6E7683';
    ctx.font = '500 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, pad.l + (w - pad.l - pad.r) / 2, h - 6);

    ctx.save();
    ctx.translate(11, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  render(zone, params, telemetry) {
    if (!this.canvas) return;
    const frame = this.prepareFrame();
    const { ctx, w, h, pad, pw, ph } = frame;

    if (zone === 'dynamics') {
      this.drawLabels(ctx, w, h, pad, 'Elevation Profile: Vacuum (dashed) vs Drag (solid)', 'Downrange X (−18 to +38 m)', 'Height Y (m)');
      const mapX = (x) => pad.l + ((x + 18) / 56) * pw;
      const mapY = (y) => pad.t + ph - Math.min(1, Math.max(0, y / 28)) * ph;

      // Vacuum curve
      if (telemetry.vacuumPoints?.length > 1) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#8C939E';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        telemetry.vacuumPoints.forEach((pt, idx) => {
          const sx = mapX(pt.x), sy = mapY(pt.y);
          if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Real drag curve
      if (telemetry.previewPoints?.length > 1) {
        ctx.strokeStyle = '#164863';
        ctx.lineWidth = 2;
        ctx.beginPath();
        telemetry.previewPoints.forEach((pt, idx) => {
          const sx = mapX(pt.x), sy = mapY(pt.y);
          if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
      }

      // Target marker on X axis
      if (typeof telemetry.targetX === 'number') {
        const tx = mapX(telemetry.targetX);
        ctx.fillStyle = '#B83A2D';
        ctx.fillRect(tx - 4, pad.t + ph - 4, 8, 4);
      }

      // Active projectile dot
      if (telemetry.activePos) {
        ctx.fillStyle = '#B83A2D';
        ctx.beginPath();
        ctx.arc(mapX(telemetry.activePos.x), mapY(telemetry.activePos.y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (zone === 'aerodynamics') {
      this.drawLabels(ctx, w, h, pad, 'Airfoil Lift Curve CL(α) & 15° Stall Threshold', 'Angle of Attack α (−10° to +24°)', 'CL / CD');
      const mapA = (a) => pad.l + ((a + 10) / 34) * pw;
      const mapC = (c) => pad.t + ph - ((c + 0.8) / 2.8) * ph;

      // Stall threshold vertical line
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#B83A2D';
      ctx.beginPath();
      ctx.moveTo(mapA(15), pad.t);
      ctx.lineTo(mapA(15), pad.t + ph);
      ctx.stroke();
      ctx.restore();

      // CL curve
      ctx.strokeStyle = '#164863';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = -10; a <= 24; a += 0.5) {
        const aero = computeAirfoilAerodynamics({ windSpeed: params.windSpeed, airDensity: params.airDensity, angleOfAttackDeg: a });
        const sx = mapA(a), sy = mapC(aero.cl);
        if (a === -10) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Operating dot
      ctx.fillStyle = telemetry.stalled ? '#B83A2D' : '#164863';
      ctx.beginPath();
      ctx.arc(mapA(params.angleOfAttack), mapC(telemetry.cl || 0), 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (zone === 'thermodynamics') {
      this.drawLabels(ctx, w, h, pad, `Boyle Isotherm at T = ${params.temperature} K`, 'Volume V (15 to 100 L)', 'P (kPa)');
      const mapV = (v) => pad.l + ((v - 15) / 85) * pw;
      const mapP = (p) => pad.t + ph - Math.min(1, p / 900) * ph;

      ctx.strokeStyle = '#164863';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let v = 15; v <= 100; v += 2) {
        const g = computeIdealGasProperties({ temperatureK: params.temperature, volumeLiters: v, moles: params.moles });
        const sx = mapV(v), sy = mapP(g.pressureKPa);
        if (v === 15) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      ctx.fillStyle = '#B83A2D';
      ctx.beginPath();
      ctx.arc(mapV(params.volume), mapP(telemetry.pressureKPa || 101), 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (zone === 'electromagnetism') {
      this.drawLabels(ctx, w, h, pad, 'Oscilloscope: V_cap (cobalt) · I (vermilion)', 'Time Trace (live)', 'V / mA');
      if (this.history.length > 1) {
        // Capacitor Voltage trace
        ctx.strokeStyle = '#164863';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.history.forEach((s, idx) => {
          const sx = pad.l + (idx / (this.maxHistory - 1)) * pw;
          const sy = pad.t + ph - Math.min(1, Math.max(0, (s.vCap || 0) / 24)) * ph;
          if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();

        // Current mA trace
        ctx.strokeStyle = '#B83A2D';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        this.history.forEach((s, idx) => {
          const sx = pad.l + (idx / (this.maxHistory - 1)) * pw;
          const sy = pad.t + ph - Math.min(1, Math.max(0, (s.iMa || 0) / 60)) * ph;
          if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
      }
    } else if (zone === 'quantum') {
      this.drawLabels(
        ctx, w, h, pad,
        params.detectorActive ? 'Collapsed Classical Distribution I(y)' : `Interference Fringe Pattern (λ = ${params.wavelength} nm)`,
        'Screen Coordinate y (−8 to +8 mm)',
        'I / I₀'
      );
      ctx.strokeStyle = telemetry.spectralHex || '#164863';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) {
        const yVal = -8 + (16 * i) / 140;
        const intensity = computeDoubleSlitIntensity(yVal, {
          wavelengthNm: params.wavelength,
          slitSeparationUm: params.slitSeparation,
          detectorActive: params.detectorActive
        });
        const sx = pad.l + (i / 140) * pw;
        const sy = pad.t + ph - intensity * (ph - 6);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else if (zone === 'pendulum') {
      this.drawLabels(ctx, w, h, pad, 'Energy Exchange: Kinetic (vermilion) & Potential (cobalt)', 'Time Trace', 'Joules');
      if (this.history.length > 1) {
        const maxE = Math.max(5, telemetry.totalEnergyJ * 1.15);
        ['ke', 'pe'].forEach((key, kIdx) => {
          ctx.strokeStyle = kIdx === 0 ? '#B83A2D' : '#164863';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          this.history.forEach((s, idx) => {
            const sx = pad.l + (idx / (this.maxHistory - 1)) * pw;
            const sy = pad.t + ph - Math.min(1, (s[key] || 0) / maxE) * ph;
            if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        });
      }
    } else if (zone === 'optics') {
      this.drawLabels(ctx, w, h, pad, 'Snell’s Law Ray Diagram (Cross-Section)', 'Interface Plane', 'Medium n₁ / n₂');
      const cx = pad.l + pw / 2;
      const cy = pad.t + ph / 2;
      ctx.fillStyle = 'rgba(22, 72, 99, 0.10)';
      ctx.fillRect(pad.l, cy, pw, ph / 2);

      // Interface & Normal
      ctx.strokeStyle = '#49505B';
      ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(pad.l + pw, cy); ctx.stroke();
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#8C939E';
      ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, pad.t + ph); ctx.stroke();
      ctx.restore();

      const rLen = Math.min(pw, ph) * 0.45;
      const th1 = ((params.incidentAngle || 35) * Math.PI) / 180;
      // Incident ray from top-left
      ctx.strokeStyle = '#B83A2D';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - Math.sin(th1) * rLen, cy - Math.cos(th1) * rLen);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      if (telemetry.totalInternalReflection) {
        // Total internal reflection ray to top-right
        ctx.strokeStyle = '#B83A2D';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(th1) * rLen, cy - Math.cos(th1) * rLen);
        ctx.stroke();
      } else if (typeof telemetry.refractedAngleDeg === 'number') {
        const th2 = (telemetry.refractedAngleDeg * Math.PI) / 180;
        ctx.strokeStyle = '#164863';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(th2) * rLen, cy + Math.cos(th2) * rLen);
        ctx.stroke();
      }
    } else if (zone === 'sandbox') {
      this.drawLabels(ctx, w, h, pad, 'System Mechanical Energy: Kinetic (vermilion) & Total (cobalt)', 'Time Trace', 'Energy (J)');
      if (this.history.length > 1) {
        const peak = Math.max(50, ...this.history.map((s) => s.totalE || 50));
        ['ke', 'totalE'].forEach((key, kIdx) => {
          ctx.strokeStyle = kIdx === 0 ? '#B83A2D' : '#164863';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          this.history.forEach((s, idx) => {
            const sx = pad.l + (idx / (this.maxHistory - 1)) * pw;
            const sy = pad.t + ph - Math.min(1, (s[key] || 0) / peak) * ph;
            if (idx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        });
      }
    }
  }
}
