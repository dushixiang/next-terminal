# Next Terminal
你的下一个终端。

## 快速了解

Next Terminal是使用Golang和React开发的一款HTML5的远程桌面网关，具有小巧、易安装、易使用、资源占用小的特点，支持RDP、SSH、VNC和Telnet协议的连接和管理。

Next Terminal基于Apache Guacamole开发，使用到了guacd服务。

目前支持的功能有：

- 授权凭证管理
- 资产管理（支持RDP、SSH、VNC、TELNET协议）
- 指令管理
- 批量执行命令
- 在线会话管理（监控、强制断开）
- 离线会话管理（查看录屏）

## 在线体验

https://next-terminal.typesafe.cn/

admin/admin

## 快速安装

### docker安装

因为程序依赖了mysql，所以在启动时需要指定mysql的连接信息。

```shell
mkdir /etc/next-terminal
mkdir /etc/next-terminal/recording
mkdir /etc/next-terminal/drive
cat <<EOF >> /etc/next-terminal/config.yaml
mysql:
  hostname: 172.17.0.1
  port: 3306
  username: root
  password: root
  database: next_terminal
server:
  addr: 0.0.0.0:8088
EOF
```
```shell
docker run -d \
  -p 8088:8088 \
  -v /etc/next-terminal/config.yaml:/etc/next-terminal/config.yaml \
  -v /etc/next-terminal/recording/:/usr/local/next-terminal/recording/ \
  -v /etc/next-terminal/drive/:/usr/local/next-terminal/drive/ \
  --name next-terminal \
  --restart always dushixiang/next-terminal:0.0.1
```

程序安装目录地址为 `/usr/local/next-terminal`

录屏文件存放目录为 `/usr/local/next-terminal/recording`

远程桌面挂载目录为 `/usr/local/next-terminal/drive`

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


## 联系方式

- 邮箱 helloworld1024@foxmail.com
  
- 微信群

  <img src="screenshot/wx1.jpg" width="200"  height="auto"/>

如果群失效，请添加微信，备注"加入next-terminal交流群"

  <img src="screenshot/wx2.jpg" width="200"  height="auto"/>