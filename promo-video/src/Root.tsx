import React from "react";
import { Composition } from "remotion";
import { Shot1Clutter } from "./shots/Shot1Clutter";

/**
 * 第二大脑 SKILL 宣传片 · 镜头序列
 * 30fps / 1920x1080 / 16:9 横屏
 *
 * 帧预算（35s = 1050f），当前先只做镜头1：
 * 镜头1: 0-90f    (0-3s)  收藏≠学会 · 碎片堆积
 * 镜头2: 90-210f  (3-7s)  越管越乱
 * 镜头3: 210-360f (7-12s) 第二大脑苏醒
 * 镜头4: 360-600f (12-20s) CODE四步
 * 镜头5: 600-810f (20-27s) 提炼成宝石
 * 镜头6: 810-1050f(27-35s) 收尾CTA
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// 各镜头帧区间（先定义，逐镜头实现时填充）
export const SHOTS = {
  shot1: { from: 0, duration: 90 },
  shot2: { from: 90, duration: 120 },
  shot3: { from: 210, duration: 150 },
  shot4: { from: 360, duration: 240 },
  shot5: { from: 600, duration: 210 },
  shot6: { from: 810, duration: 240 },
} as const;

export const Root: React.FC = () => {
  return (
    <>
      {/* 单镜头独立预览：便于逐镜头 still 验收 */}
      <Composition
        id="Shot1"
        component={Shot1Clutter}
        durationInFrames={SHOTS.shot1.duration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* 整片（后续镜头加入后逐步拼满） */}
      <Composition
        id="Promo"
        component={Shot1Clutter}
        durationInFrames={SHOTS.shot1.duration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
