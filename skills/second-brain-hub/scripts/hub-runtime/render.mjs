// 确定性地图卡/完成卡。唯一事实源是契约的 progress_map 与台账。
const ICON = { completed: "✅", inprogress: "▶", pending: "⬜", blocked: "❌", skipped: "⤳" };

// 控制单卡长度，满足 output-visualization 的 400 字符预算。
function clip(text, max = 40) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function stepDisplayState(entry, ledger) {
  const sources = entry.source_steps;
  const done = sources.filter((s) => ledger.steps.completed.includes(s));
  const skipped = sources.filter((s) => ledger.steps.skipped[s] !== undefined);
  if (done.length === sources.length) return "completed";
  if (entry.kind === "conditional" && skipped.length === sources.length) return "skipped";
  if (done.length > 0 || skipped.length > 0) return "inprogress";
  return "pending";
}

function traceFor(entry, ledger) {
  for (const s of entry.source_steps) {
    if (ledger.steps.outputs[s]) return clip(ledger.steps.outputs[s]);
  }
  return "";
}

export function renderMapCard(ledger, scene) {
  const map = scene.progress_map;
  const total = map.length;
  const states = map.map((entry) => stepDisplayState(entry, ledger));
  let currentIndex = states.findIndex((s) => s === "pending" || s === "inprogress");
  if (currentIndex === -1) currentIndex = total; // 全部结算
  const current = Math.min(currentIndex + 1, total);
  const blocked = Boolean(ledger.blocked_reason);
  // 开始卡：尚无任何步骤结算时全部显示 ⬜；出现完成/跳过后才出现 ▶ 指针。
  const startCard = !states.some((s) => s === "completed" || s === "skipped");

  const lines = [`【${scene.intent}】步骤 ${current}/${total}`, ""];
  map.forEach((entry, i) => {
    const num = i + 1;
    const st = states[i];
    if (blocked && i === currentIndex) {
      lines.push(`  ${ICON.blocked} ${num} ${entry.label}     → ${ledger.blocked_reason}`);
    } else if (st === "completed") {
      const trace = traceFor(entry, ledger);
      lines.push(`  ${ICON.completed} ${num} ${entry.label}${trace ? `     → ${trace}` : ""}`);
    } else if (st === "skipped") {
      const reason = clip(entry.source_steps.map((s) => ledger.steps.skipped[s]).filter(Boolean).join("；"));
      lines.push(`  ${ICON.skipped} ${num} ${entry.label} 已跳过${reason ? `：${reason}` : ""}`);
    } else if (i === currentIndex && !startCard) {
      lines.push(`  ${ICON.inprogress} ${num} ${entry.label}     ← 进行中`);
    } else {
      lines.push(`  ${ICON.pending} ${num} ${entry.label}`);
    }
  });
  lines.push("");
  const wp = ledger.preflight?.write_allowed ? "write_allowed=true" : "write_allowed=false";
  const tail = `run: ${ledger.run_id} · 场景: ${scene.id} · ${wp}${blocked ? ` · 阻塞: ${ledger.blocked_reason}` : ""}`;
  lines.push(tail);
  return lines.join("\n");
}

export function renderCompletionCard(ledger, scene, { result = "" } = {}) {
  const map = scene.progress_map;
  const total = map.length;
  const lines = [`【${scene.intent}】已完成 ${total}/${total}`, ""];
  map.forEach((entry, i) => {
    const num = i + 1;
    const st = stepDisplayState(entry, ledger);
    if (st === "skipped") {
      const reason = clip(entry.source_steps.map((s) => ledger.steps.skipped[s]).filter(Boolean).join("；"));
      lines.push(`  ${ICON.skipped} ${num} ${entry.label} 已跳过${reason ? `：${reason}` : ""}`);
    } else {
      const trace = traceFor(entry, ledger);
      lines.push(`  ${ICON.completed} ${num} ${entry.label}${trace ? `     → ${trace}` : ""}`);
    }
  });
  lines.push("");
  if (result) lines.push(`【完成】${result}`);
  const isReadOnly = ["read", "advisory"].includes(scene.mode);
  const loc = ledger.commit?.receipt?.path;
  if (!isReadOnly && loc) lines.push(`【位置】${loc}`);
  lines.push(`run: ${ledger.run_id} · 场景: ${scene.id}`);
  return lines.join("\n");
}
