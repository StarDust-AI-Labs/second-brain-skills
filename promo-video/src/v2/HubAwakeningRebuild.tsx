import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 150;
const SIZE = 520;
const LOCAL_CENTER = 260;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

type Route = {
  label: string;
  index: string;
  x: number;
  y: number;
  depth: number;
  anchor: readonly [number, number];
  controlA: readonly [number, number];
  controlB: readonly [number, number];
  align: "left" | "right" | "center";
};

const routes: Route[] = [
  {label: "灵感", index: "01", x: 806, y: 242, depth: 0.72, anchor: [-118, -154], controlA: [-162, -216], controlB: [-22, 18], align: "right"},
  {label: "网页", index: "02", x: 1134, y: 174, depth: 0.9, anchor: [6, -196], controlA: [12, -258], controlB: [-8, 48], align: "center"},
  {label: "提炼", index: "03", x: 1482, y: 282, depth: 1, anchor: [146, -132], controlA: [222, -178], controlB: [-82, 2], align: "left"},
  {label: "创作", index: "04", x: 1638, y: 494, depth: 0.82, anchor: [198, -8], controlA: [270, -26], controlB: [-96, -26], align: "left"},
  {label: "收件箱", index: "05", x: 1498, y: 736, depth: 0.92, anchor: [148, 140], controlA: [216, 196], controlB: [-70, -22], align: "left"},
  {label: "回顾", index: "06", x: 1166, y: 824, depth: 0.68, anchor: [18, 198], controlA: [34, 264], controlB: [-8, -58], align: "center"},
  {label: "搜索", index: "07", x: 844, y: 746, depth: 0.88, anchor: [-142, 142], controlA: [-210, 194], controlB: [56, -22], align: "right"},
  {label: "诊断", index: "08", x: 690, y: 492, depth: 0.74, anchor: [-198, 2], controlA: [-274, -12], controlB: [92, -42], align: "right"},
];

const outerPoints = [
  [260, 18], [372, 48], [468, 132], [500, 246], [460, 372], [354, 468],
  [226, 496], [104, 452], [24, 350], [18, 218], [76, 102], [176, 42],
] as const;

const facetColors = [
  ["#101927", "#02050A"], ["#152232", "#05080D"], ["#0C1622", "#020409"],
  ["#182735", "#060A10"], ["#0B141F", "#020409"], ["#111E2A", "#04070C"],
  ["#0A121C", "#010307"], ["#142432", "#04080D"], ["#0C1722", "#020409"],
  ["#172734", "#05090F"], ["#0B151F", "#010307"], ["#12212D", "#03070B"],
] as const;

const facets = outerPoints.map((point, i) => {
  const next = outerPoints[(i + 1) % outerPoints.length];
  const centroidX = (LOCAL_CENTER + point[0] + next[0]) / 3;
  const centroidY = (LOCAL_CENTER + point[1] + next[1]) / 3;
  const angle = Math.atan2(centroidY - LOCAL_CENTER, centroidX - LOCAL_CENTER);
  const rand = mulberry32(9103 + i * 701);
  return {
    point,
    next,
    centroidX,
    centroidY,
    angle,
    travel: 42 + rand() * 118,
    rotation: (rand() > 0.5 ? 1 : -1) * (8 + rand() * 13),
    start: 10 + i * 1.75,
    end: 31 + i * 1.15,
  };
});

const particles = Array.from({length: 34}, (_, i) => {
  const rand = mulberry32(227 + i * 947);
  return {x: 90 + rand() * 1740, y: 70 + rand() * 910, size: 0.8 + rand() * 1.4, opacity: 0.08 + rand() * 0.24, phase: rand() * Math.PI * 2};
});

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const crystalPosition = (frame: number) => ({
  x: interpolate(frame, [0, 44, 112, DURATION - 1], [1040, 1040, 1128, 1096], {...clamp, easing: easeInOut}),
  y: interpolate(frame, [0, 44, 112, DURATION - 1], [504, 504, 494, 494], {...clamp, easing: easeInOut}),
});

const crystalScale = (frame: number) =>
  interpolate(frame, [0, 14, 44, 112, DURATION - 1], [0.78, 0.8, 0.84, 0.87, 0.905], {...clamp, easing: easeInOut});

