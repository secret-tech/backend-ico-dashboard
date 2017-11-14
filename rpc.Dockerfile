FROM ethereum/client-go
VOLUME /passwords
ENTRYPOINT geth --rpc --rpcaddr "0.0.0.0" --testnet --cache=256 --datadir "/home/ethereum" --unlock "0xbd0cb067a75c23efb290b4e223059af8e4af4fd8" --password /passwords/testpass