#!/bin/bash

set -ex

if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
    IMAGE_NAME="jincort/backend-ico-dashboard"
    TAG="${1}"
    docker build -t ${IMAGE_NAME}:${TAG} -f Dockerfile.prod .
    docker login -u $DOCKER_USER -p $DOCKER_PASS
    docker push ${IMAGE_NAME}:${TAG}
fi

exit 0;