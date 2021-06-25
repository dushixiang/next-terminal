cd web
npm run build
rm -rf ../bin/web/build
mkdir -p ../bin/web/build
cp -r build ../bin/web/
cd ..
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/next-terminal main.go