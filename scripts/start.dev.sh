#!/bin/bash

docker run \
  --network host \
  -e DB=mysql \
  -e MYSQL_HOSTNAME=0.0.0.0 \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USERNAME=next_terminal \
  -e MYSQL_PASSWORD=next_terminal \
  -e MYSQL_DATABASE=next_terminal \
  --name next-terminal \
  --restart always dushixiang/next-terminal:latest

  