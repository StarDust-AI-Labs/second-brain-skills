import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 120;
const CENTER = {x: 1040, y: 504};
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const sourceContent = [
  {type: "VOICE", title: "这个选题可以做成视频", detail: "00:18 · 灵感速记"},
  {type: "URL", title: "Agent-native workflow", detail: "https://example.com/article"},
  {type: "PDF", title: "知识管理研究.pdf", detail: "42 pages · 8.6 MB"},
  {type: "CHAT", title: "周末把大纲补完", detail: "来自聊天记录"},
  {type: "VIDEO", title: "访谈片段 03:27", detail: "如何让知识产生输出"},
  {type: "NOTE", title: "收藏不是知识", detail: "零碎观点 / 未分类"},
] as const;

const corePoints = [
  [260, 18], [372, 48], [468, 132], [500, 246], [460, 372], [354, 468],
  [226, 496], [104, 452], [24, 350], [18, 218], [76, 102], [176, 42],
] as const;

const fragments = Array.from({length: 18}, (_, i) => {
  const rand = mulberry32(5101 + i * 929);
  const side = i % 4;
  const hookStarts = [{x: -30, y: 340}, {x: 1950, y: 690}, {x: 620, y: -24}, {x: 1450, y: 1104}] as const;
  const startX = i < hookStarts.length ? hookStarts[i].x : side === 0 ? -150 : side === 1 ? 1980 : 120 + rand() * 1680;
  const startY = i < hookStarts.length ? hookStarts[i].y : side === 2 ? -60 : side === 3 ? 1140 : 120 + rand() * 820;
  const radius = 150 + rand() * 360;
  const angle = rand() * Math.PI * 2;
  return {
    ...sourceContent[i % sourceContent.length],
    startX, startY,
    orbitRadius: radius,
    orbitAngle: angle,
    speed: 0.018 + rand() * 0.018,
    width: 190 + rand() * 110,
    start: i * 2.2,
    z: 0.62 + rand() * 0.6,
  };
});

export const InformationFlood: React.FC = () => {
  const frame = useCurrentFrame();
  const cameraScale = interpolate(frame, [0, 50, 84, 104], [0.94, 1.01, 1.075, 1.095], {...clamp, easing: easeInOut});
  const collapse = phase(frame, 78, 103, easeInOut);
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 55% 48%, #101726 0%, ${COLORS.bgBase} 36%, ${COLORS.bgDeep} 74%, #010206 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <AbsoluteFill style={{transform: `scale(${cameraScale})`, transformOrigin: `${CENTER.x}px ${CENTER.y}px`}}>
        <Storm frame={frame} collapse={collapse} />
        <DarkCore frame={frame} collapse={collapse} />
      </AbsoluteFill>
      <Copy frame={frame} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 55% 48%, transparent 46%, rgba(1,3,9,.3) 76%, rgba(0,0,0,.72) 100%)"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill>
    <div style={{position: "absolute", left: 220, right: 220, top: CENTER.y, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,.12), transparent)"}} />
    {Array.from({length: 24}, (_, i) => {
      const rand = mulberry32(821 + i * 337);
      const x = 60 + rand() * 1800;
      const y = 60 + rand() * 960;
      return <div key={i} style={{position: "absolute", left: x + Math.cos(frame / 37 + i) * 5, top: y + Math.sin(frame / 41 + i) * 4, width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1, background: COLORS.cyan, opacity: 0.04 + (i % 5) * 0.025, boxShadow: i % 7 === 0 ? `0 0 5px ${COLORS.cyan}` : "none"}} />;
    })}
  </AbsoluteFill>
);

const Storm: React.FC<{frame: number; collapse: number}> = ({frame, collapse}) => (
  <AbsoluteFill>
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
      {fragments.map((fragment, i) => {
        const enter = phase(frame, fragment.start, fragment.start + 10, i < 4 ? easeOut : easeInOut);
        const angle = fragment.orbitAngle + Math.max(0, frame - fragment.start) * fragment.speed;
        const orbitX = CENTER.x + Math.cos(angle) * fragment.orbitRadius;
        const orbitY = CENTER.y + Math.sin(angle) * fragment.orbitRadius * 0.62;
        const x = interpolate(enter, [0, 1], [fragment.startX, orbitX], clamp);
        const y = interpolate(enter, [0, 1], [fragment.startY, orbitY], clamp);
        const finalX = interpolate(collapse, [0, 1], [x, CENTER.x], clamp);
        const finalY = interpolate(collapse, [0, 1], [y, CENTER.y], clamp);
        return <line key={i} x1={finalX} y1={finalY} x2={CENTER.x} y2={CENTER.y} stroke={COLORS.cyan} strokeWidth="0.7" opacity={enter * (1 - collapse) * (0.04 + (i % 4) * 0.025)} />;
      })}
    </svg>
    {fragments.map((fragment, i) => {
      const enter = phase(frame, fragment.start, fragment.start + 10, i < 4 ? easeOut : easeInOut);
      const angle = fragment.orbitAngle + Math.max(0, frame - fragment.start) * fragment.speed;
      const orbitX = CENTER.x + Math.cos(angle) * fragment.orbitRadius;
      const orbitY = CENTER.y + Math.sin(angle) * fragment.orbitRadius * 0.62;
      const x = interpolate(enter, [0, 1], [fragment.startX, orbitX], clamp);
      const y = interpolate(enter, [0, 1], [fragment.startY, orbitY], clamp);
      const finalX = interpolate(collapse, [0, 1], [x, CENTER.x], clamp);
      const finalY = interpolate(collapse, [0, 1], [y, CENTER.y], clamp);
      const scale = fragment.z * interpolate(collapse, [0, 1], [1, 0.08], clamp);
      const tangent = angle * 180 / Math.PI + 90;
      return <Fragment key={i} fragment={fragment} x={finalX} y={finalY} scale={scale} rotation={tangent} opacity={enter * (1 - collapse * 0.24)} />;
    })}
  </AbsoluteFill>
);

