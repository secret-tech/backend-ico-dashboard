FROM ethereum/client-go
VOLUME /passwords
ENTRYPOINT geth --ws --wsaddr "0.0.0.0" --wsport 8546 --wsorigins="*" --testnet --cache=256 --datadir "/home/ethereum" --unlock "0xbd0cb067a75c23efb290b4e223059af8e4af4fd8" --password /passwords/testpass
EXPOSE 8546