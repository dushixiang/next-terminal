# docker安装

默认使用`docker hub`源，与Github的docker镜像仓库`ghcr.io`同步。

国内用户可以使用阿里云镜像仓库 `registry.cn-qingdao.aliyuncs.com/dushixiang/next-terminal`。

### 使用`sqlite`存储数据

最简安装

```shell
docker run -d \
  -p 8088:8088 \
  --name next-terminal \
  --restart always dushixiang/next-terminal:latest
```

将`sqlite`数据库文件及存储的录屏文件映射到宿主机器

```shell
mkdir -p "/opt/next-terminal/drive"
mkdir -p "/opt/next-terminal/recording"
touch /opt/next-terminal/next-terminal.db

docker run -d \
  -p 8088:8088 \
  -v /opt/next-terminal/drive:/usr/local/next-terminal/drive \
  -v /opt/next-terminal/recording:/usr/local/next-terminal/recording \
  -v /opt/next-terminal/next-terminal.db:/usr/local/next-terminal/next-terminal.db \
  --name next-terminal \
  --restart always dushixiang/next-terminal:latest
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
  --restart always dushixiang/next-terminal:latest
```

或者使用docker-compose构建

示例:

1. 在root目录下创建文件夹 `next-terminal`
2. 在`/root/next-terminal`文件夹下创建`docker-compose.yml`文件
   
    ```yaml
    version: '3.3'
    services:
      mysql:
        image: mysql:8.0
        environment:
          MYSQL_DATABASE: next-terminal
          MYSQL_USER: next-terminal
          MYSQL_PASSWORD: next-terminal
          MYSQL_ROOT_PASSWORD: next-terminal
        ports:
          - "3306:3306"
      next-terminal:
        image: "dushixiang/next-terminal:latest"
        environment:
          DB: "mysql"
          MYSQL_HOSTNAME: "mysql"
          MYSQL_PORT: 3306
          MYSQL_USERNAME: "next-terminal"
          MYSQL_PASSWORD: "next-terminal"
          MYSQL_DATABASE: "next-terminal"
        ports:
          - "8088:8088"
        volumes:
          - /root/next-terminal/drive:/usr/local/next-terminal/drive
          - /root/next-terminal/recording:/usr/local/next-terminal/recording
        depends_on:
          - mysql
    ```

3. 在`/root/next-terminal`文件夹下执行命令`docker-compose up`


### 注意事项 ⚠️

1. docker连接宿主机器上的`mysql`时连接地址不是`127.0.0.1`，请使用`ipconfig`或`ifconfig`确认宿主机器的IP。
2. 使用其他容器内部的`mysql`时请使用`--link <some-mysql-name>`，环境变量参数为`-e MYSQL_HOSTNAME=<some-mysql-name>`
3. 使用独立数据库的需要手动创建数据库，使用docker-compose不需要。

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