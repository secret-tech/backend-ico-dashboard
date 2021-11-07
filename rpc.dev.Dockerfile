FROM parity/parity:stable
ENTRYPOINT /parity/parity --no-ui --config dev --ws-origins=all --ws-interface=all
EXPOSE 8546
