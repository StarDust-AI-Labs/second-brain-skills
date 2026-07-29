import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 150;
const CENTER = {x: 960, y: 478};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const routes = [
  {cn: "灵感速记", en: "CAPTURE IDEA", x: 960, y: 122, align: "center" as const},
  {cn: "保存外源", en: "SAVE SOURCE", x: 1322, y: 186, align: "left" as const},
  {cn: "提炼加工", en: "DISTILL", x: 1514, y: 414, align: "left" as const},
  {cn: "创作启动", en: "CREATE", x: 1360, y: 698, align: "left" as const},
  {cn: "收件箱", en: "INBOX", x: 960, y: 812, align: "center" as const},
  {cn: "回顾整理", en: "REVIEW", x: 554, y: 698, align: "right" as const},
  {cn: "探索查询", en: "QUERY", x: 382, y: 414, align: "right" as const},
  {cn: "系统诊断", en: "DIAGNOSE", x: 598, y: 186, align: "right" as const},
];

const outerPoints = [
  [260, 35],
  [376, 62],
  [464, 150],
  [492, 267],
  [445, 386],
  [342, 468],
  [218, 486],
  [103, 432],
  [31, 330],
  [30, 208],
  [90, 99],
  [177, 49],
] as const;

const facetColors = [
  ["#132A38", "#071017"],
  ["#0E2733", "#050A11"],
  ["#183847", "#071018"],
  ["#0A1B29", "#02060B"],
  ["#12313C", "#061018"],
  ["#091B28", "#03070C"],
  ["#173745", "#071019"],
  ["#0C2633", "#04090F"],
  ["#132C3A", "#050B11"],
  ["#071823", "#020509"],
  ["#173540", "#061017"],
  ["#0A202C", "#03070C"],
] as const;

const particles = Array.from({length: 82}, (_, i) => {
  const rand = mulberry32(i * 881 + 29);
  const angle = rand() * Math.PI * 2;
  const radius = 250 + rand() * 650;
  return {
    x: CENTER.x + Math.cos(angle) * radius,
    y: CENTER.y + Math.sin(angle) * radius * 0.62,
    size: 1 + rand() * 2.4,
    opacity: 0.12 + rand() * 0.55,
    phase: rand() * Math.PI * 2,
    drift: 5 + rand() * 14,
  };
});

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const polygonCentroid = (a: readonly number[], b: readonly number[]) => ({
  x: (260 + a[0] + b[0]) / 3,
  y: (260 + a[1] + b[1]) / 3,
});

export const HubAwakeningV2: React.FC = () => {
  const frame = useCurrentFrame();

  const anticipation = phase(frame, 0, 13, easeInOut);
  const assembly = phase(frame, 10, 48);
  const coreIgnition = phase(frame, 34, 62);
  const routeWave = phase(frame, 56, 112);
  const titleIn = phase(frame, 82, 116);
  const settle = phase(frame, 112, 149, easeInOut);

  const cameraScale = interpolate(
    frame,
    [0, 13, 55, 112, DURATION],
    [0.96, 0.925, 1.035, 1.0, 1.012],
    {...clamp, easing: easeInOut},
  );
  const cameraY = interpolate(frame, [0, 55, DURATION], [18, -5, -10], {
    ...clamp,
    easing: easeInOut,
  });

  const blackout = phase(frame, 0, 8);
  const corePulse = 1 + Math.sin((frame - 58) / 7) * 0.018 * coreIgnition;
  const orbitRotation = interpolate(frame, [55, DURATION], [-10, 5], clamp);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: `radial-gradient(circle at 50% 45%, #101B2A 0%, ${COLORS.bgBase} 30%, ${COLORS.bgDeep} 74%, #02040A 100%)`,
        color: COLORS.textPrimary,
        fontFamily: FONTS.zh,
      }}
    >
      <Background frame={frame} opacity={blackout} />

      <AbsoluteFill
        style={{
          transform: `translateY(${cameraY}px) scale(${cameraScale})`,
          transformOrigin: `${CENTER.x}px ${CENTER.y}px`,
        }}
      >
        <RouteNetwork frame={frame} routeWave={routeWave} orbitRotation={orbitRotation} />
        <Crystal
          frame={frame}
          anticipation={anticipation}
          assembly={assembly}
          coreIgnition={coreIgnition}
          corePulse={corePulse}
        />
      </AbsoluteFill>

      <BrandCopy titleIn={titleIn} settle={settle} />
      <SystemChrome frame={frame} coreIgnition={coreIgnition} />

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(1,3,9,0.34) 78%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number; opacity: number}> = ({frame, opacity}) => {
  const scanX = interpolate(frame, [0, DURATION], [-500, 2300], clamp);
  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(0,229,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.055) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 72%)",
        }}
      />
      {particles.map((p, i) => {
        const driftX = Math.cos(frame / 31 + p.phase) * p.drift;
        const driftY = Math.sin(frame / 37 + p.phase) * p.drift * 0.55;
        const twinkle = 0.55 + Math.sin(frame / 9 + p.phase) * 0.45;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x + driftX,
              top: p.y + driftY,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 9 === 0 ? COLORS.textPrimary : COLORS.cyan,
              opacity: p.opacity * twinkle,
              boxShadow: `0 0 ${p.size * 5}px ${COLORS.cyan}`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: scanX,
          top: 0,
          width: 320,
          height: "100%",
          transform: "skewX(-18deg)",
          background:
            "linear-gradient(90deg, transparent, rgba(0,229,255,.035), rgba(255,255,255,.06), rgba(0,229,255,.025), transparent)",
          filter: "blur(6px)",
        }}
      />
    </AbsoluteFill>
  );
};

