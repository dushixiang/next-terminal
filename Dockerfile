FROM golang:alpine as builder

ENV GO111MODULE=on

ENV GOPROXY=https://goproxy.io,direct

WORKDIR /app

COPY . .

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add gcc g++
RUN go env && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -a -ldflags '-linkmode external -extldflags "-static"' -o next_terminal main.go

FROM alpine:3.12.3

LABEL MAINTAINER="helloworld1024@foxmail.com"

WORKDIR /opt/next_terminal

COPY --from=builder /app/next_terminal ./
COPY --from=builder /app/next-terminal.yml ./
COPY --from=builder /app/web/build ./web/build

RUN touch next-terminal.db & chmod +x next_terminal

EXPOSE 8088

ENTRYPOINT ./next_terminal