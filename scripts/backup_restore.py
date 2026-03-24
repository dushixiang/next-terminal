#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import print_function

import argparse
import datetime
import glob
import os
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile


ITEM_ORDER = ["recordings", "drive", "postgresql", "ca"]
PG_DUMP_FILENAME = "postgresql_dump.sql"

ITEM_META = {
    "recordings": {
        "path": "recordings",
        "zh": "录屏文件",
        "en": "Session recordings",
    },
    "drive": {
        "path": "drive",
        "zh": "Windows挂载盘文件",
        "en": "Windows mapped drive files",
    },
    "postgresql": {
        "zh": "PostgreSQL数据库文件",
        "en": "PostgreSQL database files",
    },
    "ca": {
        "glob": "root_ca_*.pem",
        "zh": "CA证书与私钥",
        "en": "CA certificate and private key",
    },
}

ITEM_ALIASES = {
    "recordings": "recordings",
    "recording": "recordings",
    "drive": "drive",
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "pg": "postgresql",
    "ca": "ca",
    "cert": "ca",
    "certs": "ca",
    "certificate": "ca",
}

I18N = {
    "zh": {
        "desc": "Next Terminal 备份/恢复脚本（Python 3.6+，无外部依赖）",
        "missing_compose": "警告：在 {workdir} 下未找到 docker-compose.yaml 或 docker-compose.yml。",
        "backup_start": "开始备份，工作目录：{workdir}",
        "restore_start": "开始恢复，工作目录：{workdir}",
        "using_archive": "归档文件：{archive}",
        "select_title_backup": "交互式选择备份内容：",
        "select_title_restore": "交互式选择恢复内容：",
        "select_prompt": "请输入编号或名称（逗号分隔），输入 a 全选，直接回车默认可用项：",
        "select_invalid": "输入无效：{value}",
        "select_empty": "未选择任何项目。",
        "item_state_available": "可用",
        "item_state_missing": "缺失",
        "warn_missing_item": "警告：已选择 {item}，但未找到对应数据。",
        "error_no_item_found": "错误：没有可打包的数据，请检查 data 目录内容。",
        "backup_added": "已加入归档：{path}",
        "pg_dump_running": "正在执行容器内 pg_dump：服务 {service}",
        "pg_restore_running": "正在执行容器内 psql 恢复：服务 {service}",
        "compose_using": "使用 Compose 命令：{cmd}",
        "error_compose_not_found": "错误：未找到可用的 Docker Compose 命令。请安装 docker compose 或 docker-compose，或通过 --compose-cmd 指定。",
        "error_pg_dump_failed": "错误：pg_dump 执行失败，退出码 {code}",
        "error_pg_restore_failed": "错误：psql 恢复失败，退出码 {code}",
        "backup_done": "备份完成：{archive}",
        "restore_done": "恢复完成，共提取 {count} 个条目。",
        "error_archive_not_found": "错误：归档文件不存在：{archive}",
        "error_no_archive": "错误：未找到可用备份文件，请通过 --archive 指定。",
        "latest_archive": "自动选择最新备份：{archive}",
        "list_header": "可选项目：",
        "error_unknown_items": "错误：未知项目：{items}",
        "error_no_member_to_restore": "错误：归档中没有可恢复的选中内容。",
        "restore_extracting": "正在提取：{name}",
        "error_unsafe_member": "错误：归档包含不安全路径，已中止：{name}",
        "error_link_member": "错误：归档包含链接条目，已中止：{name}",
    },
    "en": {
        "desc": "Next Terminal backup/restore script (Python 3.6+, no external dependencies)",
        "missing_compose": "Warning: docker-compose.yaml or docker-compose.yml was not found in {workdir}.",
        "backup_start": "Starting backup, working directory: {workdir}",
        "restore_start": "Starting restore, working directory: {workdir}",
        "using_archive": "Archive: {archive}",
        "select_title_backup": "Interactive selection for backup content:",
        "select_title_restore": "Interactive selection for restore content:",
        "select_prompt": "Input indexes or names (comma separated), 'a' for all, Enter for defaults:",
        "select_invalid": "Invalid input: {value}",
        "select_empty": "No item selected.",
        "item_state_available": "available",
        "item_state_missing": "missing",
        "warn_missing_item": "Warning: selected {item}, but no matching data was found.",
        "error_no_item_found": "Error: no data found to archive. Check your data directory.",
        "backup_added": "Added to archive: {path}",
        "pg_dump_running": "Running in-container pg_dump: service {service}",
        "pg_restore_running": "Running in-container psql restore: service {service}",
        "compose_using": "Using Compose command: {cmd}",
        "error_compose_not_found": "Error: no usable Docker Compose command found. Install docker compose/docker-compose or set --compose-cmd.",
        "error_pg_dump_failed": "Error: pg_dump failed with exit code {code}",
        "error_pg_restore_failed": "Error: psql restore failed with exit code {code}",
        "backup_done": "Backup completed: {archive}",
        "restore_done": "Restore completed, extracted {count} member(s).",
        "error_archive_not_found": "Error: archive file does not exist: {archive}",
        "error_no_archive": "Error: no archive was found. Please specify one via --archive.",
        "latest_archive": "Auto-selected latest backup: {archive}",
        "list_header": "Selectable items:",
        "error_unknown_items": "Error: unknown items: {items}",
        "error_no_member_to_restore": "Error: no selected content found in archive.",
        "restore_extracting": "Extracting: {name}",
        "error_unsafe_member": "Error: unsafe member path in archive, aborted: {name}",
        "error_link_member": "Error: archive contains link member, aborted: {name}",
    },
}