const pathForRoute = (route: Route, center: {x: number; y: number}, scale: number) => {
  const startX = center.x + route.anchor[0] * scale;
  const startY = center.y + route.anchor[1] * scale;
  return `M ${startX} ${startY} C ${startX + route.controlA[0] * scale} ${startY + route.controlA[1] * scale}, ${route.x + route.controlB[0]} ${route.y + route.controlB[1]}, ${route.x} ${route.y}`;
};

export const HubAwakeningRebuild: React.FC = () => {
  const frame = useCurrentFrame();
  const center = crystalPosition(frame);
  const scale = crystalScale(frame);
  const titleIn = phase(frame, 92, 106);
  const titleDim = interpolate(frame, [142, 149], [1, 0.86], clamp);
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 62% 46%, #101827 0%, ${COLORS.bgBase} 31%, ${COLORS.bgDeep} 68%, #02040A 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <RoutePaths frame={frame} center={center} scale={scale} layer="back" />
      <Crystal frame={frame} center={center} scale={scale} />
      <RoutePaths frame={frame} center={center} scale={scale} layer="front" />
      <RouteLabels frame={frame} />
      <BrandCopy frame={frame} titleIn={titleIn} titleDim={titleDim} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 57% 47%, transparent 42%, rgba(1,3,9,0.28) 76%, rgba(0,0,0,0.65) 100%)"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill>
    {particles.map((particle, i) => {
      const x = particle.x + Math.cos(frame / 39 + particle.phase) * 6;
      const y = particle.y + Math.sin(frame / 47 + particle.phase) * 4;
      const pulse = 0.7 + Math.sin(frame / 13 + particle.phase) * 0.3;
      return <div key={i} style={{position: "absolute", left: x, top: y, width: particle.size, height: particle.size, background: i % 8 === 0 ? COLORS.textSecondary : COLORS.cyan, opacity: particle.opacity * pulse, boxShadow: i % 8 === 0 ? "none" : `0 0 5px ${COLORS.cyan}`}} />;
    })}
    <div style={{position: "absolute", left: 676, top: 88, width: 1060, height: 850, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,229,255,.028), transparent 68%)", filter: "blur(30px)"}} />
  </AbsoluteFill>
);

const RoutePaths: React.FC<{frame: number; center: {x: number; y: number}; scale: number; layer: "back" | "front"}> = ({frame, center, scale, layer}) => (
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0, overflow: "visible"}}>
    {routes.map((route, i) => {
      const isBack = route.depth < 0.8;
      if ((layer === "back") !== isBack) return null;
      const start = 44 + i * 6;
      const draw = phase(frame, start, start + 6, easeInOut);
      const focus = phase(frame, start + 4, start + 8);
      const baseOpacity = isBack ? 0.2 : 0.58 + route.depth * 0.18;
      const opacity = frame > start + 8 ? baseOpacity : interpolate(focus, [0, 1], [0.95, baseOpacity], clamp);
      const dataStart = 122 + i * 1.8;
      const dataProgress = phase(frame, dataStart, 148, Easing.linear);
      const d = pathForRoute(route, center, scale);
      return (
        <g key={`${layer}-${route.index}`}>
          <path d={d} fill="none" stroke="#26364A" strokeWidth="1" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw * 0.58} />
          <path d={d} fill="none" stroke={COLORS.cyan} strokeWidth={isBack ? 1 : 1.5} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw * opacity} style={{filter: `drop-shadow(0 0 ${isBack ? 3 : 6}px rgba(0,229,255,.42))`}} />
          {frame >= dataStart ? <path d={d} fill="none" stroke="#D8FCFF" strokeWidth="2.2" pathLength="1" strokeDasharray="0.008 0.992" strokeDashoffset={dataProgress} opacity={0.9} style={{filter: `drop-shadow(0 0 5px ${COLORS.cyan})`}} /> : null}
        </g>
      );
    })}
  </svg>
);

