FROM dushixiang/guacamole-server:1.4.0

LABEL MAINTAINER="helloworld1024@foxmail.com"

COPY ./guacd/fonts/Menlo-Regular.ttf /usr/share/fonts/
COPY ./guacd/fonts/SourceHanSansCN-Regular.otf /usr/share/fonts/

user root

RUN mkfontscale && mkfontdir && fc-cache
