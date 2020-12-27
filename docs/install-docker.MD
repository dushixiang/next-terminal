# docker安装

### 使用`sqlite`存储数据

```shell
docker run -d \
  -p 8088:8088 \
  --name next-terminal \
  --restart always dushixiang/next-terminal:0.0.2
```

### 使用`mysql`存储数据

```shell
docker run -d \
  -p 8088:8088 \
  -e DB=mysql \
  -e MYSQL_HOSTNAME=172.1.0.1 \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USERNAME=root \
  -e MYSQL_PASSWORD=mysql \
  -e MYSQL_DATABASE=next_terminal \
  --name next-terminal \
  --restart always dushixiang/next-terminal:0.0.2
```

### 注意事项 ⚠️
1. docker连接宿主机器上的`mysql`时连接地址不是`127.0.0.1`，请使用`ipconfig`或`ifconfig`确认宿主机器的IP。
2. 使用其他容器内部的`mysql`时请使用`--link <some-mysql-name>`，环境变量参数为`-e MYSQL_HOSTNAME=<some-mysql-name>`

## 环境变量

| 参数  | 含义  |
|---|---|
|  DB |  数据库类型，默认 `sqlite`，可选`['sqlite','mysql']` |
| SQLITE_FILE  |  `sqlite`数据库文件存放地址，默认 `'next-terminal.db'` |
| MYSQL_HOSTNAME  |  `mysql`数据库地址 |
| MYSQL_PORT  |  `mysql`数据库端口 |
| MYSQL_USERNAME  |  `mysql`数据库用户 |
| MYSQL_PASSWORD  |  `mysql`数据库密码 |
| MYSQL_DATABASE  |  `mysql`数据库名称 |
| SERVER_ADDR  |  服务器监听地址，默认`0.0.0.0:8088` |

## 其他
`next-terminal` 使用了`supervisord`来管理服务，因此相关日志在 `/var/log/supervisor/next-terminal-*.log`

程序安装目录地址为：`/usr/local/next-terminal`

录屏文件存放地址为：`/usr/local/next-terminal/recording`

远程桌面挂载地址为：`/usr/local/next-terminal/drive`