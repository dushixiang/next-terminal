# Next-Terminal helm charts

## 版本要求

- Helm 3.8.0+
- Kubernetes 1.23+
- Existing NFS Share
--- 
[ENGLISH](https://github.com/dushixiang/next-terminal/blob/add-helm-charts/deploy/charts/README_en.md)

## 默认安装组件
- [nfs-subdir-external-provisioner](https://artifacthub.io/packages/helm/nfs-subdir-external-provisioner/nfs-subdir-external-provisioner/4.0.18)
- [mysql](https://artifacthub.io/packages/helm/bitnami/mysql/9.17.0)

## nfs 

当前版本(1.3.9) next-terminal 需要guacd 和web 后端之间共享目录，所以使用了nfs pvc 来实现pod 间文件共享， 你也可以使用已有的支持ReadWriteMany 的StorageClass 来替换，需要修改`value.yaml` 里的下列内容
```
nfs:
  enabled: false
  existingClaim:
```


如果启用NFS，请修改 `value.yaml` 的地址和目录
``` yaml
nfs:
  nfs:
    server: 192.168.88.82 
    path: "/root/nfs-data"
    
```
## mysql
next-terminal on kubernetes 不建议使用（也不支持）使用SQLite作为后端数据库， 我们更推荐使用MySQL来作为后端存储数据库
安全起见，安装时请修改`value.yaml` 中的认证信息
```
mysql:
  auth:
    rootPassword: next-terminal
    username: next-terminal
    password: next-terminal
    database: next-terminal
```
如果你已经有一个Mysql 可以修改`value.yaml` 里的这些信息来修改默认的mysql 连接
```
mysql:
  enabled: false
  existing:
    auth:
      username: existing-next-terminal
      password: existing-next-terminal
      database: existing-next-terminal
      host: "existing.test.mysql"
      ports: 3306
```

## 安装

```
helm install my-release -f value.yaml  ./
```
## 配置
更多配置参见 value.yaml

## 已知问题
next-terminal 后端自身有一些local cache 所以多示例的情况下会有问题，暂时只支持一个副本。
<!-- | Parameter                            | Description                                                                                           | Default                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `replicaCount`                       | Number of provisioner instances to deployed                                                           | `1`                                                           | -->
