FROM parity/parity:v1.8.3
VOLUME /passwords
ENTRYPOINT /parity/parity --no-ui --chain=ropsten --ws-origins=all --ws-interface=all
EXPOSE 8546