const RouteLabels: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill>
    {routes.map((route, i) => {
      const start = 44 + i * 6;
      const nodeIn = phase(frame, start + 5, start + 7);
      const labelIn = phase(frame, start + 7, start + 9);
      const direction = route.align === "right" ? -1 : 1;
      const offset = route.align === "right" ? -22 : route.align === "left" ? 22 : 0;
      const translate = route.align === "right" ? "translate(-100%, -50%)" : route.align === "center" ? "translate(-50%, -50%)" : "translate(0, -50%)";
      return (
        <React.Fragment key={route.index}>
          <div style={{position: "absolute", left: route.x, top: route.y, width: 5, height: 5, transform: `translate(-50%, -50%) scale(${nodeIn})`, background: COLORS.cyan, opacity: nodeIn, boxShadow: "0 0 8px rgba(0,229,255,.7)"}} />
          <div style={{position: "absolute", left: route.x + direction * 8, top: route.y, width: 20, height: 1, transform: `translateY(-50%) scaleX(${nodeIn * direction})`, transformOrigin: route.align === "right" ? "right center" : "left center", background: COLORS.cyan, opacity: nodeIn * 0.64}} />
          <div style={{position: "absolute", left: route.x + offset, top: route.y, transform: `${translate} translateY(${interpolate(labelIn, [0, 1], [8, 0])}px)`, clipPath: `inset(0 ${100 - labelIn * 100}% 0 0)`, opacity: labelIn, textAlign: route.align, whiteSpace: "nowrap"}}>
            <div style={{fontSize: 22, fontWeight: 650, lineHeight: 1}}>{route.label}</div>
            <div style={{marginTop: 7, fontFamily: FONTS.mono, fontSize: 11, letterSpacing: "0.2em", color: COLORS.cyan, opacity: 0.78}}>{route.index}</div>
          </div>
        </React.Fragment>
      );
    })}
  </AbsoluteFill>
);

const Crystal: React.FC<{frame: number; center: {x: number; y: number}; scale: number}> = ({frame, center, scale}) => {
  const ignition = phase(frame, 32, 54);
  const crackIn = phase(frame, 2, 7, easeInOut);
  const crackSettle = interpolate(frame, [7, 18, 118, 149], [1, 0.48, 0.4, 1], clamp);
  const breath = frame < 92 ? 1 : 1 + Math.sin((frame - 92) / 11) * 0.006;
  const yaw = interpolate(frame, [0, 44, 112, 149], [0, -7, -24, -24], {...clamp, easing: easeInOut});
  const pitch = interpolate(frame, [44, 112], [0, 7], {...clamp, easing: easeInOut});
  const labelIn = phase(frame, 32, 47);
  const labelBreath = interpolate(frame, [92, 101, 110], [1, 1.025, 1], clamp);
  return (
    <div style={{position: "absolute", left: center.x, top: center.y, width: SIZE, height: SIZE, transform: `translate(-50%, -50%) perspective(1300px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${scale * breath})`, transformStyle: "preserve-3d"}}>
      <svg width={SIZE} height={SIZE} viewBox="0 0 520 520" style={{overflow: "visible"}}>
        <defs>
          {facetColors.map((colors, i) => <linearGradient key={i} id={`rebuild-facet-${i}`} x1={i % 2 ? "0" : "1"} y1="0" x2={i % 2 ? "1" : "0"} y2="1"><stop offset="0" stopColor={colors[0]} /><stop offset="0.38" stopColor={colors[1]} /><stop offset="0.52" stopColor={i % 3 === 0 ? "#183845" : colors[0]} /><stop offset="0.62" stopColor={colors[1]} /><stop offset="1" stopColor="#010205" /></linearGradient>)}
          <linearGradient id="rebuild-crack" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#9EFAFF" /><stop offset="0.48" stopColor={COLORS.cyan} /><stop offset="1" stopColor="#236877" /></linearGradient>
        </defs>
        {facets.map((facet, i) => {
          const assemble = phase(frame, facet.start, facet.end);
          const burst = phase(frame, 7 + (i % 3), 11 + (i % 3));
          const travel = interpolate(assemble, [0, 1], [facet.travel * burst, 0], clamp);
          const rotation = interpolate(assemble, [0, 0.84, 1], [facet.rotation * burst, facet.rotation * -0.04, 0], clamp);
          const facetScale = interpolate(assemble, [0, 0.84, 1], [0.94, 1.04, 1], clamp);
          const edge = phase(frame, facet.start, facet.start + 5) * (1 - phase(frame, facet.end, facet.end + 8));
          return <polygon key={i} points={`${LOCAL_CENTER},${LOCAL_CENTER} ${facet.point[0]},${facet.point[1]} ${facet.next[0]},${facet.next[1]}`} fill={`url(#rebuild-facet-${i})`} stroke={edge > 0.08 ? COLORS.cyan : "#26364A"} strokeWidth={edge > 0.08 ? 1.25 : 0.75} style={{transformOrigin: `${facet.centroidX}px ${facet.centroidY}px`, transform: `translate(${Math.cos(facet.angle) * travel}px, ${Math.sin(facet.angle) * travel}px) rotate(${rotation}deg) scale(${facetScale})`, filter: edge > 0.08 ? `drop-shadow(0 0 6px rgba(0,229,255,${edge * 0.46}))` : "drop-shadow(0 12px 18px rgba(0,0,0,.5))"}} />;
        })}
        <polyline points="270,40 248,138 276,218 252,276 272,338 244,474" fill="none" stroke="#011218" strokeWidth="8" opacity={crackIn * 0.8} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - crackIn} />
        <polyline points="270,40 248,138 276,218 252,276 272,338 244,474" fill="none" stroke="url(#rebuild-crack)" strokeWidth={1.6 + phase(frame, 142, 149) * 2.1} opacity={crackIn * crackSettle} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - crackIn} style={{filter: `drop-shadow(0 0 ${4 + phase(frame, 142, 149) * 8}px ${COLORS.cyan})`}} />
        <polygon points={outerPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#26364A" strokeWidth="1" opacity={0.45 + ignition * 0.2} />
      </svg>
      <div style={{position: "absolute", left: "50%", top: "50%", width: 276, height: 42, display: "flex", alignItems: "center", justifyContent: "center", transform: `translate(-50%, -50%) scale(${labelBreath})`, clipPath: `inset(0 ${100 - labelIn * 100}% 0 0)`, opacity: labelIn, background: "linear-gradient(90deg, transparent, rgba(2,8,13,.86) 14%, rgba(2,8,13,.86) 86%, transparent)", fontFamily: FONTS.mono, fontSize: 21, fontWeight: 650, letterSpacing: "0.04em", textShadow: "0 0 10px rgba(0,229,255,.3)", whiteSpace: "nowrap"}}>second-brain-hub</div>
    </div>
  );
};