def detect_lang(lang_value):
    if lang_value in ("zh", "en"):
        return lang_value
    env = os.environ.get("LANG", "").lower()
    if env.startswith("zh"):
        return "zh"
    return "en"


def tr(lang, key, **kwargs):
    text = I18N[lang][key]
    if kwargs:
        return text.format(**kwargs)
    return text


def parse_item_list(raw):
    if not raw:
        return [], []
    tokens = [x.strip().lower() for x in re.split(r"[\s,]+", raw) if x.strip()]
    unknown = []
    result = []
    for token in tokens:
        mapped = ITEM_ALIASES.get(token)
        if not mapped:
            unknown.append(token)
            continue
        if mapped not in result:
            result.append(mapped)
    return result, unknown


def check_compose_file(workdir, lang):
    yml = os.path.join(workdir, "docker-compose.yml")
    yaml = os.path.join(workdir, "docker-compose.yaml")
    if not os.path.exists(yml) and not os.path.exists(yaml):
        print(tr(lang, "missing_compose", workdir=workdir))


def get_latest_archive(workdir):
    pattern = os.path.join(workdir, "next-terminal-backup-*.tar.gz")
    candidates = glob.glob(pattern)
    if not candidates:
        return None
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def resolve_compose_command(args, lang, quiet):
    cached = getattr(args, "_compose_cmd_cache", None)
    if cached is not None:
        return cached

    requested = getattr(args, "compose_cmd", "auto")
    candidates = []
    if requested and requested != "auto":
        parsed = shlex.split(requested)
        if parsed:
            candidates.append(parsed)
    else:
        candidates.extend([["docker", "compose"], ["docker-compose"]])

    for candidate in candidates:
        if shutil.which(candidate[0]) is None:
            continue
        try:
            with open(os.devnull, "wb") as sink:
                code = subprocess.call(candidate + ["version"], stdout=sink, stderr=sink)
            if code == 0:
                setattr(args, "_compose_cmd_cache", candidate)
                return candidate
        except OSError:
            continue

    if not quiet:
        print(tr(lang, "error_compose_not_found"))
    return None


def resolve_item_paths(workdir, data_dir, item_key):
    item = ITEM_META[item_key]
    if item_key == "postgresql":
        return []
    if "glob" in item:
        pattern = os.path.join(workdir, data_dir, item["glob"])
        matches = sorted(glob.glob(pattern))
        return [p for p in matches if os.path.isfile(p)]
    if "path" not in item:
        return []
    path = os.path.join(workdir, data_dir, item["path"])
    if os.path.exists(path):
        return [path]
    return []


