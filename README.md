# Next Terminal
你的下一个终端。

## 快速了解

Next Terminal是使用Golang和React开发的一款HTML5的远程桌面网关，具有小巧、易安装、易使用、资源占用小的特点，支持RDP、SSH、VNC和Telnet协议的连接和管理。

Next Terminal基于Apache Guacamole开发，使用到了guacd服务。

## 快速安装

### docker安装

因为程序依赖了mysql，所以在启动时需要指定mysql的连接信息。

```shell
docker run -p 8088:8088 --env MYSQL_HOSTNAME=d-mysql-57  --env MYSQL_USERNAME=root --env MYSQL_PASSWORD=root --name next-terminal --link d-mysql-57 dushixiang/next-terminal:0.0.1 
```

程序安装目录地址为 `/usr/local/nt`

录屏文件存放目录为 `/usr/local/nt/recording`

远程桌面挂载目录为 `/usr/local/nt/drive`

可以通过 `-v` 参数将宿主机器的目录映射到docker中


## 相关截图

资源占用截图

![资源占用截图](./screenshot/docker_stats.png)

资产管理

![资产](./screenshot/assets.png)

rdp

![rdp](./screenshot/rdp.png)

vnc

![vnc](./screenshot/vnc.png)

ssh

![ssh](./screenshot/ssh.png)

批量执行命令

![批量执行命令](./screenshot/command.png)