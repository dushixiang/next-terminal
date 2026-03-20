#!/usr/bin/env python3
"""
Next Terminal 数据库迁移工具
将 SQLite / MySQL 数据迁移到 PostgreSQL
"""

import os
import re
import shutil
import subprocess
import sys
import time

# ── 终端颜色 ──────────────────────────────────────────────────────────────────

RESET  = "\033[0m"
RED    = "\033[0;31m"
GREEN  = "\033[0;32m"
YELLOW = "\033[1;33m"
BLUE   = "\033[0;34m"

def info(msg):    print(f"{BLUE}[INFO]{RESET} {msg}")
def ok(msg):      print(f"{GREEN}[OK]{RESET} {msg}")
def warn(msg):    print(f"{YELLOW}[WARN]{RESET} {msg}")
def error(msg):   print(f"{RED}[ERROR]{RESET} {msg}", file=sys.stderr)

# ── 通用输入工具 ──────────────────────────────────────────────────────────────

def ask(prompt: str, default: str = "", secret: bool = False) -> str:
    display = f"{prompt} [{default}]: " if default else f"{prompt}: "
    if secret:
        import getpass
        value = getpass.getpass(display)
    else:
        value = input(display).strip()
    return value if value else default


def confirm(prompt: str) -> bool:
    answer = input(f"{prompt} (y/N): ").strip().lower()
    return answer in ("y", "yes")

# ── Docker 检查 ───────────────────────────────────────────────────────────────

def check_docker():
    if not shutil.which("docker"):
        error("未检测到 Docker，请先安装 Docker 后再运行此脚本。")
        sys.exit(1)
    result = subprocess.run(["docker", "info"], capture_output=True)
    if result.returncode != 0:
        error("Docker 未运行，请启动 Docker 后再运行此脚本。")
        sys.exit(1)
    ok("Docker 检测通过")

# ── 第一步：启动 PostgreSQL ───────────────────────────────────────────────────

def setup_postgresql() -> dict:
    """
    询问是否自动启动 PostgreSQL 容器：
    - 是：使用默认连接配置，由脚本拉起容器，用户只需确认数据目录
    - 否：由用户手动输入已有 PostgreSQL 的连接信息
    返回 pg 连接信息字典。
    """
    print()
    if confirm("是否由脚本自动启动一个 PostgreSQL 容器？（已有运行中的 PG 可选 N）"):
        pg = {
            "host":        "127.0.0.1",   # pgloader 连接地址（宿主机网络）
            "config_host": "postgresql",  # config.yaml 中使用容器名
            "port":   "5432",
            "user":   "next-terminal",
            "passwd": "next-terminal",
            "db":     "next-terminal",
        }

        data_dir = ask("PostgreSQL 数据目录（宿主机路径，用于持久化数据）", "./data/postgresql")
        data_dir_abs = os.path.realpath(data_dir)
        os.makedirs(data_dir_abs, exist_ok=True)

        container_name = "next-terminal-postgresql"
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)

        info(f"正在启动 PostgreSQL 容器，数据目录: {data_dir_abs}")
        subprocess.run([
            "docker", "run", "-d",
            "--name", container_name,
            "--network", "host",
            "-v", f"{data_dir_abs}:/var/lib/postgresql/data",
            "-e", f"POSTGRES_DB={pg['db']}",
            "-e", f"POSTGRES_USER={pg['user']}",
            "-e", f"POSTGRES_PASSWORD={pg['passwd']}",
            "postgres:16.4",
        ], check=True)

        info("等待 PostgreSQL 就绪...")
        for _ in range(30):
            result = subprocess.run(
                ["docker", "exec", container_name, "pg_isready", "-U", pg["user"]],
                capture_output=True,
            )
            if result.returncode == 0:
                ok("PostgreSQL 已就绪")
                return pg
            time.sleep(2)

        error("PostgreSQL 启动超时，请手动检查容器状态。")
        sys.exit(1)

    else:
        info("跳过启动，请确保 PostgreSQL 已运行并可访问。")
        info("请输入目标 PostgreSQL 连接信息：")
        host = ask("主机", "127.0.0.1")
        return {
            "host":        host,
            "config_host": host,  # 手动模式下连接地址与配置地址相同
            "port":   ask("端口",    "5432"),
            "user":   ask("用户名",  "next-terminal"),
            "passwd": ask("密码",    "next-terminal", secret=True),
            "db":     ask("数据库名","next-terminal"),
        }

