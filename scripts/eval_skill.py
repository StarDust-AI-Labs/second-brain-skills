#!/usr/bin/env python3
"""Minimal checks for the modular second-brain Hub, routing, and hard gates."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAX_DESCRIPTION_CHARS = 500
PUBLIC_SKILLS = [
    "defuddle",
    "json-canvas",
    "obsidian-bases",
    "obsidian-cli",
    "obsidian-markdown",
    "second-brain-hub",
]


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def skill_path(root_name: str, skill_name: str) -> Path:
    if root_name == "skills":
        return ROOT / "skills" / skill_name / "SKILL.md"
    return ROOT / root_name / "skills" / skill_name / "SKILL.md"


def read_text(path: Path) -> str:
    if not path.exists():
        raise AssertionError(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def frontmatter(text: str) -> str:
    match = re.match(r"^---\r?\n(.*?)\r?\n---", text, flags=re.S)
    if not match:
        raise AssertionError("Missing YAML frontmatter")
    return match.group(1)


def description_from_frontmatter(fm: str) -> str:
    lines = fm.splitlines()
    collected: list[str] = []
    in_description = False
    for line in lines:
        if line.startswith("description:"):
            in_description = True
            suffix = line.split(":", 1)[1].strip()
            if suffix and suffix != "|":
                collected.append(suffix)
            continue
        if in_description:
            if line and not line.startswith((" ", "\t")):
                break
            collected.append(line.strip())
    if not collected:
        raise AssertionError("Missing description")
    return "".join(collected).replace(" ", "")


def route_intent(text: str) -> str | None:
    lowered = text.lower()
    has_url = bool(re.search(r"https?://|www\.", lowered))

    if any(word in text for word in ["天气", "几点", "汇率"]):
        return None
    if "收件箱" in text:
        return "收件箱处理"
    if any(
        word in text
        for word in [
            "越整理越乱",
            "越管越乱",
            "卡在CODE",
            "卡在 CODE",
            "只收集不产出",
            "从来做不出",
            "帮我诊断",
            "知识管理系统为什么",
        ]
    ):
        return "系统诊断"
    if has_url and any(word in text for word in ["保存", "收藏", "值得看", "总结", "提取", "提炼"]):
        return "保存外源"
    if any(word in text for word in ["记一下", "灵感", "idea", "点子", "想到"]):
        return "灵感速记"
    if any(word in text for word in ["回顾", "本周", "这周", "本月", "周回顾", "月回顾"]):
        return "回顾整理"
    if any(word in text for word in ["找一下", "搜索", "有没有", "在哪", "关联"]):
        return "探索查询"
    if any(word in text for word in ["画重点", "提炼", "整理这段", "做笔记", "加粗", "重点"]):
        return "提炼加工"
    if any(word in text for word in ["写一篇", "写个", "做一个", "创作", "生成", "PPT", "大纲", "起头"]):
        return "创作启动"
    return "不确定"


def check_descriptions(root_name: str) -> list[str]:
    errors: list[str] = []
    for skill in PUBLIC_SKILLS:
        path = skill_path(root_name, skill)
        try:
            desc = description_from_frontmatter(frontmatter(read_text(path)))
        except AssertionError as exc:
            errors.append(f"{root_name}:{skill}: {exc}")
            continue
        if len(desc) > MAX_DESCRIPTION_CHARS:
            errors.append(
                f"{root_name}:{skill}: description has {len(desc)} chars, "
                f"max {MAX_DESCRIPTION_CHARS}"
            )
    return errors


def implementation_path(root_name: str, implementation: dict[str, str]) -> Path:
    implementation_type = implementation.get("type")
    if implementation_type == "skill":
        return skill_path(root_name, implementation["name"])
    if implementation_type == "reference":
        if root_name == "skills":
            return ROOT / "skills" / "second-brain-hub" / implementation["path"]
        return ROOT / root_name / "skills" / "second-brain-hub" / implementation["path"]
    raise AssertionError(f"Unknown implementation type: {implementation_type}")


def check_gates(root_name: str) -> list[str]:
    errors: list[str] = []
    cases = load_json(ROOT / "tests" / "hub" / "gate-cases.json")
    contracts = load_json(ROOT / "skills" / "second-brain-hub" / "capability-contracts.json")
    capabilities = {item["id"]: item for item in contracts["capabilities"]}
    for case in cases:
        capability_id = case["capability"]
        capability = capabilities.get(capability_id)
        if capability is None:
            errors.append(f"Unknown capability in gate case: {capability_id}")
            continue
        text = read_text(implementation_path(root_name, capability["implementation"]))
        for gate_id in case["required_gates"]:
            if f'<HARD-GATE id="{gate_id}">' not in text:
                errors.append(f"{root_name}:{capability_id}: missing HARD-GATE {gate_id}")
    return errors


def check_intent_routing() -> list[str]:
    errors: list[str] = []
    cases = load_json(ROOT / "tests" / "hub" / "intent-routing.json")
    seen: set[str] = set()
    for case in cases:
        case_id = case["id"]
        if case_id in seen:
            errors.append(f"Duplicate case id: {case_id}")
        seen.add(case_id)

        actual = route_intent(case["input"])
        expected = case["expected_intent"]
        if actual != expected:
            errors.append(f"{case_id}: expected {expected!r}, got {actual!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("target", nargs="?", default="hub", choices=["hub"])
    parser.add_argument("--check-mirror", action="store_true")
    args = parser.parse_args()

    # Top-level skills/ is the repository source of truth. Agent directories
    # are installation mirrors and are only checked when explicitly requested.
    roots = ["skills"]
    if args.check_mirror:
        roots.extend([".agents", ".claude"])

    errors: list[str] = []
    for root_name in roots:
        errors.extend(check_descriptions(root_name))
        errors.extend(check_gates(root_name))
    errors.extend(check_intent_routing())

    if errors:
        print("Skill eval failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Skill eval passed.")
    print(f"Checked roots: {', '.join(roots)}")
    print(f"Public Skills: {', '.join(PUBLIC_SKILLS)}")
    print(f"Description max: {MAX_DESCRIPTION_CHARS} chars")
    print(f"Intent cases: {len(load_json(ROOT / 'tests' / 'hub' / 'intent-routing.json'))}")
    print(f"Gate specs: {len(load_json(ROOT / 'tests' / 'hub' / 'gate-cases.json'))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
