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
import difflib

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

DEFAULT_POSTGRES_IMAGE = "postgres:16.4"
CN_POSTGRES_IMAGE = "registry.cn-beijing.aliyuncs.com/dushixiang/postgres:16.4"
DEFAULT_PGLOADER_IMAGE = "ghcr.io/limetric/pgloader:latest"
CN_PGLOADER_IMAGE = "docker.typeaudit.com/ghcr.io/limetric/pgloader:latest"

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


def choose_docker_images() -> dict:
    print()
    if confirm("机器是否位于中国大陆？（是则使用国内镜像地址）"):
        images = {
            "postgres": CN_POSTGRES_IMAGE,
            "pgloader": CN_PGLOADER_IMAGE,
        }
        info("已选择中国大陆镜像源")
    else:
        images = {
            "postgres": DEFAULT_POSTGRES_IMAGE,
            "pgloader": DEFAULT_PGLOADER_IMAGE,
        }
        info("已选择默认镜像源")

    info(f"PostgreSQL 镜像: {images['postgres']}")
    info(f"pgloader 镜像: {images['pgloader']}")
    return images


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def normalize_compose_project_name(name: str) -> str:
    normalized = re.sub(r"[^a-z0-9_-]", "", name.lower())
    return normalized if normalized else name


def extract_compose_project_name(compose_file: str, content: str) -> str:
    env_name = os.environ.get("COMPOSE_PROJECT_NAME", "").strip()
    if env_name:
        return normalize_compose_project_name(unquote(env_name))

    name_match = re.search(r"(?m)^name:\s*(.+?)\s*$", content)
    if name_match:
        return normalize_compose_project_name(unquote(name_match.group(1)))

    base = os.path.basename(os.path.dirname(os.path.realpath(compose_file)))
    if base:
        return normalize_compose_project_name(base)
    return ""


def extract_service_block(content: str, service_name: str) -> str:
    pattern = r"(?ms)^  " + re.escape(service_name) + r":\s*\n(.*?)(?=^  \S|\Z)"
    m = re.search(pattern, content)
    return m.group(1) if m else ""


def extract_first_service_network_key(service_block: str) -> str:
    networks_match = re.search(r"(?ms)^    networks:\s*\n(.*?)(?=^    \S|^  \S|\Z)", service_block)
    if not networks_match:
        return ""

    for raw_line in networks_match.group(1).splitlines():
        line = raw_line.strip()
        if not line:
            continue

        list_item = re.match(r"^-\s*(\S+)\s*$", line)
        if list_item:
            return unquote(list_item.group(1))

        map_item = re.match(r"^([A-Za-z0-9_.-]+)\s*:\s*$", line)
        if map_item:
            return unquote(map_item.group(1))

    return ""


def extract_custom_network_name(content: str, network_key: str) -> str:
    networks_match = re.search(r"(?ms)^networks:\s*\n(.*?)(?=^\S|\Z)", content)
    if not networks_match:
        return ""

    networks_block = networks_match.group(1)
    pattern = r"(?ms)^  " + re.escape(network_key) + r":\s*\n(.*?)(?=^  \S|\Z)"
    network_match = re.search(pattern, networks_block)
    if not network_match:
        return ""

    network_block = network_match.group(1)
    name_match = re.search(r"(?m)^    name:\s*(.+?)\s*$", network_block)
    return unquote(name_match.group(1)) if name_match else ""


def guess_mysql_network_from_compose(compose_file: str) -> str:
    if not os.path.isfile(compose_file):
        warn(f"compose 文件不存在，无法推断网络名: {compose_file}")
        return ""

    with open(compose_file) as f:
        content = f.read()

    project_name = extract_compose_project_name(compose_file, content)
    mysql_service = extract_service_block(content, "mysql")
    network_key = extract_first_service_network_key(mysql_service) if mysql_service else ""

    if not network_key:
        return f"{project_name}_default" if project_name else ""

    custom_network_name = extract_custom_network_name(content, network_key)
    if custom_network_name:
        return custom_network_name

    if network_key == "default":
        return f"{project_name}_default" if project_name else "default"

    return f"{project_name}_{network_key}" if project_name else network_key


