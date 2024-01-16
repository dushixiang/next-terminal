# Next-Terminal helm charts

## Prerequisites

- Helm 3.8.0+
- Kubernetes 1.23+
- Existing NFS Share


## nfs 

next-terminal need share file between guacd and web backend server, so we use nfs.  default enable  you can disable  in `value.yaml` and set existingClaim name.
```
nfs:
  enabled: false
  existingClaim:
```


or you can set "configured" nfs server in  `value.yaml`
```
nfs:
  nfs:
    server: 192.168.88.82
    path: "/root/nfs-data"
    
```
## mysql

mysql default enabled ,change you password  for security

```
mysql:
  auth:
    rootPassword: next-terminal
    username: next-terminal
    password: next-terminal
    database: next-terminal
```

if you have  existing mysql server, modify value.yaml
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
