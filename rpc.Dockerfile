FROM mhart/alpine-node:8.4

RUN apk update && apk upgrade && apk add git && apk add python && apk add make && apk add g++
RUN npm -g install ethereumjs-testrpc

CMD testrpc