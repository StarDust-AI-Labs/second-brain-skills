import React from "react";
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 120;
const SIZE = 500;
const CENTER = {x: 1230, y: 520};
const LOCAL_CENTER = 250;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const outerPoints = [
  [250, 18], [358, 46], [449, 126], [482, 238], [448, 358], [348, 452],
  [224, 482], [108, 442], [24, 344], [18, 218], [72, 102], [166, 40],
] as const;

const facets = outerPoints.map((point, i) => {
  const next = outerPoints[(i + 1) % outerPoints.length];
  const rand = mulberry32(8801 + i * 997);
  const centroidX = (LOCAL_CENTER + point[0] + next[0]) / 3;
  const centroidY = (LOCAL_CENTER + point[1] + next[1]) / 3;
  const angle = Math.atan2(centroidY - LOCAL_CENTER, centroidX - LOCAL_CENTER);
  return {point, next, centroidX, centroidY, angle, travel: 74 + rand() * 150, rotation: (rand() > 0.5 ? 1 : -1) * (7 + rand() * 16), delay: i * 1.45};
});

const nodes = Array.from({length: 38}, (_, i) => {
  const rand = mulberry32(3221 + i * 683);
  const side = i % 4;
  const x = side === 0 ? 220 + rand() * 520 : side === 1 ? 1510 + rand() * 260 : 420 + rand() * 1040;
  const y = side === 2 ? 130 + rand() * 220 : side === 3 ? 750 + rand() * 220 : 190 + rand() * 680;
  const targetAngle = rand() * Math.PI * 2;
  const targetRadius = 46 + rand() * 180;
  return {
    x, y,
    tx: CENTER.x + Math.cos(targetAngle) * targetRadius,
    ty: CENTER.y + Math.sin(targetAngle) * targetRadius * 0.82,
    size: i % 8 === 0 ? 7 : 3 + rand() * 2,
    delay: rand() * 18,
    bend: (rand() - 0.5) * 220,
  };
});

const slivers = [
  {label: "视频选题.md", x: 240, y: 260, angle: -8, delay: 0},
  {label: "文章摘要.md", x: 320, y: 790, angle: 6, delay: 5},
  {label: "项目方案.md", x: 760, y: 170, angle: -4, delay: 10},
  {label: "outline.md", x: 1650, y: 690, angle: 8, delay: 14},
] as const;

export const KnowledgeCrystallization: React.FC = () => {
  const frame = useCurrentFrame();
  const cameraScale = interpolate(frame, [0, 40, 82, DURATION - 1], [0.97, 1.015, 1.065, 1.08], {...clamp, easing: easeInOut});
  const cameraX = interpolate(frame, [0, 48, DURATION - 1], [20, -8, 0], {...clamp, easing: easeInOut});
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 64% 49%, #121A25 0%, ${COLORS.bgBase} 34%, ${COLORS.bgDeep} 72%, #02040A 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <CarryFromVault frame={frame} />
      <AbsoluteFill style={{transform: `translateX(${cameraX}px) scale(${cameraScale})`, transformOrigin: `${CENTER.x}px ${CENTER.y}px`}}>
        <Aggregation frame={frame} />
        <Crystal frame={frame} />
      </AbsoluteFill>
      <Copy frame={frame} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 64% 50%, transparent 42%, rgba(1,3,9,.26) 75%, rgba(0,0,0,.66) 100%)"}} />
    </AbsoluteFill>
  );
};

