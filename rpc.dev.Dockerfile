FROM parity/parity:v1.8.3
ENTRYPOINT /parity/parity --no-ui --config dev --ws-origins=all --ws-interface=all
EXPOSE 8546