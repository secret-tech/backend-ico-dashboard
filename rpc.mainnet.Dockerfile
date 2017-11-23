FROM ethereum/client-go:stable
VOLUME /passwords
ENTRYPOINT geth --ws --wsaddr "0.0.0.0" --wsport 8546 --wsorigins="*" --cache=256 --datadir "/home/ethereum" --unlock "0x150F83DCFf1B2c7614A125461C644d0DAa07399f" --password /passwords/testpass
EXPOSE 8546