# K8S部署指南

## 环境准备

1、准备一个标准的Kubernetes集群。
2、创建一个storageClassName，譬如 cbs-next-terminal
3、创建一个命名空间 next-terminal

## 启动next-terminal
1、根据需要修改相关参数，譬如PV卷的大小，端口。
2、执行start.sh，如下所示：
- kubectl apply -f mysql-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl apply -f mysql-deployment.yaml  -n next-terminal
- kubectl apply -f mysql-service.yaml -n next-terminal
- kubectl apply -f guacd-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl apply -f guacd-deployment.yaml -n next-terminal
- kubectl apply -f guacd-service.yaml -n next-terminal
- kubectl apply -f next-terminal-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl apply -f next-terminal-claim1-persistentvolumeclaim.yaml -n next-terminal
- kubectl apply -f next-terminal-deployment.yaml -n next-terminal
- kubectl apply -f next-terminal-service.yaml -n next-terminal
3、在Kubernetes集群中查询service，可以增加ingress配置，进行访问。

## 销毁next-terminal
1、执行stop.sh，如下所示：
- kubectl delete -f mysql-service.yaml -n next-terminal
- kubectl delete -f mysql-deployment.yaml  -n next-terminal
- kubectl delete -f mysql-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl delete -f guacd-service.yaml -n next-terminal
- kubectl delete -f guacd-deployment.yaml -n next-terminal
- kubectl delete -f guacd-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl delete -f next-terminal-service.yaml -n next-terminal
- kubectl delete -f next-terminal-deployment.yaml -n next-terminal
- kubectl delete -f next-terminal-claim0-persistentvolumeclaim.yaml -n next-terminal
- kubectl delete -f next-terminal-claim1-persistentvolumeclaim.yaml -n next-terminal
