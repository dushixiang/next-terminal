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