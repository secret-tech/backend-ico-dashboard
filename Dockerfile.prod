FROM mhart/alpine-node:8.6

WORKDIR /usr/src/app

COPY . .
COPY custom-entrypoint.sh /usr/local/bin/custom-entrypoint.sh

RUN chmod 755 /usr/local/bin/custom-entrypoint.sh && \
    addgroup ico && \
    adduser -D -H -G ico ico && \
    mkdir -p /usr/src/app/dist && \
    cp -r src/certs dist/
RUN apk add --update --no-cache git python make g++ && \
    npm i -g yarn && \
    yarn install && \
    yarn run build && \
    yarn install --prod && \
    apk del --purge git python make g++ && \
    rm -rf ./src

EXPOSE 3000
EXPOSE 4000

USER ico

ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["npm", "run", "serve"]