const Fragment: React.FC<{fragment: typeof fragments[number]; x: number; y: number; scale: number; rotation: number; opacity: number}> = ({fragment, x, y, scale, rotation, opacity}) => (
  <div style={{position: "absolute", left: x, top: y, width: fragment.width, height: fragment.type === "VIDEO" ? 94 : 72, transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`, borderLeft: `2px solid ${COLORS.cyan}`, borderTop: "1px solid rgba(73,92,119,.62)", background: "linear-gradient(120deg, rgba(15,25,40,.96), rgba(4,8,14,.7))", opacity, padding: "11px 14px", boxShadow: "0 14px 34px rgba(0,0,0,.34)"}}>
    <div style={{fontFamily: FONTS.mono, fontSize: 10, color: COLORS.cyan, letterSpacing: 0}}>{fragment.type}</div>
    <div style={{marginTop: 8, fontSize: 15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden"}}>{fragment.title}</div>
    <div style={{marginTop: 6, fontSize: 10, color: COLORS.textDim, whiteSpace: "nowrap", overflow: "hidden"}}>{fragment.detail}</div>
    {fragment.type === "VOICE" ? <div style={{position: "absolute", right: 12, top: 13, display: "flex", alignItems: "center", gap: 2}}>{[7, 13, 5, 17, 10, 15, 6].map((h, i) => <span key={i} style={{width: 2, height: h, background: COLORS.cyan, opacity: 0.68}} />)}</div> : null}
    {fragment.type === "VIDEO" ? <div style={{position: "absolute", left: 14, right: 14, bottom: 10, height: 4, background: "#26364A"}}><span style={{display: "block", width: "42%", height: "100%", background: COLORS.cyan}} /></div> : null}
  </div>
);

const DarkCore: React.FC<{frame: number; collapse: number}> = ({frame, collapse}) => {
  const coreIn = phase(frame, 82, 103, easeInOut);
  const pulse = frame > 104 ? 1 + Math.sin((frame - 104) / 5) * 0.004 : 1;
  return <div style={{position: "absolute", left: CENTER.x, top: CENTER.y, width: 520, height: 520, transform: `translate(-50%, -50%) scale(${0.62 * coreIn * pulse})`, opacity: coreIn}}>
    <svg width="520" height="520" viewBox="0 0 520 520" style={{overflow: "visible"}}>
      <defs>
        {corePoints.map((_, i) => <linearGradient key={i} id={`flood-core-facet-${i}`} x1={i % 2 ? "0" : "1"} y1="0" x2={i % 2 ? "1" : "0"} y2="1"><stop offset="0" stopColor={i % 3 === 0 ? "#202735" : "#151B26"} /><stop offset="0.45" stopColor="#060910" /><stop offset="0.56" stopColor="#252D3B" /><stop offset="0.66" stopColor="#070A11" /><stop offset="1" stopColor="#020409" /></linearGradient>)}
      </defs>
      {corePoints.map((point, i) => {
        const next = corePoints[(i + 1) % corePoints.length];
        return <polygon key={i} points={`260,260 ${point[0]},${point[1]} ${next[0]},${next[1]}`} fill={`url(#flood-core-facet-${i})`} stroke="#303A4C" strokeWidth="0.8" />;
      })}
      <polygon points={corePoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#303A4C" strokeWidth="1" opacity="0.72" />
    </svg>
  </div>;
};

const Copy: React.FC<{frame: number}> = ({frame}) => {
  const enter = phase(frame, 30, 48);
  const dim = interpolate(frame, [80, 112], [1, 0], clamp);
  return <div style={{position: "absolute", left: 112, top: 674, width: 720, opacity: enter * dim}}>
    <div style={{width: interpolate(enter, [0, 1], [0, 144], clamp), height: 1, background: `linear-gradient(90deg, ${COLORS.cyan}, transparent)`}} />
    <div style={{marginTop: 34, fontSize: 68, lineHeight: 1.1, fontWeight: 800, clipPath: `inset(0 ${100 - enter * 100}% 0 0)`}}>你保存了很多。</div>
  </div>;
};
