#!/bin/bash

cp build/resources/logo.png web/src/images/logo.png
cp build/resources/logo-with-name.png web/src/images/logo-with-name.png
cp build/resources/favicon.ico web/public/favicon.ico

rm -rf server/resource/build
echo "clean build history"

echo "build web..."
cd web
npm run build
