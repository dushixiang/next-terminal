FROM golang:alpine as builder

ENV GO111MODULE=on

ENV GOPROXY=https://goproxy.io,direct

WORKDIR /app

COPY . .

RUN go env && CGO_ENABLED=0 go build -o next-terminal main.go

FROM guacamole/guacd:1.2.0

LABEL MAINTAINER="helloworld1024@foxmail.com"

RUN apt-get update && apt-get -y install supervisor
RUN mkdir -p /var/log/supervisor
COPY --from=builder /app/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENV MYSQL_HOSTNAME 127.0.0.1
ENV MYSQL_PORT 3306
ENV MYSQL_USERNAME mysql
ENV MYSQL_PASSWORD mysql
ENV MYSQL_DATABASE next_terminal
ENV SERVER_PORT 8088

WORKDIR /usr/local/next-terminal

COPY --from=builder /app/next-terminal ./
COPY --from=builder /app/web/build ./web/build
COPY --from=builder /app/web/src/fonts/Menlo-Regular-1.ttf /usr/share/fonts/

RUN mkfontscale && mkfontdir && fc-cache

EXPOSE $SERVER_PORT

RUN mkdir recording && mkdir drive
ENTRYPOINT /usr/bin/supervisord