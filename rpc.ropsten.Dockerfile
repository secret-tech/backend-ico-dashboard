FROM parity/parity:v1.8.3
VOLUME /passwords
ENTRYPOINT /parity/parity --no-ui --chain="ropsten" --ws-origins="all" --ws-interface="all" --unlock "0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8" --password "/passwords/testpass"
EXPOSE 8546