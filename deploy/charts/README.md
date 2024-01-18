# Next-Terminal helm charts

## 版本要求

- Helm 3.8.0+
- Kubernetes 1.23+
- Existing NFS Share
--- 
[ENGLISH](https://github.com/dushixiang/next-terminal/blob/add-helm-charts/deploy/charts/README_en.md)

[source](https://github.com/NeverTeaser/next-terminal-charts)

## 默认安装组件
- [nfs-subdir-external-provisioner](https://artifacthub.io/packages/helm/nfs-subdir-external-provisioner/nfs-subdir-external-provisioner/4.0.18)
- [mysql](https://artifacthub.io/packages/helm/bitnami/mysql/9.17.0)


## 安装
```
helm repo add next-terminal https://1mtrue.com/next-terminal-charts/
helm install my-next-terminal next-terminal/next-terminal --version 0.1.0
```
## nfs 

当前版本(1.3.9) next-terminal 需要guacd 和web 后端之间共享目录，所以使用了nfs pvc 来实现pod 间文件共享， 你也可以使用已有的支持ReadWriteMany 的PVC 来替换，需要修改`value.yaml` 里的下列内容
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

next-terminal on Kubernetes 不建议使用（也不支持）使用SQLite作为后端数据库， 我们更推荐使用MySQL来作为后端存储数据库
安全起见，安装时请修改`value.yaml` 中的认证信息
```
mysql:
  auth:
    rootPassword: next-terminal
    username: next-terminal
    password: next-terminal
    database: next-terminal
```
如果想用一个已有MySQL 作为后端存储，可以修改`value.yaml`  里的这些配置来使用已有的MySQL
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

## 本地安装

```
helm install my-release -f value.yaml  ./
```
## 配置

更多配置参见 value.yaml

## 已知问题

- next-terminal 后端自身有一些local cache 所以多实例的情况下会出现数据错乱，暂时只支持一个副本。
- 当前版本不提供Ingress 如果需要提供稳定的对外服务， 请自行配置Ingress 

## 感谢

- [bitnami-common](https://github.com/bitnami/charts)
- [nfs-subdir-external-provisioner](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/tree/master)

<!-- | Parameter                            | Description                                                                                           | Default                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `replicaCount`                       | Number of provisioner instances to deployed                                                           | `1`                                                           | -->
