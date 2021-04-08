# 原生安装

## 安装 Apache Guacamole-Server

### Centos 安装Apache Guacamole-Server依赖文件

```shell
yum install -y gcc cairo-devel libjpeg-turbo-devel libpng-devel uuid-devel freerdp-devel pango-devel libssh2-devel libtelnet-devel libvncserver-devel pulseaudio-libs-devel openssl-devel libvorbis-devel libwebp-devel libwebsockets-devel libtool
```

### Ubuntu 安装Apache Guacamole-Server依赖文件
```shell
sudo apt-get install libcairo2-dev libjpeg-turbo8-dev libpng12-dev libtool-bin libossp-uuid-dev freerdp2-dev libpango1.0-dev libssh2-1-dev 	libtelnet-dev libvncserver-dev libwebsockets-dev libpulse-dev libssl-dev libvorbis-dev libwebp-dev
```

### Debian 安装Apache Guacamole-Server依赖文件
```shell
sudo apt-get install libcairo2-dev libjpeg62-turbo-dev libpng-dev libtool-bin libossp-uuid-dev freerdp2-dev libpango1.0-dev libssh2-1-dev libtelnet-dev libvncserver-dev libwebsockets-dev libpulse-dev libssl-dev libvorbis-dev libwebp-dev
```

如有疑问可参考 [Guacamole官方安装文档](!https://guacamole.apache.org/doc/gug/installing-guacamole.html)

下载&解压&configure
```shell
wget https://mirror.bit.edu.cn/apache/guacamole/1.2.0/source/guacamole-server-1.2.0.tar.gz
tar -xzf guacamole-server-1.2.0.tar.gz
cd guacamole-server-1.2.0
./configure --with-init-dir=/etc/init.d
```

如果安装的依赖文件没有缺失的话，会看到`RDP` `SSH` `VNC` 都是 `yes`

```shell
------------------------------------------------
guacamole-server version 1.2.0
------------------------------------------------

   Library status:

     freerdp2 ............ yes
     pango ............... yes
     libavcodec .......... no
     libavformat.......... no
     libavutil ........... no
     libssh2 ............. yes
     libssl .............. yes
     libswscale .......... no
     libtelnet ........... yes
     libVNCServer ........ yes
     libvorbis ........... yes
     libpulse ............ yes
     libwebsockets ....... no
     libwebp ............. yes
     wsock32 ............. no

   Protocol support:

      Kubernetes .... no
      RDP ........... yes
      SSH ........... yes
      Telnet ........ yes
      VNC ........... yes

   Services / tools:

      guacd ...... yes
      guacenc .... no
      guaclog .... yes

   FreeRDP plugins: /usr/lib64/freerdp2
   Init scripts: /etc/init.d
   Systemd units: no

Type "make" to compile guacamole-server.

```

编译和安装

```shell
make && make install && ldconfig
```

配置guacamole-server
```shell
mkdir /etc/guacamole/ && cat <<EOF >> /etc/guacamole/guacd.conf
[daemon]
pid_file = /var/run/guacd.pid
log_level = info

[server]
bind_host = 0.0.0.0
bind_port = 4822
EOF
```

启动 guacamole-server
```shell
/etc/init.d/guacd start
```

### 安装字体（SSH使用）

安装字体管理软件
```shell
yum install -y fontconfig mkfontscale
```

下载字体文件并移动到` /usr/share/fonts/`目录下
```shell
cd  /usr/share/fonts/
wget https://raw.githubusercontent.com/dushixiang/next-terminal/master/web/src/fonts/Menlo-Regular-1.ttf
```

更新字体
```shell
mkfontscale
mkfontdir
fc-cache
```
### 安装 Next Terminal
> 示例步骤安装在 `/usr/local/next-terminal`，你可以自由选择安装目录。

下载
```shell
wget https://github.com/dushixiang/next-terminal/releases/latest/download/next-terminal.tgz
```

解压
```shell
tar -zxvf next-terminal.tgz -C /usr/local/
```

在`/usr/local/next-terminal`或`/etc/next-terminal`下创建或修改配置文件`config.yml`
```shell
db: sqlite
# 当db为sqlite时mysql的配置无效
#mysql:
#  hostname: 172.16.101.32
#  port: 3306
#  username: root
#  password: mysql
#  database: next-terminal

# 当db为mysql时sqlite的配置无效
sqlite:
  file: 'next-terminal.db'
server:
  addr: 0.0.0.0:8088
# 当设置下面两个参数时会自动开启https模式
#  cert: /root/next-terminal/cert.pem
#  key: /root/next-terminal/key.pem
```

启动
```shell
./next-terminal
```

使用systemd方式启动

在 `/etc/systemd/system/` 目录创建文件并写入以下内容
```shell
[Unit]
Description=next-terminal service
After=network.target

[Service]
User=root
WorkingDirectory=/usr/local/next-terminal
ExecStart=/usr/local/next-terminal/next-terminal
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

重载系统服务&&设置开机启动&&启动服务
```shell
systemctl daemon-reload
systemctl enable next-terminal
systemctl start next-terminal
```