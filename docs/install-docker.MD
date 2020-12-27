# docker安装

默认使用`sqlite`存储数据

```shell
docker run -d \
  -p 8088:8088 \
  --name next-terminal \
  --restart always dushixiang/next-terminal:0.0.2
```

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

程序安装目录地址为：`/usr/local/next-terminal`

录屏文件存放地址为：`/usr/local/next-terminal/recording`

远程桌面挂载地址为：`/usr/local/next-terminal/drive`