def collect_available_items(workdir, data_dir, args, command, lang):
    available = {}
    for key in ITEM_ORDER:
        if key == "postgresql":
            continue
        paths = resolve_item_paths(workdir, data_dir, key)
        if paths:
            available[key] = paths
    if command == "backup" and can_run_pg_dump(args, lang):
        available["postgresql"] = ["__pg_dump__"]
    return available


def print_item_list(lang, available_keys):
    print(tr(lang, "list_header"))
    for idx, key in enumerate(ITEM_ORDER, 1):
        label = ITEM_META[key][lang]
        state = tr(lang, "item_state_available") if key in available_keys else tr(lang, "item_state_missing")
        print("{idx}. {key:<10} {label} ({state})".format(idx=idx, key=key, label=label, state=state))


def prompt_for_items(lang, available_keys, title_key):
    print(tr(lang, title_key))
    print_item_list(lang, available_keys)
    index_to_key = dict((str(i), k) for i, k in enumerate(ITEM_ORDER, 1))

    while True:
        user_input = input(tr(lang, "select_prompt") + " ").strip().lower()
        if not user_input:
            defaults = [k for k in ITEM_ORDER if k in available_keys]
            if defaults:
                return defaults
            print(tr(lang, "select_empty"))
            continue
        if user_input in ("a", "all", "*"):
            return list(ITEM_ORDER)

        raw_tokens = [x.strip() for x in re.split(r"[\s,]+", user_input) if x.strip()]
        picked = []
        invalid = []
        for token in raw_tokens:
            token_lower = token.lower()
            if token in index_to_key:
                key = index_to_key[token]
            else:
                key = ITEM_ALIASES.get(token_lower)
            if key and key not in picked:
                picked.append(key)
            elif not key:
                invalid.append(token)

        if invalid:
            print(tr(lang, "select_invalid", value=", ".join(invalid)))
            continue
        if not picked:
            print(tr(lang, "select_empty"))
            continue
        return picked


def choose_items(args, lang, available_keys, interactive_title_key):
    if args.items:
        parsed, unknown = parse_item_list(args.items)
        if unknown:
            print(tr(lang, "error_unknown_items", items=", ".join(unknown)))
            return None
        return parsed
    if args.interactive:
        return prompt_for_items(lang, available_keys, interactive_title_key)
    if args.all:
        return list(ITEM_ORDER)
    return [k for k in ITEM_ORDER if k in available_keys]


def resolve_archive_path(workdir, archive_arg, for_backup):
    if archive_arg:
        if os.path.isabs(archive_arg):
            return archive_arg
        return os.path.join(workdir, archive_arg)
    if for_backup:
        date_tag = datetime.datetime.now().strftime("%Y%m%d")
        filename = "next-terminal-backup-{date}.tar.gz".format(date=date_tag)
        return os.path.join(workdir, filename)
    return get_latest_archive(workdir)


def can_run_pg_dump(args, lang):
    return resolve_compose_command(args, lang, quiet=True) is not None


def run_pg_dump_to_file(args, lang, output_path, workdir):
    compose_cmd = resolve_compose_command(args, lang, quiet=False)
    if not compose_cmd:
        return 2

    print(tr(lang, "compose_using", cmd=" ".join(compose_cmd)))
    print(tr(lang, "pg_dump_running", service=args.pg_service))
    shell_cmd = args.pg_dump_cmd
    cmd = compose_cmd + ["exec", "-T", args.pg_service, "sh", "-lc", shell_cmd]
    with open(output_path, "wb") as f:
        code = subprocess.call(cmd, cwd=workdir, stdout=f)
    if code != 0:
        print(tr(lang, "error_pg_dump_failed", code=code))
        return 2
    return 0


