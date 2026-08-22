#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命令行待办事项管理器
用法：
  python todo.py add "任务标题"    - 添加任务
  python todo.py done <任务ID>      - 标记任务为已完成
  python todo.py delete <任务ID>    - 删除任务
  python todo.py list               - 查看所有任务（按完成状态分组）
"""

import argparse
import json
import os
import sys
from datetime import datetime

# ── 终端编码适配 ─────────────────────────────────────
# 在 Windows 上尝试切换到 UTF-8，确保中文和特殊字符正常输出
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass  # 无法切换时保持默认编码

# ── 配置 ──────────────────────────────────────────────
FILE_PATH = "tasks.json"


# ── 数据读写 ──────────────────────────────────────────

def load_tasks() -> dict:
    """从 JSON 文件加载任务数据；文件不存在则返回初始结构。"""
    if not os.path.exists(FILE_PATH):
        return {"tasks": [], "next_id": 1}

    try:
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("[错误] tasks.json 文件格式损坏，请手动检查或删除后重试。")
        sys.exit(1)

    # 兼容旧数据：确保必要字段存在
    if "tasks" not in data:
        data["tasks"] = []
    if "next_id" not in data:
        data["next_id"] = 1
    return data


def save_tasks(data: dict) -> None:
    """将任务数据写入 JSON 文件（UTF-8 编码，缩进美化）。"""
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── 辅助函数 ──────────────────────────────────────────

def find_task(data: dict, task_id: int) -> dict | None:
    """根据 ID 查找任务，找不到返回 None。"""
    for task in data["tasks"]:
        if task["id"] == task_id:
            return task
    return None


# ── 命令处理 ──────────────────────────────────────────

def cmd_add(title: str) -> None:
    """添加新任务。"""
    title = title.strip()
    if not title:
        print("[错误] 任务标题不能为空。")
        sys.exit(1)

    data = load_tasks()

    task = {
        "id": data["next_id"],
        "title": title,
        "completed": False,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "completed_at": None,
    }
    data["tasks"].append(task)
    data["next_id"] += 1

    save_tasks(data)
    print(f"[成功] 已添加任务 [ID: {task['id']}] — {task['title']}")


def cmd_done(task_id: int) -> None:
    """标记任务为已完成。"""
    data = load_tasks()
    task = find_task(data, task_id)

    if task is None:
        print(f"[错误] 未找到 ID 为 {task_id} 的任务。")
        sys.exit(1)

    if task["completed"]:
        print(f"[提示] 任务 [ID: {task_id}] 已经是已完成状态，无需重复操作。")
        return

    task["completed"] = True
    task["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    save_tasks(data)
    print(f"[成功] 已标记完成 [ID: {task_id}] — {task['title']}")


def cmd_delete(task_id: int) -> None:
    """删除任务（需二次确认）。"""
    data = load_tasks()
    task = find_task(data, task_id)

    if task is None:
        print(f"[错误] 未找到 ID 为 {task_id} 的任务。")
        sys.exit(1)

    # 二次确认
    status = "已完成" if task["completed"] else "未完成"
    confirm = input(f"[确认] 确定删除 [ID: {task_id}]「{task['title']}」({status})？(y/N): ").strip().lower()
    if confirm not in ("y", "yes"):
        print("已取消删除。")
        return

    data["tasks"] = [t for t in data["tasks"] if t["id"] != task_id]
    save_tasks(data)
    print(f"[已删除] 任务 [ID: {task_id}] — {task['title']}")


def cmd_list() -> None:
    """按完成状态分组显示所有任务。"""
    data = load_tasks()
    tasks = data["tasks"]

    if not tasks:
        print("暂无待办事项，使用 add 命令添加一个吧！")
        return

    pending = [t for t in tasks if not t["completed"]]
    completed = [t for t in tasks if t["completed"]]

    # 未完成任务按创建时间升序排列
    pending.sort(key=lambda t: t["created_at"])
    # 已完成任务按完成时间降序排列（最近完成的在前面）
    completed.sort(key=lambda t: t["completed_at"] or "", reverse=True)

    print("=" * 54)
    print("  待办事项列表")
    print("=" * 54)

    if pending:
        print(f"\n  [未完成] 共 {len(pending)} 项")
        print(f"  {'─' * 46}")
        for t in pending:
            print(f"  #{t['id']:<4} {t['title']:<28} {t['created_at']}")

    if completed:
        print(f"\n  [已完成] 共 {len(completed)} 项")
        print(f"  {'─' * 46}")
        for t in completed:
            completed_time = t["completed_at"] or "—"
            print(f"  #{t['id']:<4} {t['title']:<28} {completed_time}")

    print()


# ── 命令行解析 ────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    """构建 argparse 解析器。"""
    parser = argparse.ArgumentParser(
        description="命令行待办事项管理器 — 数据存储在 tasks.json",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # add
    parser_add = subparsers.add_parser("add", help="添加新任务")
    parser_add.add_argument("title", type=str, help="任务标题")

    # done
    parser_done = subparsers.add_parser("done", help="标记任务为已完成")
    parser_done.add_argument("task_id", type=int, help="要完成的任务 ID")

    # delete
    parser_delete = subparsers.add_parser("delete", help="删除任务")
    parser_delete.add_argument("task_id", type=int, help="要删除的任务 ID")

    # list
    subparsers.add_parser("list", help="查看所有任务")

    return parser


# ── 入口 ──────────────────────────────────────────────

def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "add":
        cmd_add(args.title)
    elif args.command == "done":
        cmd_done(args.task_id)
    elif args.command == "delete":
        cmd_delete(args.task_id)
    elif args.command == "list":
        cmd_list()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