const RouteNetwork: React.FC<{
  frame: number;
  routeWave: number;
  orbitRotation: number;
}> = ({frame, routeWave, orbitRotation}) => {
  const orbitOpacity = interpolate(routeWave, [0, 0.4, 1], [0, 0.24, 0.11], clamp);
  return (
    <AbsoluteFill>
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{position: "absolute", inset: 0, overflow: "visible"}}
      >
        <g
          style={{
            transformOrigin: `${CENTER.x}px ${CENTER.y}px`,
            transform: `rotate(${orbitRotation}deg)`,
          }}
        >
          <ellipse
            cx={CENTER.x}
            cy={CENTER.y}
            rx="476"
            ry="310"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="1"
            strokeDasharray="3 13"
            opacity={orbitOpacity}
          />
          <ellipse
            cx={CENTER.x}
            cy={CENTER.y}
            rx="375"
            ry="242"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="1"
            strokeDasharray="1 11"
            opacity={orbitOpacity * 0.65}
          />
        </g>

        {routes.map((route, i) => {
          const start = 58 + i * 4.7;
          const p = phase(frame, start, start + 23);
          const dx = route.x - CENTER.x;
          const dy = route.y - CENTER.y;
          const cx = CENTER.x + dx * 0.56 - dy * 0.1;
          const cy = CENTER.y + dy * 0.56 + dx * 0.035;
          const path = `M ${CENTER.x} ${CENTER.y} Q ${cx} ${cy} ${route.x} ${route.y}`;
          return (
            <g key={route.cn}>
              <path
                d={path}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth="1"
                opacity={0.12 * p}
              />
              <path
                d={path}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth="2"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - p}
                opacity={0.72}
                style={{filter: `drop-shadow(0 0 5px ${COLORS.cyan})`}}
              />
              <circle
                cx={route.x}
                cy={route.y}
                r={3 + p * 4}
                fill={COLORS.cyan}
                opacity={p}
                style={{filter: `drop-shadow(0 0 8px ${COLORS.cyan})`}}
              />
              <circle
                cx={route.x}
                cy={route.y}
                r={8 + p * 12}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth="1"
                opacity={p * 0.24}
              />
            </g>
          );
        })}
      </svg>

      {routes.map((route, i) => {
        const p = phase(frame, 68 + i * 4.7, 90 + i * 4.7);
        const offset = route.align === "left" ? 22 : route.align === "right" ? -22 : 0;
        const transform =
          route.align === "center"
            ? "translate(-50%, -50%)"
            : route.align === "left"
              ? "translate(0, -50%)"
              : "translate(-100%, -50%)";
        return (
          <div
            key={route.en}
            style={{
              position: "absolute",
              left: route.x + offset,
              top: route.y,
              transform: `${transform} translateY(${interpolate(p, [0, 1], [11, 0])}px)`,
              opacity: p,
              textAlign: route.align,
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 650,
                letterSpacing: "0.08em",
                color: COLORS.textPrimary,
                textShadow: `0 0 16px ${COLORS.cyan}33`,
              }}
            >
              {route.cn}
            </div>
            <div
              style={{
                marginTop: 5,
                fontFamily: FONTS.mono,
                fontSize: 10,
                letterSpacing: "0.25em",
                color: COLORS.cyan,
                opacity: 0.66,
              }}
            >
              {String(i + 1).padStart(2, "0")} / {route.en}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Crystal: React.FC<{
  frame: number;
  anticipation: number;
  assembly: number;
  coreIgnition: number;
  corePulse: number;
}> = ({frame, anticipation, assembly, coreIgnition, corePulse}) => {
  const shellRotation = interpolate(frame, [0, 48, DURATION], [-8, 0, 5], {
    ...clamp,
    easing: easeInOut,
  });
  const shellScale = interpolate(assembly, [0, 0.76, 1], [0.84, 1.025, 1], clamp);
  const preCompress = interpolate(anticipation, [0, 1], [1, 0.94], clamp);
  const glow = interpolate(coreIgnition, [0, 0.65, 1], [0, 1, 0.66], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: CENTER.x,
        top: CENTER.y,
        width: 520,
        height: 520,
        transform: `translate(-50%, -50%) scale(${preCompress * shellScale}) rotate(${shellRotation}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 54,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(0,229,255,${0.19 * glow}) 0%, rgba(0,229,255,${0.055 * glow}) 30%, transparent 72%)`,
          filter: "blur(16px)",
          transform: `scale(${corePulse * 1.35})`,
        }}
      />

      <svg width="520" height="520" viewBox="0 0 520 520" style={{overflow: "visible"}}>
        <defs>
          {facetColors.map((colors, i) => (
            <linearGradient key={i} id={`facet-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colors[0]} />
              <stop offset="1" stopColor={colors[1]} />
            </linearGradient>
          ))}
          <radialGradient id="core-light">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.18" stopColor="#A8F8FF" />
            <stop offset="0.48" stopColor={COLORS.cyan} />
            <stop offset="1" stopColor="#06323D" stopOpacity="0" />
          </radialGradient>
        </defs>

        {outerPoints.map((point, i) => {
          const next = outerPoints[(i + 1) % outerPoints.length];
          const centroid = polygonCentroid(point, next);
          const angle = Math.atan2(centroid.y - 260, centroid.x - 260);
          const p = phase(frame, 10 + i * 1.45, 35 + i * 1.45);
          const distance = interpolate(p, [0, 1], [82 + (i % 3) * 18, 0]);
          const rotation = interpolate(p, [0, 0.8, 1], [(i % 2 ? -1 : 1) * 12, 1.2, 0], clamp);
          const opacity = interpolate(p, [0, 0.15, 1], [0, 0.6, 1], clamp);
          return (
            <polygon
              key={i}
              points={`260,260 ${point[0]},${point[1]} ${next[0]},${next[1]}`}
              fill={`url(#facet-${i})`}
              stroke={i % 3 === 0 ? COLORS.cyan : "#497184"}
              strokeWidth={i % 3 === 0 ? 1.4 : 0.7}
              opacity={opacity}
              style={{
                transformOrigin: `${centroid.x}px ${centroid.y}px`,
                transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${rotation}deg) scale(${interpolate(p, [0, 1], [0.72, 1])})`,
                filter:
                  i % 3 === 0
                    ? `drop-shadow(0 0 ${8 * coreIgnition}px rgba(0,229,255,.36))`
                    : "drop-shadow(0 10px 22px rgba(0,0,0,.55))",
              }}
            />
          );
        })}

        <polygon
          points={outerPoints.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth="1.2"
          opacity={assembly * 0.54}
          strokeDasharray="3 8"
        />

        {[120, 82, 48].map((r, i) => {
          const p = phase(frame, 38 + i * 5, 61 + i * 5);
          return (
            <circle
              key={r}
              cx="260"
              cy="260"
              r={r}
              fill="none"
              stroke={COLORS.cyan}
              strokeWidth={i === 2 ? 2 : 1}
              strokeDasharray={i === 0 ? "4 14" : i === 1 ? "2 8" : undefined}
              opacity={p * (0.2 + i * 0.12)}
              style={{
                transformOrigin: "260px 260px",
                transform: `scale(${interpolate(p, [0, 0.72, 1], [0.45, 1.12, 1])}) rotate(${(frame - 40) * (i % 2 ? -0.12 : 0.09)}deg)`,
              }}
            />
          );
        })}

        <circle
          cx="260"
          cy="260"
          r="58"
          fill="url(#core-light)"
          opacity={coreIgnition}
          style={{
            transformOrigin: "260px 260px",
            transform: `scale(${corePulse})`,
            filter: `drop-shadow(0 0 ${22 + 24 * glow}px ${COLORS.cyan})`,
          }}
        />
        <circle cx="260" cy="260" r="13" fill="#F8FFFF" opacity={coreIgnition} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, 82px) translateY(${interpolate(coreIgnition, [0, 1], [12, 0])}px)`,
          opacity: coreIgnition,
          fontFamily: FONTS.mono,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.32em",
          color: COLORS.textPrimary,
          textShadow: `0 0 14px ${COLORS.cyan}`,
          whiteSpace: "nowrap",
        }}
      >
        SECOND-BRAIN HUB
      </div>
    </div>
  );
};

const BrandCopy: React.FC<{titleIn: number; settle: number}> = ({titleIn, settle}) => (
  <div
    style={{
      position: "absolute",
      left: 92,
      bottom: 70,
      width: 740,
      opacity: titleIn,
      transform: `translateY(${interpolate(titleIn, [0, 1], [28, 0])}px)`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        marginBottom: 15,
        color: COLORS.cyan,
        fontFamily: FONTS.mono,
        fontSize: 13,
        letterSpacing: "0.28em",
      }}
    >
      <span style={{width: 7, height: 7, borderRadius: "50%", background: COLORS.cyan, boxShadow: `0 0 14px ${COLORS.cyan}`}} />
      SECOND-BRAIN HUB / ONLINE
      <span style={{height: 1, width: 120, background: `linear-gradient(90deg, ${COLORS.cyan}, transparent)`}} />
    </div>
    <div
      style={{
        fontSize: 56,
        lineHeight: 1.12,
        fontWeight: 760,
        letterSpacing: "-0.035em",
        color: COLORS.textPrimary,
        textShadow: `0 0 ${10 + settle * 8}px rgba(0,229,255,.12)`,
      }}
    >
      一个入口，理解你的意图。
    </div>
  </div>
);

const SystemChrome: React.FC<{frame: number; coreIgnition: number}> = ({frame, coreIgnition}) => {
  const topIn = phase(frame, 10, 32);
  const cursor = frame % 28 < 18 ? 1 : 0.2;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 54,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: topIn,
          fontFamily: FONTS.mono,
          fontSize: 11,
          letterSpacing: "0.24em",
          color: COLORS.textSecondary,
        }}
      >
        <span style={{color: COLORS.cyan}}>//</span>
        PKM CORE / INTENT ROUTER
        <span style={{opacity: cursor, color: COLORS.cyan}}>▌</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 44,
          right: 54,
          opacity: coreIgnition,
          fontFamily: FONTS.mono,
          fontSize: 11,
          letterSpacing: "0.22em",
          color: COLORS.cyan,
        }}
      >
        ROUTES 08/08&nbsp;&nbsp;·&nbsp;&nbsp;STATUS NOMINAL
      </div>
      <div style={{position: "absolute", left: 44, top: 42, width: 28, height: 28, borderLeft: `1px solid ${COLORS.cyan}`, borderTop: `1px solid ${COLORS.cyan}`, opacity: 0.5}} />
      <div style={{position: "absolute", right: 44, top: 42, width: 28, height: 28, borderRight: `1px solid ${COLORS.cyan}`, borderTop: `1px solid ${COLORS.cyan}`, opacity: 0.5}} />
      <div style={{position: "absolute", right: 44, bottom: 42, width: 28, height: 28, borderRight: `1px solid ${COLORS.cyan}`, borderBottom: `1px solid ${COLORS.cyan}`, opacity: 0.28}} />
    </>
  );
};