def run_psql_restore_from_file(args, lang, input_path, workdir):
    compose_cmd = resolve_compose_command(args, lang, quiet=False)
    if not compose_cmd:
        return 2

    print(tr(lang, "compose_using", cmd=" ".join(compose_cmd)))
    print(tr(lang, "pg_restore_running", service=args.pg_service))
    shell_cmd = args.pg_restore_cmd
    cmd = compose_cmd + ["exec", "-T", args.pg_service, "sh", "-lc", shell_cmd]
    with open(input_path, "rb") as f:
        code = subprocess.call(cmd, cwd=workdir, stdin=f)
    if code != 0:
        print(tr(lang, "error_pg_restore_failed", code=code))
        return 2
    return 0


def run_backup(args, lang):
    workdir = os.path.abspath(args.workdir)
    archive_path = resolve_archive_path(workdir, args.archive, for_backup=True)
    available = collect_available_items(workdir, args.data_dir, args, "backup", lang)
    check_compose_file(workdir, lang)
    print(tr(lang, "backup_start", workdir=workdir))
    print(tr(lang, "using_archive", archive=archive_path))

    if args.list:
        print_item_list(lang, set(available.keys()))
        return 0

    selected = choose_items(args, lang, set(available.keys()), "select_title_backup")
    if selected is None:
        return 2

    paths = []
    need_pg_dump = False
    for key in selected:
        if key == "postgresql":
            need_pg_dump = True
            continue
        resolved = available.get(key, [])
        if not resolved:
            print(tr(lang, "warn_missing_item", item=key))
            continue
        for path in resolved:
            if path not in paths:
                paths.append(path)

    if not paths and not need_pg_dump:
        print(tr(lang, "error_no_item_found"))
        return 2

    archive_dir = os.path.dirname(archive_path)
    if archive_dir and not os.path.exists(archive_dir):
        os.makedirs(archive_dir)

    tmp_pg_dump = None
    try:
        if need_pg_dump:
            fd, tmp_pg_dump = tempfile.mkstemp(prefix="next-terminal-pg-", suffix=".sql")
            os.close(fd)
            code = run_pg_dump_to_file(args, lang, tmp_pg_dump, workdir)
            if code != 0:
                return code

        with tarfile.open(archive_path, "w:gz") as tar:
            for src in paths:
                arcname = os.path.relpath(src, workdir)
                tar.add(src, arcname=arcname)
                print(tr(lang, "backup_added", path=arcname))

            if tmp_pg_dump:
                pg_arcname = os.path.join(args.data_dir, PG_DUMP_FILENAME)
                tar.add(tmp_pg_dump, arcname=pg_arcname)
                print(tr(lang, "backup_added", path=pg_arcname))
    finally:
        if tmp_pg_dump and os.path.exists(tmp_pg_dump):
            os.remove(tmp_pg_dump)

    print(tr(lang, "backup_done", archive=archive_path))
    return 0


def item_key_from_member_name(member_name, data_dir):
    clean = member_name.replace("\\", "/").lstrip("./")
    prefix = data_dir.strip("/") + "/"
    if not clean.startswith(prefix):
        return None
    sub = clean[len(prefix):]

    if sub == "recordings" or sub.startswith("recordings/"):
        return "recordings"
    if sub == "drive" or sub.startswith("drive/"):
        return "drive"
    if sub == PG_DUMP_FILENAME:
        return "postgresql"
    if re.match(r"^root_ca_.*\.pem$", sub):
        return "ca"
    return None


def collect_archive_members_by_item(tar, data_dir):
    result = dict((k, []) for k in ITEM_ORDER)
    for member in tar.getmembers():
        key = item_key_from_member_name(member.name, data_dir)
        if key:
            result[key].append(member)
    return result


def is_safe_member_path(workdir, member_name):
    target = os.path.abspath(os.path.join(workdir, member_name))
    if target == workdir:
        return True
    return target.startswith(workdir + os.sep)


