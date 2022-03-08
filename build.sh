#!/bin/bash

rm -rf server/resource/build
echo "clean build history"

echo "build web..."
cd web || exit
yarn build
cp -r build ../server/resource/
echo "build web success"

echo "build api..."
cd ..
go env;CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-s -w' -o next-terminal main.go
upx next-terminal

rm -rf server/resource/build
echo "build api success"