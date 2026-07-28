import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS, mulberry32 } from "../theme";
import { makeShardSeed, ShardCard } from "../components/Shard";

/**
 * 镜头1：收藏 ≠ 学会（0-3s / 90f）
 * 赛博空间里，形态各异的信息碎片（文本/图片/链接/代码/语音）
 * 从四周涌入、向中央堆积、逐渐失控。字卡压轴砸下。
 * 情绪：压抑但通透，深色科技感（非死灰）。
 */

const SHARD_COUNT = 78;

// 科技背景：淡青网格 + 漂浮光粒子 + 中央冷光晕
const TechBackdrop: React.FC<{ frame: number; dim: number }> = ({ frame, dim }) => {
  const gridDrift = (frame / 40) % 60;
  return (
    <AbsoluteFill style={{ opacity: dim }}>
      {/* 中央冷光晕 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${COLORS.cyan}12 0%, transparent 55%)`,
        }}
      />
      {/* 网格 */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(${COLORS.cyan}0d 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.cyan}0d 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundPosition: `${gridDrift}px ${gridDrift}px`,
        }}
      />
      {/* 漂浮光粒子 */}
      {Array.from({ length: 26 }, (_, i) => {
        const r = mulberry32(i * 77 + 5);
        const bx = r() * 1920;
        const by = r() * 1080;
        const sz = 1.5 + r() * 3;
        const ph = r() * Math.PI * 2;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / 22 + ph));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: bx + Math.sin(frame / 50 + ph) * 30,
              top: by + Math.cos(frame / 60 + ph) * 20,
              width: sz,
              height: sz,
              borderRadius: "50%",
              background: COLORS.cyan,
              opacity: tw * 0.5,
              boxShadow: `0 0 ${sz * 3}px ${COLORS.cyan}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Shot1Clutter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 字卡「收藏 ≠ 学会」：压轴砸下（最后 1s）
  const textEnter = spring({
    frame: frame - 58,
    fps,
    config: { damping: 14, stiffness: 120, mass: 1.2 },
  });
  const textScale = interpolate(textEnter, [0, 1], [2.2, 1]);
  const textOpacity = interpolate(frame - 58, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 字卡出现时背景压暗
  const shardDim = interpolate(frame, [58, 75], [1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 字卡扫光
  const sweepX = interpolate(frame, [62, 88], [-120, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, ${COLORS.bgBase} 0%, ${COLORS.bgDeep} 78%)`,
      }}
    >
      <TechBackdrop frame={frame} dim={shardDim} />

      {/* 碎片层 */}
      <AbsoluteFill style={{ opacity: shardDim }}>
        {Array.from({ length: SHARD_COUNT }, (_, i) => {
          const s = makeShardSeed(i);
          const enter = spring({
            frame: frame - s.delay,
            fps,
            config: { damping: 18, stiffness: 90, mass: 1 },
          });
          const startX = Math.cos(s.angle) * s.dist;
          const startY = Math.sin(s.angle) * s.dist;
          const x = interpolate(enter, [0, 1], [startX, s.finalX]);
          const y = interpolate(enter, [0, 1], [startY, s.finalY]);
          const scale = interpolate(enter, [0, 1], [0.3, 1]) * s.depth;
          const opacity = interpolate(frame - s.delay, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const float = Math.sin((frame + i * 40) / 18 + s.phase) * 4;
          return (
            <ShardCard
              key={i}
              seed={s}
              x={x}
              y={y + float}
              rot={s.rot}
              scale={scale}
              opacity={opacity}
            />
          );
        })}
      </AbsoluteFill>

      {/* 暗角 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 32%, rgba(4,6,15,0.66) 100%)`,
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
        <div style={{ transform: `scale(${textScale})`, textAlign: "center", position: "relative" }}>
          {/* 扫光 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${sweepX}%`,
              width: 80,
              background: `linear-gradient(90deg, transparent, ${COLORS.cyan}33, transparent)`,
              filter: "blur(6px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: FONTS.zh,
              fontWeight: 900,
              fontSize: 130,
              color: COLORS.textPrimary,
              letterSpacing: 4,
              textShadow: `0 0 50px ${COLORS.cyan}aa, 0 0 20px ${COLORS.cyan}66, 0 6px 30px rgba(0,0,0,0.8)`,
            }}
          >
            收藏 <span style={{ color: "#FF3B5C", textShadow: "0 0 40px #FF3B5Ccc" }}>≠</span> 学会
          </div>
          <div
            style={{
              fontFamily: FONTS.en,
              fontSize: 30,
              color: COLORS.cyan,
              letterSpacing: 12,
              marginTop: 22,
              textTransform: "uppercase",
              textShadow: `0 0 20px ${COLORS.cyan}88`,
            }}
          >
            Saving isn't knowing
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
