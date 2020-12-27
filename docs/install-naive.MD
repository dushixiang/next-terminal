# 原生安装

## Centos

### 安装 Apache Guacamole-Server

安装Apache Guacamole-Server依赖文件

```shell
yum install -y gcc cairo-devel libjpeg-turbo-devel libpng-devel uuid-devel freerdp-devel freerdp-plugins pango-devel libssh2-devel libtelnet-devel libvncserver-devel pulseaudio-libs-devel openssl-devel libvorbis-devel libwebp-devel
```

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
make && make install & ldconfig
```

建立软链接

```shell
ln -s /usr/local/lib/freerdp/guacsnd.so /usr/lib64/freerdp/
ln -s /usr/local/lib/freerdp/guacdr.so /usr/lib64/freerdp/
```

配置guacamole-server
```shell
cat <<EOF >> /etc/guacamole/guacd.conf
[daemon]
pid_file = /var/run/guacd.pid
log_level = info

[server]
bind_host = 127.0.0.1
bind_port = 4822
EOF
```

启动 guacamole-server
```shell
/etc/init.d/guacd start
```

### 安装 Next Terminal

