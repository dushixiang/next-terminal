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