const BrandCopy: React.FC<{frame: number; titleIn: number; titleDim: number}> = ({frame, titleIn, titleDim}) => {
  const statusIn = phase(frame, 104, 116);
  const ruleWidth = interpolate(titleIn, [0, 1], [0, 160], clamp);
  const onlinePulse = 0.65 + Math.sin(Math.max(0, frame - 104) / 8) * 0.12;
  return (
    <div style={{position: "absolute", left: 112, top: 642, width: 760, height: 306, opacity: titleDim}}>
      <div style={{width: ruleWidth, height: 1, background: `linear-gradient(90deg, ${COLORS.cyan}, rgba(0,229,255,.08))`, boxShadow: "0 0 6px rgba(0,229,255,.38)"}} />
      <div style={{position: "absolute", left: 0, top: 38, width: 760, height: 180, fontSize: 72, lineHeight: 1.12, fontWeight: 800, letterSpacing: 0, clipPath: `inset(0 ${100 - titleIn * 100}% 0 0)`, opacity: titleIn}}>
        <span style={{display: "block", whiteSpace: "nowrap"}}>一个入口，</span>
        <span style={{display: "block", whiteSpace: "nowrap"}}>理解你的意图。</span>
      </div>
      <div style={{position: "absolute", left: 4, top: 278, display: "flex", alignItems: "center", gap: 14, opacity: statusIn, transform: `translateY(${interpolate(statusIn, [0, 1], [8, 0])}px)`, fontFamily: FONTS.mono, fontSize: 17, letterSpacing: 0, color: COLORS.cyan}}>
        <span style={{width: 5, height: 5, background: COLORS.cyan, opacity: onlinePulse, boxShadow: `0 0 8px ${COLORS.cyan}`}} />
        SECOND-BRAIN HUB / ONLINE
      </div>
    </div>
  );
};
