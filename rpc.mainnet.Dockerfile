FROM parity/parity:v1.8.3
VOLUME /passwords
ENTRYPOINT /parity/parity --no-ui --ws-origins=all --ws-interface=all --unlock 0x150F83DCFf1B2c7614A125461C644d0DAa07399f --password /passwords/testpass
EXPOSE 8546