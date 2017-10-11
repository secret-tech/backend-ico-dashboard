FROM mhart/alpine-node:8.6

RUN apk update && apk upgrade && apk add git && apk add python && apk add make && apk add g++ && sed -i 's/^tty/#tty/' /etc/inittab
VOLUME /usr/src/app
EXPOSE 3000
EXPOSE 4000
WORKDIR /usr/src/app
ENTRYPOINT ["/sbin/init"]