def run_restore(args, lang):
    workdir = os.path.abspath(args.workdir)
    archive_path = resolve_archive_path(workdir, args.archive, for_backup=False)
    check_compose_file(workdir, lang)
    print(tr(lang, "restore_start", workdir=workdir))

    if not archive_path:
        print(tr(lang, "error_no_archive"))
        return 2
    if args.archive is None:
        print(tr(lang, "latest_archive", archive=archive_path))
    print(tr(lang, "using_archive", archive=archive_path))

    if not os.path.exists(archive_path):
        print(tr(lang, "error_archive_not_found", archive=archive_path))
        return 2

    with tarfile.open(archive_path, "r:gz") as tar:
        grouped = collect_archive_members_by_item(tar, args.data_dir)
        available_keys = set([k for k in ITEM_ORDER if grouped[k]])

        if args.list:
            print_item_list(lang, available_keys)
            return 0

        selected = choose_items(args, lang, available_keys, "select_title_restore")
        if selected is None:
            return 2

        members = []
        pg_members = []
        names = set()
        for key in selected:
            selected_members = grouped.get(key, [])
            if not selected_members:
                print(tr(lang, "warn_missing_item", item=key))
                continue
            for member in selected_members:
                if member.name not in names:
                    names.add(member.name)
                    if key == "postgresql":
                        pg_members.append(member)
                    else:
                        members.append(member)

        if not members and not pg_members:
            print(tr(lang, "error_no_member_to_restore"))
            return 2

        for member in members + pg_members:
            if member.islnk() or member.issym():
                print(tr(lang, "error_link_member", name=member.name))
                return 2
            if not is_safe_member_path(workdir, member.name):
                print(tr(lang, "error_unsafe_member", name=member.name))
                return 2

        for member in members:
            print(tr(lang, "restore_extracting", name=member.name))
            tar.extract(member, path=workdir)

        for member in pg_members:
            extracted = tar.extractfile(member)
            if extracted is None:
                print(tr(lang, "warn_missing_item", item="postgresql"))
                continue

            fd, tmp_pg_dump = tempfile.mkstemp(prefix="next-terminal-pg-restore-", suffix=".sql")
            os.close(fd)
            try:
                with open(tmp_pg_dump, "wb") as f:
                    f.write(extracted.read())
                code = run_psql_restore_from_file(args, lang, tmp_pg_dump, workdir)
                if code != 0:
                    return code
            finally:
                extracted.close()
                if os.path.exists(tmp_pg_dump):
                    os.remove(tmp_pg_dump)

    print(tr(lang, "restore_done", count=len(members) + len(pg_members)))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description=I18N["en"]["desc"])
    parser.add_argument("--lang", choices=["auto", "zh", "en"], default=argparse.SUPPRESS, help=argparse.SUPPRESS)

    subparsers = parser.add_subparsers(dest="command")

    def add_common_options(sub):
        sub.add_argument("--lang", choices=["auto", "zh", "en"], default=argparse.SUPPRESS, help="Output language: auto/zh/en")
        sub.add_argument("--workdir", default=".", help="Working directory (docker-compose.yaml level)")
        sub.add_argument("--data-dir", default="data", help="Data directory name under workdir")
        sub.add_argument("--archive", default=None, help="Archive path (output for backup, input for restore)")
        sub.add_argument("--items", default=None, help="Comma-separated items, e.g. drive,recordings,postgresql,ca")
        sub.add_argument("--interactive", action="store_true", help="Choose items interactively")
        sub.add_argument("--all", action="store_true", help="Select all known items")
        sub.add_argument("--list", action="store_true", help="List selectable items and exit")
        sub.add_argument("--compose-cmd", default="auto", help="Compose command, e.g. auto / 'docker compose' / docker-compose")
        sub.add_argument("--pg-service", default="postgresql", help="PostgreSQL service name in compose (for exec)")
        sub.add_argument("--pg-dump-cmd", default='pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-postgres}"', help="Command executed inside container for dump")
        sub.add_argument("--pg-restore-cmd", default='psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-postgres}"', help="Command executed inside container for restore (reads SQL from stdin)")

    backup_parser = subparsers.add_parser("backup", help="Create backup archive")
    add_common_options(backup_parser)

    restore_parser = subparsers.add_parser("restore", help="Restore from backup archive")
    add_common_options(restore_parser)
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1

    lang = detect_lang(getattr(args, "lang", "auto"))
    if args.command == "backup":
        return run_backup(args, lang)
    if args.command == "restore":
        return run_restore(args, lang)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