# ── 第二步：执行数据迁移 ──────────────────────────────────────────────────────

def run_pgloader(source_dsn: str, pg: dict):
    target_dsn = f"pgsql://{pg['user']}:{pg['passwd']}@{pg['host']}:{pg['port']}/{pg['db']}"
    info("开始迁移数据，请稍候...")

    cmd = [
        "docker", "run", "--rm",
        "--network", "host",
    ]

    # SQLite 需要挂载文件
    if source_dsn.startswith("sqlite://"):
        db_path = source_dsn[len("sqlite:///"):]
        abs_path = os.path.realpath(db_path)
        cmd += ["-v", f"{abs_path}:/db/nt.db"]
        source_dsn = "sqlite:///db/nt.db"

    cmd += [
        "dimitri/pgloader:latest",
        "pgloader", source_dsn, target_dsn,
    ]

    subprocess.run(cmd, check=True)
    ok("数据迁移完成")

# ── 第三步：更新配置文件 ──────────────────────────────────────────────────────

def update_config_yaml(config_file: str, pg: dict):
    if not os.path.isfile(config_file):
        error(f"找不到 config.yaml: {config_file}")
        return

    shutil.copy2(config_file, config_file + ".bak")
    info(f"已备份原文件到 {config_file}.bak")

    with open(config_file) as f:
        content = f.read()

    new_db_block = (
        "Database:\n"
        "  Enabled: true\n"
        "  Type: postgres\n"
        "  Postgres:\n"
        f"    Hostname: {pg['config_host']}\n"
        f"    Port: {pg['port']}\n"
        f"    Username: {pg['user']}\n"
        f"    Password: {pg['passwd']}\n"
        f"    Database: {pg['db']}\n"
        "  ShowSql: false\n"
    )

    # 替换整个 Database: 顶级块（直到下一个顶级 key）
    new_content = re.sub(
        r"^Database:.*?(?=^\S|\Z)",
        new_db_block,
        content,
        flags=re.MULTILINE | re.DOTALL,
    )

    with open(config_file, "w") as f:
        f.write(new_content)

    ok("config.yaml 已更新")


def update_compose_yaml(compose_file: str, source_type: str, pg: dict):
    if not os.path.isfile(compose_file):
        error(f"找不到 docker-compose 文件: {compose_file}")
        return

    shutil.copy2(compose_file, compose_file + ".bak")
    info(f"已备份原文件到 {compose_file}.bak")

    with open(compose_file) as f:
        content = f.read()

    pg_service = (
        "  postgresql:\n"
        "    container_name: postgresql\n"
        "    image: postgres:16.4\n"
        "    environment:\n"
        f"      POSTGRES_DB: {pg['db']}\n"
        f"      POSTGRES_USER: {pg['user']}\n"
        f"      POSTGRES_PASSWORD: {pg['passwd']}\n"
        "    volumes:\n"
        "      - ./data/postgresql:/var/lib/postgresql/data\n"
        "    restart: always\n"
    )

    # MySQL 迁移：删除 mysql service 块
    if source_type == "mysql":
        content = re.sub(
            r"^  mysql:.*?(?=^  \S|\Z)",
            "",
            content,
            flags=re.MULTILINE | re.DOTALL,
        )

    # 如果还没有 postgresql service，在 services: 后插入
    if "postgresql:" not in content:
        content = re.sub(
            r"^(services:\s*\n)",
            r"\1" + pg_service + "\n",
            content,
            flags=re.MULTILINE,
        )

    # 确保 next-terminal depends_on 包含 postgresql
    def fix_depends_on(m):
        block = m.group(0)
        block = re.sub(r"\s*- mysql\b", "", block)   # 移除旧的 mysql 依赖
        if "postgresql" not in block:
            block = block.rstrip("\n") + "\n      - postgresql\n"
        return block

    content = re.sub(
        r"    depends_on:.*?(?=\n    \S|\n  \S|\Z)",
        fix_depends_on,
        content,
        flags=re.DOTALL,
    )

    with open(compose_file, "w") as f:
        f.write(content)

    ok("docker-compose 文件已更新")


