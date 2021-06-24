#cd web && npm run build
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/next-terminal main.go