# 常见问题

<details>
    <summary>如何进行反向代理？</summary>

主要是反向代理websocket，示例如下
```shell
location / {
    proxy_pass http://127.0.0.1:8088/;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
}

```
</details>

<details>
    <summary>访问realvnc提示验证失败？</summary>

把加密类型修改为 Prefer On

</details>


<details>
    <summary>docker安装如何更新？</summary>

推荐使用`watchtower`自动更新

手动更新需要先拉取最新的镜像

```shell
docker pull dushixiang/next-terminal:latest
```

删除掉原来的容器
> 如果是使用sqlite方式启动的，记得备份`next-terminal.db`文件哦
```shell
docker rm <container-id> -f
```
再重新执行一次 [docker方式安装命令](install-naive.md)

</details>

<details>
    <summary>连接rdp协议的windows7或者windows server 2008直接断开？</summary>

因为freerdp的一个问题导致的，把 设置>RDP 下面的禁用字形缓存打开即可。
详情可参考 https://issues.apache.org/jira/browse/GUACAMOLE-1191

</details>

<details>
    <summary>ssh协议类型的资产连接模式有什么区别？</summary>

1. 默认：默认使用guacd模式
2. 原生：使用golang+xterm.js方式实现的webssh，传输协议是文本，操作响应更快。但目前尚未实现实时监控。
3. guacd：Apache Guacamole包装了一层的ssh协议，支持实时监控，录屏播放更加统一。但某些密钥不支持。

</details>

<details>
    <summary>系统密码忘记了怎么办？</summary>
首先需要进入程序所在目录，使用docker安装的程序目录为：/usr/local/next-terminal

执行命令 

```shell
./next-terminal --reset-password admin
```

其中 admin 为用户登录账号，成功之后会输出 

``` shell

 _______                   __    ___________                  .__              .__   
 \      \   ____ ___  ____/  |_  \__    ___/__________  _____ |__| ____ _____  |  |  
 /   |   \_/ __ \\  \/  /\   __\   |    |_/ __ \_  __ \/     \|  |/    \\__  \ |  |  
/    |    \  ___/ >    <  |  |     |    |\  ___/|  | \/  Y Y  \  |   |  \/ __ \|  |__
\____|__  /\___  >__/\_ \ |__|     |____| \___  >__|  |__|_|  /__|___|  (____  /____/
        \/     \/      \/                     \/            \/        \/     \/      v0.3.0

当前数据库模式为：mysql
Mar  5 20:00:16.923 [DEBU] 用户「admin」密码初始化为: next-terminal

```

</details>

