import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../theme";
import { makeShardSeed, ShardCard } from "../components/Shard";

/**
 * 镜头2：越管越乱（3-7s / 120f）
 * 承接镜头1的碎片堆：碎片向中心塌缩、互相缠绕挤成一团乱麻，
 * 颜色从冷灰逐渐失活变灰暗（卡死/系统崩溃感）。
 * 字卡「越管越乱」浮现。
 */

const COUNT = 78;

export const Shot2Tangle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 开场继承镜头1的堆积态 → 0-40f 碎片向中心塌缩缠绕
  // 40-90f 整体失活变灰 + 轻微震颤（卡死）
  // 95-120f 字卡浮现

  const collapse = interpolate(frame, [0, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const die = interpolate(frame, [34, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 卡死前的细微痉挛震颤（40f 后）
  const jitterAmt = interpolate(frame, [40, 70], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 中心乱麻核：一个越缠越紧的暗团
  const coreScale = interpolate(collapse, [0, 1], [0.3, 1]);
  const coreOpacity = interpolate(frame, [10, 40], [0, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 字卡
  const textEnter = spring({
    frame: frame - 92,
    fps,
    config: { damping: 15, stiffness: 110, mass: 1.2 },
  });
  const textY = interpolate(textEnter, [0, 1], [60, 0]);
  const textOpacity = interpolate(frame - 92, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 48%, ${COLORS.bgBase} 0%, ${COLORS.bgDeep} 78%)`,
      }}
    >
      {/* 中心乱麻暗核 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 620,
            height: 460,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, #05070F 0%, transparent 70%)`,
            opacity: coreOpacity * (1 - die * 0.3),
            transform: `scale(${coreScale})`,
            filter: "blur(2px)",
          }}
        />
      </AbsoluteFill>

      {/* 碎片向中心塌缩缠绕 + 失活 */}
      <AbsoluteFill>
        {Array.from({ length: COUNT }, (_, i) => {
          const s = makeShardSeed(i);
          // 塌缩：从镜头1的落点 → 挤向中心并旋转缠绕
          const pull = collapse;
          const x = interpolate(pull, [0, 1], [s.finalX, s.finalX * 0.22]);
          const y = interpolate(pull, [0, 1], [s.finalY, s.finalY * 0.22]);
          const tangle = pull * (i % 2 === 0 ? 1 : -1); // 交错缠绕
          const rot = s.rot + tangle * 50;
          // 震颤
          const jx =
            Math.sin((frame + i * 30) / 4 + s.phase) * jitterAmt * (i % 3 === 0 ? 1 : 0.4);
          const jy = Math.cos((frame + i * 22) / 5 + s.phase) * jitterAmt * 0.6;
          const scale = s.depth * interpolate(pull, [0, 1], [1, 0.82]);
          return (
            <ShardCard
              key={i}
              seed={s}
              x={x + jx}
              y={y + jy}
              rot={rot}
              scale={scale}
              opacity={1}
              gray={die}
            />
          );
        })}
      </AbsoluteFill>

      {/* 暗角 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 26%, rgba(4,6,15,0.72) 100%)`,
        }}
      />

      {/* 字卡 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: textOpacity,
        }}
      >
        <div style={{ transform: `translateY(${textY}px)`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONTS.zh,
              fontWeight: 900,
              fontSize: 120,
              color: COLORS.textPrimary,
              letterSpacing: 6,
              textShadow: `0 0 40px ${COLORS.cyan}44, 0 6px 30px rgba(0,0,0,0.85)`,
            }}
          >
            越管越乱
          </div>
          <div
            style={{
              fontFamily: FONTS.en,
              fontSize: 26,
              color: COLORS.textSecondary,
              letterSpacing: 8,
              marginTop: 18,
              textTransform: "uppercase",
            }}
          >
            More hoarding, more chaos
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