const CarryFromVault: React.FC<{frame: number}> = ({frame}) => {
  const opacity = 1 - phase(frame, 0, 20, easeInOut);
  return (
    <div style={{position: "absolute", left: 910, top: 106, width: 900, height: 866, opacity: opacity * 0.42, border: "1px solid rgba(58,76,99,.68)", background: "rgba(4,8,14,.48)"}}>
      <div style={{position: "absolute", left: 30, right: 30, top: 78, height: 1, background: "rgba(58,76,99,.58)"}} />
      {[126, 356, 598].map((top, i) => <div key={top} style={{position: "absolute", left: 30, right: 30, top, height: i === 2 ? 220 : 202, borderLeft: `2px solid ${i === 2 ? COLORS.cyan : "#34455B"}`, borderTop: "1px solid rgba(58,76,99,.45)", borderBottom: "1px solid rgba(58,76,99,.24)"}} />)}
      <div style={{position: "absolute", left: 32, top: 32, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.cyan, letterSpacing: 0}}>LOCAL VAULT / OBSIDIAN</div>
    </div>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => {
  const warm = phase(frame, 42, 72, easeInOut);
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", left: 780, top: 70, width: 940, height: 900, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(255,183,77,${0.08 * warm}), rgba(0,229,255,${0.03 * (1 - warm)}) 38%, transparent 70%)`, filter: "blur(22px)"}} />
      <div style={{position: "absolute", left: 80, right: 80, top: 520, height: 1, background: `linear-gradient(90deg, transparent, ${interpolateColors(warm, [0, 1], ["rgba(0,229,255,.16)", "rgba(255,183,77,.18)"])}, transparent)`}} />
    </AbsoluteFill>
  );
};

const Aggregation: React.FC<{frame: number}> = ({frame}) => {
  const warm = phase(frame, 38, 68, easeInOut);
  const networkFade = 1 - phase(frame, 66, 88, easeInOut);
  const color = interpolateColors(warm, [0, 1], [COLORS.cyan, COLORS.warmGold]);
  return (
    <AbsoluteFill style={{opacity: networkFade}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
        {nodes.map((node, i) => {
          const travel = phase(frame, node.delay, 45 + node.delay, easeInOut);
          const x = interpolate(travel, [0, 1], [node.x, node.tx], clamp);
          const y = interpolate(travel, [0, 1], [node.y, node.ty], clamp);
          const d = `M ${node.x} ${node.y} Q ${(node.x + CENTER.x) / 2} ${(node.y + CENTER.y) / 2 + node.bend} ${CENTER.x} ${CENTER.y}`;
          const draw = phase(frame, node.delay, 34 + node.delay, easeInOut);
          return <g key={i}>
            <path d={d} fill="none" stroke={color} strokeWidth={i % 8 === 0 ? 1.4 : 0.8} opacity={draw * (0.08 + (i % 5) * 0.035)} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
            <line x1={x} y1={y} x2={CENTER.x} y2={CENTER.y} stroke={color} strokeWidth="0.7" opacity={travel * 0.14} />
          </g>;
        })}
      </svg>
      {nodes.map((node, i) => {
        const travel = phase(frame, node.delay, 45 + node.delay, easeInOut);
        const x = interpolate(travel, [0, 1], [node.x, node.tx], clamp);
        const y = interpolate(travel, [0, 1], [node.y, node.ty], clamp);
        const speedAccent = phase(frame, 18 + node.delay, 30 + node.delay) * (1 - phase(frame, 36 + node.delay, 48 + node.delay));
        return <div key={i} style={{position: "absolute", left: x, top: y, width: node.size * (1 + speedAccent * 0.35), height: node.size, transform: `translate(-50%, -50%) rotate(${Math.atan2(CENTER.y - node.y, CENTER.x - node.x)}rad)`, background: color, opacity: 0.48 + travel * 0.48, boxShadow: `0 0 ${node.size * 1.7}px ${color}`}} />;
      })}
      {slivers.map((sliver) => {
        const travel = phase(frame, 8 + sliver.delay, 52 + sliver.delay, easeInOut);
        const x = interpolate(travel, [0, 1], [sliver.x, CENTER.x], clamp);
        const y = interpolate(travel, [0, 1], [sliver.y, CENTER.y], clamp);
        return <div key={sliver.label} style={{position: "absolute", left: x, top: y, width: interpolate(travel, [0, 1], [180, 38], clamp), height: interpolate(travel, [0, 1], [44, 8], clamp), transform: `translate(-50%, -50%) rotate(${interpolate(travel, [0, 1], [sliver.angle, 0], clamp)}deg)`, borderLeft: `2px solid ${color}`, background: "linear-gradient(90deg, rgba(14,24,38,.88), rgba(5,9,16,.12))", opacity: 1 - travel * 0.28, color: COLORS.textSecondary, fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0, padding: travel < 0.78 ? "10px 12px" : 0, overflow: "hidden", whiteSpace: "nowrap"}}>{sliver.label}</div>;
      })}
    </AbsoluteFill>
  );
};

const Crystal: React.FC<{frame: number}> = ({frame}) => {
  const ignition = phase(frame, 48, 70, easeInOut);
  const visible = phase(frame, 54, 68, easeInOut);
  const yaw = interpolate(frame, [62, 92, DURATION - 1], [-4, -18, -23], {...clamp, easing: easeInOut});
  const scale = interpolate(frame, [54, 82, 100, DURATION - 1], [0.72, 0.98, 1.035, 1.01], {...clamp, easing: easeInOut});
  const breath = frame > 96 ? 1 + Math.sin((frame - 96) / 8) * 0.006 : 1;
  const ring = phase(frame, 50, 72, easeOut) * (1 - phase(frame, 72, 90, easeInOut));
  return (
    <>
      <div style={{position: "absolute", left: CENTER.x, top: CENTER.y, width: interpolate(ring, [0, 1], [50, 620], clamp), height: interpolate(ring, [0, 1], [50, 620], clamp), transform: "translate(-50%, -50%)", borderRadius: "50%", border: "1px solid rgba(255,183,77,.7)", opacity: ring * 0.42, boxShadow: "0 0 14px rgba(255,183,77,.16)"}} />
      <div style={{position: "absolute", left: CENTER.x, top: CENTER.y, width: SIZE, height: SIZE, transform: `translate(-50%, -50%) perspective(1200px) rotateY(${yaw}deg) scale(${scale * breath})`, transformStyle: "preserve-3d", opacity: visible}}>
        <svg width={SIZE} height={SIZE} viewBox="0 0 500 500" style={{overflow: "visible"}}>
          <defs>
            {facets.map((_, i) => <linearGradient key={i} id={`gold-facet-${i}`} x1={i % 2 ? "0" : "1"} y1="0" x2={i % 2 ? "1" : "0"} y2="1"><stop offset="0" stopColor={i % 3 === 0 ? "#5D3D1D" : "#1B1A1A"} /><stop offset="0.38" stopColor="#08090D" /><stop offset="0.52" stopColor={i % 2 === 0 ? "#E2A34E" : "#74502A"} /><stop offset="0.61" stopColor="#0A0B0F" /><stop offset="1" stopColor="#020306" /></linearGradient>)}
            <radialGradient id="gold-core" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#FFD9A0" stopOpacity="0.96" /><stop offset="0.28" stopColor="#FFB74D" stopOpacity="0.58" /><stop offset="0.68" stopColor="#F2672E" stopOpacity="0.1" /><stop offset="1" stopColor="#020306" stopOpacity="0" /></radialGradient>
          </defs>
          <circle cx="250" cy="250" r={72 + ignition * 42} fill="url(#gold-core)" opacity={ignition * 0.9} />
          {facets.map((facet, i) => {
            const assemble = phase(frame, 58 + facet.delay, 82 + facet.delay, easeInOut);
            const travel = interpolate(assemble, [0, 1], [facet.travel, 0], clamp);
            const rotation = interpolate(assemble, [0, 0.82, 1], [facet.rotation, facet.rotation * -0.04, 0], clamp);
            const facetScale = interpolate(assemble, [0, 0.84, 1], [0.9, 1.035, 1], clamp);
            const edge = phase(frame, 58 + facet.delay, 66 + facet.delay) * (1 - phase(frame, 82 + facet.delay, 94 + facet.delay));
            return <polygon key={i} points={`${LOCAL_CENTER},${LOCAL_CENTER} ${facet.point[0]},${facet.point[1]} ${facet.next[0]},${facet.next[1]}`} fill={`url(#gold-facet-${i})`} stroke={edge > 0.1 ? COLORS.warmGold : "#5B4934"} strokeWidth={edge > 0.1 ? 1.4 : 0.7} style={{transformOrigin: `${facet.centroidX}px ${facet.centroidY}px`, transform: `translate(${Math.cos(facet.angle) * travel}px, ${Math.sin(facet.angle) * travel}px) rotate(${rotation}deg) scale(${facetScale})`, filter: edge > 0.1 ? "drop-shadow(0 0 6px rgba(255,183,77,.48))" : "drop-shadow(0 12px 20px rgba(0,0,0,.5))"}} />;
          })}
          <polygon points={outerPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#87663D" strokeWidth="1" opacity={0.64} />
        </svg>
        <ArtifactGlyphs frame={frame} />
      </div>
    </>
  );
};

const ArtifactGlyphs: React.FC<{frame: number}> = ({frame}) => {
  const artifacts = [
    {from: 76, to: 88, label: "文章", icon: "▤"},
    {from: 86, to: 98, label: "方案", icon: "◇"},
    {from: 96, to: 112, label: "视频脚本", icon: "▶"},
  ] as const;
  return (
    <div style={{position: "absolute", left: "50%", top: "50%", width: 230, height: 150, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center"}}>
      {artifacts.map((artifact) => {
        const opacity = phase(frame, artifact.from, artifact.from + 5) * (1 - phase(frame, artifact.to - 4, artifact.to + 4));
        return <div key={artifact.label} style={{position: "absolute", textAlign: "center", opacity, transform: `scale(${interpolate(opacity, [0, 1], [0.88, 1], clamp)})`, textShadow: "0 0 10px rgba(255,183,77,.4)"}}>
          <div style={{fontSize: 36, color: COLORS.warmCore}}>{artifact.icon}</div>
          <div style={{marginTop: 9, fontSize: 18, fontWeight: 700}}>{artifact.label}</div>
        </div>;
      })}
      <div style={{position: "absolute", left: 16, right: 16, top: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,183,77,.72), transparent)", opacity: phase(frame, 105, 116)}} />
    </div>
  );
};

const Copy: React.FC<{frame: number}> = ({frame}) => {
  const firstIn = phase(frame, 12, 28);
  const firstDim = interpolate(frame, [68, 84], [1, 0.56], clamp);
  const secondIn = phase(frame, 64, 80, easeOut);
  const gold = phase(frame, 62, 78, easeInOut);
  return (
    <div style={{position: "absolute", left: 112, top: 324, width: 760}}>
      <div style={{width: interpolate(firstIn, [0, 1], [0, 168], clamp), height: 1, background: `linear-gradient(90deg, ${interpolateColors(gold, [0, 1], [COLORS.cyan, COLORS.warmGold])}, transparent)`}} />
      <div style={{marginTop: 34, fontSize: 54, lineHeight: 1.18, fontWeight: 780, opacity: firstIn * firstDim, clipPath: `inset(0 ${100 - firstIn * 100}% 0 0)`}}>知识管理的终点，<br />不是收藏。</div>
      <div style={{marginTop: 54, fontSize: 82, lineHeight: 1, fontWeight: 850, color: interpolateColors(gold, [0, 1], [COLORS.textPrimary, COLORS.warmCore]), opacity: secondIn, transform: `translateY(${interpolate(secondIn, [0, 1], [18, 0], clamp)}px)`, textShadow: `0 0 ${interpolate(secondIn, [0, 1], [0, 14], clamp)}px rgba(255,183,77,.18)`}}>是创造。</div>
    </div>
  );
};
