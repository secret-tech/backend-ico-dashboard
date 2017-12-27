FROM parity/parity:v1.8.3
ENTRYPOINT /parity/parity --no-ui --ws-origins=all --ws-interface=all
EXPOSE 8546