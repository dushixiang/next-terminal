FROM guacamole/guacd:1.3.0

LABEL MAINTAINER="helloworld1024@foxmail.com"

COPY ./fonts/Menlo-Regular.ttf /usr/share/fonts/
COPY ./fonts/SourceHanSansCN-Regular.otf /usr/share/fonts/

RUN mkfontscale && mkfontdir && fc-cache