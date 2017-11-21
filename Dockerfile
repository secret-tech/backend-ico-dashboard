FROM mhart/alpine-node:8.9.1

RUN apk update && apk upgrade && apk add git && apk add python && apk add make && apk add g++
VOLUME /usr/src/app
EXPOSE 3000
EXPOSE 4000
WORKDIR /usr/src/app
