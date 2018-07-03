#!/bin/sh

set -eu

for env in $(env); do
  key=${env%=*}
  [ -n "${key#*_FILE}" ] && continue
  val=${env#*=}
  key=${key%_FILE}
  val=$(cat $val)
  export "${key}"="${val}"
done

exec "$@"