def post_migrate_update(source_type: str, pg: dict):
    print()
    if not confirm("是否自动更新 config.yaml 和 docker-compose 配置文件？"):
        print()
        info("请手动将 config.yaml 中 Database 块改为：")
        print(
            f"\nDatabase:\n"
            f"  Enabled: true\n"
            f"  Type: postgres\n"
            f"  Postgres:\n"
            f"    Hostname: {pg['config_host']}\n"
            f"    Port: {pg['port']}\n"
            f"    Username: {pg['user']}\n"
            f"    Password: {pg['passwd']}\n"
            f"    Database: {pg['db']}\n"
            f"  ShowSql: false\n"
        )
        return

    print()
    config_file  = ask("config.yaml 路径", "./config.yaml")
    compose_file = ask("docker-compose 文件路径", "./docker-compose.yml")

    update_config_yaml(config_file, pg)
    update_compose_yaml(compose_file, source_type, pg)

    print()
    warn("请重启服务使配置生效：")
    warn("  docker compose down && docker compose up -d")

# ── 迁移流程 ──────────────────────────────────────────────────────────────────

def migrate_sqlite():
    print()
    info("=== SQLite -> PostgreSQL 迁移 ===")
    print()

    sqlite_path = ask("SQLite 数据库文件路径", "./data/next-terminal.db")
    if not os.path.isfile(sqlite_path):
        error(f"文件不存在: {sqlite_path}")
        sys.exit(1)
    ok(f"找到 SQLite 文件: {os.path.realpath(sqlite_path)}")

    # 步骤 1：启动 PG / 收集连接信息
    pg = setup_postgresql()

    # 步骤 2：迁移数据
    print()
    warn("即将执行迁移：")
    warn(f"  来源: SQLite     -> {os.path.realpath(sqlite_path)}")
    warn(f"  目标: PostgreSQL -> {pg['host']}:{pg['port']}/{pg['db']}")
    print()
    if not confirm("确认开始迁移？"):
        info("已取消")
        sys.exit(0)

    run_pgloader(f"sqlite:///{sqlite_path}", pg)

    # 步骤 3：更新配置文件
    post_migrate_update("sqlite", pg)


def migrate_mysql():
    print()
    info("=== MySQL -> PostgreSQL 迁移 ===")
    print()

    info("请输入来源 MySQL 连接信息：")
    mysql_host   = ask("主机", "127.0.0.1")
    mysql_port   = ask("端口", "3306")
    mysql_user   = ask("用户名", "next-terminal")
    mysql_passwd = ask("密码", "next-terminal", secret=True)
    mysql_db     = ask("数据库名", "next-terminal")

    # 步骤 1：启动 PG / 收集连接信息
    pg = setup_postgresql()

    # 步骤 2：迁移数据
    print()
    warn("即将执行迁移：")
    warn(f"  来源: MySQL      -> {mysql_host}:{mysql_port}/{mysql_db}")
    warn(f"  目标: PostgreSQL -> {pg['host']}:{pg['port']}/{pg['db']}")
    print()
    if not confirm("确认开始迁移？"):
        info("已取消")
        sys.exit(0)

    source_dsn = f"mysql://{mysql_user}:{mysql_passwd}@{mysql_host}:{mysql_port}/{mysql_db}"
    run_pgloader(source_dsn, pg)

    # 步骤 3：更新配置文件
    post_migrate_update("mysql", pg)

# ── 主入口 ────────────────────────────────────────────────────────────────────

def main():
    print()
    print("============================================")
    print("   Next Terminal 数据库迁移工具")
    print("   目标数据库：PostgreSQL")
    print("============================================")
    print()
    print("请选择来源数据库类型：")
    print("  1) SQLite  -> PostgreSQL")
    print("  2) MySQL   -> PostgreSQL")
    print("  q) 退出")
    print()

    choice = input("请输入选项: ").strip()

    if choice == "1":
        check_docker()
        migrate_sqlite()
    elif choice == "2":
        check_docker()
        migrate_mysql()
    elif choice.lower() == "q":
        info("已退出")
    else:
        error("无效选项，请输入 1、2 或 q")
        sys.exit(1)


if __name__ == "__main__":
    main()