def list_docker_networks():
    result = subprocess.run(
        ["docker", "network", "ls", "--format", "{{.Name}}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        warn("无法获取 Docker 网络列表，将跳过网络名校验")
        return []

    output = result.stdout.decode("utf-8", errors="ignore")
    return [line.strip() for line in output.splitlines() if line.strip()]


def ask_and_validate_docker_network(default_network: str) -> str:
    available_networks = list_docker_networks()
    network = ask("MySQL 所在 Docker 网络名", default_network)

    if not available_networks:
        return network
    if network in available_networks:
        return network

    warn(f"未找到 Docker 网络: {network}")
    suggestions = difflib.get_close_matches(network, available_networks, n=5, cutoff=0.3)
    if suggestions:
        warn("可能的网络名: " + ", ".join(suggestions))

    if confirm("是否显示可用网络并重新输入？"):
        print()
        info("当前可用 Docker 网络：")
        for name in available_networks:
            print(f"  - {name}")
        print()
        fallback = suggestions[0] if suggestions else default_network
        network = ask("MySQL 所在 Docker 网络名", fallback)

    if network not in available_networks:
        warn(f"网络 {network} 仍不在可用列表中，继续执行可能导致连接失败")

    return network


def parse_mysql_defaults_from_compose(compose_file: str) -> dict:
    if not os.path.isfile(compose_file):
        warn(f"compose 文件不存在，跳过自动解析: {compose_file}")
        return {}

    with open(compose_file) as f:
        content = f.read()

    service_match = re.search(r"(?ms)^  mysql:\s*\n(.*?)(?=^  \S|\Z)", content)
    if not service_match:
        warn("compose 中未找到 mysql service，跳过自动解析")
        return {}

    block = service_match.group(1)
    defaults = {
        "host": "mysql",
        "port": "3306",
        "user": "next-terminal",
        "passwd": "next-terminal",
        "db": "next-terminal",
    }

    container_name_match = re.search(r"(?m)^    container_name:\s*(.+?)\s*$", block)
    if container_name_match:
        defaults["host"] = unquote(container_name_match.group(1))

    env_match = re.search(r"(?ms)^    environment:\s*\n(.*?)(?=^    \S|^  \S|\Z)", block)
    if env_match:
        for raw_line in env_match.group(1).splitlines():
            line = raw_line.strip()
            kv_match = re.match(r"^([A-Z0-9_]+)\s*:\s*(.+)$", line)
            if kv_match:
                key = kv_match.group(1)
                value = unquote(kv_match.group(2))
            else:
                list_match = re.match(r"^-\s*([A-Z0-9_]+)=(.+)$", line)
                if not list_match:
                    continue
                key = list_match.group(1)
                value = unquote(list_match.group(2))

            if key == "MYSQL_DATABASE":
                defaults["db"] = value
            elif key == "MYSQL_USER":
                defaults["user"] = value
            elif key == "MYSQL_PASSWORD":
                defaults["passwd"] = value
            elif key == "MYSQL_ROOT_PASSWORD" and defaults["user"] == "next-terminal":
                defaults["user"] = "root"
                defaults["passwd"] = value

    ports_match = re.search(r"(?ms)^    ports:\s*\n(.*?)(?=^    \S|^  \S|\Z)", block)
    if ports_match:
        for raw_line in ports_match.group(1).splitlines():
            line = unquote(raw_line.strip())
            if not line.startswith("-"):
                continue
            port_expr = line[1:].strip()
            if not port_expr:
                continue
            port_expr = port_expr.split("/")[0]
            parts = port_expr.split(":")
            if len(parts) >= 2 and parts[-1] == "3306":
                defaults["port"] = parts[-2]
                break

    ok("已从 compose 解析到 MySQL 默认连接参数")
    return defaults

# ── Docker 检查 ───────────────────────────────────────────────────────────────

def check_docker():
    if not shutil.which("docker"):
        error("未检测到 Docker，请先安装 Docker 后再运行此脚本。")
        sys.exit(1)
    result = subprocess.run(
        ["docker", "info"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        error("Docker 未运行，请启动 Docker 后再运行此脚本。")
        sys.exit(1)
    ok("Docker 检测通过")

# ── 第一步：启动 PostgreSQL ───────────────────────────────────────────────────

def setup_postgresql(images: dict, docker_network: str = "host") -> dict:
    """
    询问是否自动启动 PostgreSQL 容器：
    - 是：使用默认连接配置，由脚本拉起容器，用户只需确认数据目录
    - 否：由用户手动输入已有 PostgreSQL 的连接信息
    返回 pg 连接信息字典。
    """
    print()
    if confirm("是否由脚本自动启动一个 PostgreSQL 容器？（已有运行中的 PG 可选 N）"):
        pg_host = "127.0.0.1" if docker_network == "host" else "postgresql"
        pg = {
            "host":        pg_host,       # pgloader 连接地址
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
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        info(f"正在启动 PostgreSQL 容器，数据目录: {data_dir_abs}")
        run_cmd = [
            "docker", "run", "-d",
            "--name", container_name,
            "-v", f"{data_dir_abs}:/var/lib/postgresql/data",
            "-e", f"POSTGRES_DB={pg['db']}",
            "-e", f"POSTGRES_USER={pg['user']}",
            "-e", f"POSTGRES_PASSWORD={pg['passwd']}",
        ]
        if docker_network == "host":
            run_cmd += ["--network", "host"]
        else:
            run_cmd += ["--network", docker_network, "--network-alias", "postgresql"]
        run_cmd += [images["postgres"]]

        subprocess.run(run_cmd, check=True)

        info("等待 PostgreSQL 就绪...")
        for _ in range(30):
            result = subprocess.run(
                ["docker", "exec", container_name, "pg_isready", "-U", pg["user"]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
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
        default_host = "127.0.0.1" if docker_network == "host" else "postgresql"
        host = ask("主机", default_host)
        return {
            "host":        host,
            "config_host": host,  # 手动模式下连接地址与配置地址相同
            "port":   ask("端口",    "5432"),
            "user":   ask("用户名",  "next-terminal"),
            "passwd": ask("密码",    "next-terminal", secret=True),
            "db":     ask("数据库名","next-terminal"),
        }

# ── 第二步：执行数据迁移 ──────────────────────────────────────────────────────

def run_pgloader(source_dsn: str, pg: dict, images: dict, docker_network: str = "host"):
    target_dsn = f"pgsql://{pg['user']}:{pg['passwd']}@{pg['host']}:{pg['port']}/{pg['db']}"
    info("开始迁移数据，请稍候...")

    cmd = [
        "docker", "run", "--rm",
        "--network", docker_network,
    ]

    # SQLite 需要挂载文件
    if source_dsn.startswith("sqlite://"):
        db_path = source_dsn[len("sqlite:///"):]
        abs_path = os.path.realpath(db_path)
        cmd += ["-v", f"{abs_path}:/db/nt.db"]
        source_dsn = "sqlite:///db/nt.db"

    cmd += [
        images["pgloader"],
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


def update_compose_yaml(compose_file: str, source_type: str, pg: dict, images: dict):
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
        f"    image: {images['postgres']}\n"
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


def post_migrate_update(source_type: str, pg: dict, images: dict):
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
    compose_file = ask("docker-compose 文件路径", "./docker-compose.yaml")

    update_config_yaml(config_file, pg)
    update_compose_yaml(compose_file, source_type, pg, images)

    print()
    warn("请重启服务使配置生效：")
    warn("  docker compose down && docker compose up -d")

# ── 迁移流程 ──────────────────────────────────────────────────────────────────

def migrate_sqlite(images: dict):
    print()
    info("=== SQLite -> PostgreSQL 迁移 ===")
    print()

    sqlite_path = ask("SQLite 数据库文件路径", "./data/next-terminal.db")
    if not os.path.isfile(sqlite_path):
        error(f"文件不存在: {sqlite_path}")
        sys.exit(1)
    ok(f"找到 SQLite 文件: {os.path.realpath(sqlite_path)}")

    # 步骤 1：启动 PG / 收集连接信息
    docker_network = "host"
    pg = setup_postgresql(images, docker_network=docker_network)

    # 步骤 2：迁移数据
    print()
    warn("即将执行迁移：")
    warn(f"  来源: SQLite     -> {os.path.realpath(sqlite_path)}")
    warn(f"  目标: PostgreSQL -> {pg['host']}:{pg['port']}/{pg['db']}")
    print()
    if not confirm("确认开始迁移？"):
        info("已取消")
        sys.exit(0)

    run_pgloader(f"sqlite:///{sqlite_path}", pg, images, docker_network=docker_network)

    # 步骤 3：更新配置文件
    post_migrate_update("sqlite", pg, images)


def migrate_mysql(images: dict):
    print()
    info("=== MySQL -> PostgreSQL 迁移 ===")
    print()

    use_docker_network = confirm("来源 MySQL 是否在 Docker 网络内（未暴露端口）？")
    mysql_network = "host"
    mysql_host_default = "127.0.0.1"
    mysql_port_default = "3306"
    mysql_user_default = "next-terminal"
    mysql_passwd_default = "next-terminal"
    mysql_db_default = "next-terminal"
    if use_docker_network:
        mysql_host_default = "mysql"
        mysql_network = "next-terminal_default"
        if confirm("是否从旧 docker-compose 文件自动推断网络名并读取 MySQL 连接参数？"):
            compose_file = ask("旧 docker-compose 文件路径", "./docker-compose.yaml")
            guessed_network = guess_mysql_network_from_compose(compose_file)
            if guessed_network:
                mysql_network = guessed_network
                info(f"已推断 Docker 网络: {mysql_network}")
            mysql_defaults = parse_mysql_defaults_from_compose(compose_file)
            if mysql_defaults:
                mysql_host_default = mysql_defaults["host"]
                mysql_port_default = mysql_defaults["port"]
                mysql_user_default = mysql_defaults["user"]
                mysql_passwd_default = mysql_defaults["passwd"]
                mysql_db_default = mysql_defaults["db"]
        mysql_network = ask_and_validate_docker_network(mysql_network)
        info(f"将使用 Docker 网络: {mysql_network}")

    info("请输入来源 MySQL 连接信息：")
    mysql_host   = ask("主机", mysql_host_default)
    mysql_port   = ask("端口", mysql_port_default)
    mysql_user   = ask("用户名", mysql_user_default)
    mysql_passwd = ask("密码", mysql_passwd_default, secret=True)
    mysql_db     = ask("数据库名", mysql_db_default)

    # 步骤 1：启动 PG / 收集连接信息
    pg = setup_postgresql(images, docker_network=mysql_network)

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
    run_pgloader(source_dsn, pg, images, docker_network=mysql_network)

    # 步骤 3：更新配置文件
    post_migrate_update("mysql", pg, images)

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
        images = choose_docker_images()
        migrate_sqlite(images)
    elif choice == "2":
        check_docker()
        images = choose_docker_images()
        migrate_mysql(images)
    elif choice.lower() == "q":
        info("已退出")
    else:
        error("无效选项，请输入 1、2 或 q")
        sys.exit(1)


if __name__ == "__main__":
    main()
