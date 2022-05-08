kubectl delete -f mysql-service.yaml -n next-terminal
kubectl delete -f mysql-deployment.yaml  -n next-terminal
kubectl delete -f mysql-claim0-persistentvolumeclaim.yaml -n next-terminal
kubectl delete -f guacd-service.yaml -n next-terminal
kubectl delete -f guacd-deployment.yaml -n next-terminal
kubectl delete -f guacd-claim0-persistentvolumeclaim.yaml -n next-terminal
kubectl delete -f next-terminal-service.yaml -n next-terminal
kubectl delete -f next-terminal-deployment.yaml -n next-terminal
kubectl delete -f next-terminal-claim0-persistentvolumeclaim.yaml -n next-terminal
kubectl delete -f next-terminal-claim1-persistentvolumeclaim.yaml -n next-terminal

