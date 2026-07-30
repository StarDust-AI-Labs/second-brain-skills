import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 120;
const CENTER = {x: 1040, y: 504};
const SIZE = 520;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const outerPoints = [
  [260, 18], [372, 48], [468, 132], [500, 246], [460, 372], [354, 468],
  [226, 496], [104, 452], [24, 350], [18, 218], [76, 102], [176, 42],
] as const;

const deadParticles = Array.from({length: 26}, (_, i) => {
  const rand = mulberry32(301 + i * 571);
  const angle = rand() * Math.PI * 2;
  const radius = 240 + rand() * 470;
  return {x: CENTER.x + Math.cos(angle) * radius, y: CENTER.y + Math.sin(angle) * radius * 0.58, size: 1 + rand() * 2, opacity: 0.05 + rand() * 0.14};
});

const statuses = [
  {en: "UNPROCESSED / 247", cn: "未处理", x: 1390, y: 258, anchor: [150, -118]},
  {en: "CONNECTIONS / 0", cn: "无连接", x: 1510, y: 520, anchor: [206, 6]},
  {en: "OUTPUT / 0", cn: "无输出", x: 1368, y: 780, anchor: [148, 150]},
] as const;

export const CollectionIsNotKnowledge: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 82, DURATION - 1], [0.62, 0.72, 0.78], {...clamp, easing: easeInOut});
  const cameraX = interpolate(frame, [0, DURATION - 1], [-12, 0], {...clamp, easing: easeInOut});
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 55% 48%, #101522 0%, ${COLORS.bgBase} 36%, ${COLORS.bgDeep} 74%, #010206 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <AbsoluteFill style={{transform: `translateX(${cameraX}px)`}}>
        <StatusNetwork frame={frame} scale={scale} />
        <DeadCore frame={frame} scale={scale} />
      </AbsoluteFill>
      <Copy frame={frame} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 55% 48%, transparent 46%, rgba(1,3,9,.32) 76%, rgba(0,0,0,.74) 100%)"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill>
    {deadParticles.map((particle, i) => <div key={i} style={{position: "absolute", left: particle.x + Math.cos(frame / 55 + i) * 2, top: particle.y + Math.sin(frame / 61 + i) * 2, width: particle.size, height: particle.size, background: i % 7 === 0 ? "#6C7487" : "#3B465B", opacity: particle.opacity}} />)}
  </AbsoluteFill>
);

const StatusNetwork: React.FC<{frame: number; scale: number}> = ({frame, scale}) => (
  <>
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
      {statuses.map((status, i) => {
        const draw = phase(frame, 18 + i * 8, 38 + i * 8, easeInOut);
        const startX = CENTER.x + status.anchor[0] * scale;
        const startY = CENTER.y + status.anchor[1] * scale;
        const d = `M ${startX} ${startY} C ${startX + 110} ${startY}, ${status.x - 100} ${status.y}, ${status.x} ${status.y}`;
        return <path key={status.en} d={d} fill="none" stroke="#46536A" strokeWidth="1" opacity={draw * 0.42} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />;
      })}
    </svg>
    {statuses.map((status, i) => {
      const enter = phase(frame, 26 + i * 8, 44 + i * 8);
      const dim = interpolate(frame, [88, 119], [1, 0.5], clamp);
      return <div key={status.en} style={{position: "absolute", left: status.x, top: status.y, opacity: enter * dim, transform: `translateY(${interpolate(enter, [0, 1], [10, 0], clamp)}px)`}}>
        <div style={{fontSize: 21, fontWeight: 680, color: COLORS.textSecondary}}>{status.cn}</div>
        <div style={{marginTop: 7, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textDim, letterSpacing: 0}}>{status.en}</div>
      </div>;
    })}
  </>
);

const DeadCore: React.FC<{frame: number; scale: number}> = ({frame, scale}) => {
  const crack = phase(frame, 88, 108, easeInOut);
  const crackRise = phase(frame, 108, 119, easeOut);
  const scan = phase(frame, 82, 110, easeInOut);
  const yaw = interpolate(frame, [0, DURATION - 1], [0, -5], {...clamp, easing: easeInOut});
  return (
    <div style={{position: "absolute", left: CENTER.x, top: CENTER.y, width: SIZE, height: SIZE, transform: `translate(-50%, -50%) perspective(1200px) rotateY(${yaw}deg) scale(${scale})`, transformStyle: "preserve-3d"}}>
      <svg width={SIZE} height={SIZE} viewBox="0 0 520 520" style={{overflow: "visible"}}>
        <defs>
          {outerPoints.map((_, i) => <linearGradient key={i} id={`dead-facet-${i}`} x1={i % 2 ? "0" : "1"} y1="0" x2={i % 2 ? "1" : "0"} y2="1"><stop offset="0" stopColor={i % 3 === 0 ? "#202735" : "#151B26"} /><stop offset="0.45" stopColor="#060910" /><stop offset="0.56" stopColor="#252D3B" /><stop offset="0.66" stopColor="#070A11" /><stop offset="1" stopColor="#020409" /></linearGradient>)}
          <linearGradient id="dead-crack" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#93F7FF" /><stop offset="0.5" stopColor={COLORS.cyan} /><stop offset="1" stopColor="#1B6E7E" /></linearGradient>
        </defs>
        {outerPoints.map((point, i) => {
          const next = outerPoints[(i + 1) % outerPoints.length];
          return <polygon key={i} points={`260,260 ${point[0]},${point[1]} ${next[0]},${next[1]}`} fill={`url(#dead-facet-${i})`} stroke="#303A4C" strokeWidth="0.8" />;
        })}
        <polygon points={outerPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#303A4C" strokeWidth="1" opacity="0.72" />
        <rect x={258 - scan * 20} y="56" width={4 + scan * 40} height="408" fill={`rgba(0,229,255,${scan * 0.025})`} />
        <polyline points="270,40 248,138 276,218 252,276 272,338 244,474" fill="none" stroke="#011218" strokeWidth="8" opacity={crack * 0.72} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - crack} />
        <polyline points="270,40 248,138 276,218 252,276 272,338 244,474" fill="none" stroke="url(#dead-crack)" strokeWidth={1.2 + crackRise * 0.7} opacity={crack * (0.42 + crackRise * 0.4)} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - crack} style={{filter: `drop-shadow(0 0 ${3 + crackRise * 5}px rgba(0,229,255,.5))`}} />
      </svg>
    </div>
  );
};

const Copy: React.FC<{frame: number}> = ({frame}) => {
  const enter = phase(frame, 14, 32);
  const dim = 1 - phase(frame, 94, 116, easeInOut) * 0.72;
  return <div style={{position: "absolute", left: 112, top: 646, width: 780, opacity: enter * dim}}>
    <div style={{width: interpolate(enter, [0, 1], [0, 160], clamp), height: 1, background: "linear-gradient(90deg, #59667B, transparent)"}} />
    <div style={{marginTop: 36, fontSize: 66, lineHeight: 1.12, fontWeight: 800, clipPath: `inset(0 ${100 - enter * 100}% 0 0)`}}>但收藏，<br />不等于学会。</div>
  </div>;
};
