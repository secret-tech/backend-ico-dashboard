FROM ethereum/client-go
ENTRYPOINT geth --rpc --rpcaddr "0.0.0.0" --testnet --cache=1024 --datadir "/home/ethereum"