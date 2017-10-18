const {
  REDIS_HOST,
  REDIS_PORT,
  PORT,
  HTTPS_PORT,
  HTTPS_SERVER,
  FORCE_HTTPS,
  THROTTLER_WHITE_LIST,
  THROTTLER_INTERVAL,
  THROTTLER_MAX,
  THROTTLER_MIN_DIFF,
  AUTH_HOST,
  AUTH_PORT,
  VERIFY_HOST,
  VERIFY_PORT
} = process.env;

export default {
  app: {
    port: parseInt(PORT, 10) || 3000,
    httpsPort: parseInt(HTTPS_PORT, 10) || 4000,
    httpsServer: HTTPS_SERVER || 'disabled',
    forceHttps: FORCE_HTTPS || 'disabled'
  },
  redis: {
    port: parseInt(REDIS_PORT, 10) || 6379,
    host: REDIS_HOST || 'redis',
    prefix: 'jincor_ico_dashboard_'
  },
  throttler: {
    prefix: 'request_throttler_',
    interval: THROTTLER_INTERVAL || 1000, // time window in milliseconds
    maxInInterval: THROTTLER_MAX || 5, // max number of allowed requests from 1 IP in "interval" time window
    minDifference: THROTTLER_MIN_DIFF || 0, // optional, minimum time between 2 requests from 1 IP
    whiteList: THROTTLER_WHITE_LIST ? THROTTLER_WHITE_LIST.split(',') : [] // requests from these IPs won't be throttled
  },
  auth: {
    port: parseInt(AUTH_PORT, 10) || 3000,
    host: AUTH_HOST || 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNmMTc3Zjc5LWU3Y2MtNDY1Mi1iYzMzLWIxYjAxOTI5NWViYyIsImxvZ2luIjoidGVuYW50OnRlc3RAdGVzdC5jb20iLCJqdGkiOiJjZjE3N2Y3OS1lN2NjLTQ2NTItYmMzMy1iMWIwMTkyOTVlYmMxNTA3NzE2ODI1MTk1IiwiaWF0IjoxNTA3NzE2ODI1MTk1LCJhdWQiOiJqaW5jb3IuY29tIiwiaXNUZW5hbnQiOnRydWV9.GzXULjjqxgO-6V6OEiQqInd3X4druterXl1zi2miXSM'
  },
  verify: {
    port: parseInt(VERIFY_PORT, 10) || 3000,
    host: VERIFY_HOST || 'verify'
  },
  email: {
    domain: 'jincor.com',
    secret: 'key-176cd97e7ce70c9e75d826792669e53a',
    inviteTemplate: '%name% invites you to join Jincor ICO. Please follow this link to register: %link%'
  },
  contracts: {
    whiteList: {
      address: '0x139bb356F113590934161a553951f9D3996D1e85',
      abi: [
        {
          "constant": false,
          "inputs": [
            {
              "name": "investor",
              "type": "address"
            }
          ],
          "name": "addInvestorToWhiteList",
          "outputs": [],
          "payable": false,
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "name": "",
              "type": "address"
            }
          ],
          "payable": false,
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [
            {
              "name": "",
              "type": "address"
            }
          ],
          "name": "investorWhiteList",
          "outputs": [
            {
              "name": "allowed",
              "type": "bool"
            },
            {
              "name": "referral",
              "type": "address"
            }
          ],
          "payable": false,
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "investor",
              "type": "address"
            }
          ],
          "name": "getReferralOf",
          "outputs": [
            {
              "name": "result",
              "type": "address"
            }
          ],
          "payable": false,
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "investor",
              "type": "address"
            }
          ],
          "name": "removeInvestorFromWhiteList",
          "outputs": [],
          "payable": false,
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "investor",
              "type": "address"
            }
          ],
          "name": "isAllowed",
          "outputs": [
            {
              "name": "result",
              "type": "bool"
            }
          ],
          "payable": false,
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "investor",
              "type": "address"
            },
            {
              "name": "referral",
              "type": "address"
            }
          ],
          "name": "addInvestorToListReferral",
          "outputs": [],
          "payable": false,
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "payable": false,
          "type": "function"
        },
        {
          "inputs": [],
          "payable": false,
          "type": "constructor"
        }
      ],
      unlinkedBinary: "0x6060604052341561000f57600080fd5b5b5b60008054600160a060020a03191633600160a060020a03161790555b5b5b6104fa8061003e6000396000f3006060604052361561008b5763ffffffff7c01000000000000000000000000000000000000000000000000000000006000350416634f76a07781146100905780638da5cb5b146100b157806394642f96146100e05780639478a7c914610122578063984fba491461015d578063babcc5391461017e578063d597ab9e146101b1578063f2fde38b146101d8575b600080fd5b341561009b57600080fd5b6100af600160a060020a03600435166101f9565b005b34156100bc57600080fd5b6100c461027b565b604051600160a060020a03909116815260200160405180910390f35b34156100eb57600080fd5b6100ff600160a060020a036004351661028a565b6040519115158252600160a060020a031660208201526040908101905180910390f35b341561012d57600080fd5b6100c4600160a060020a03600435166102af565b604051600160a060020a03909116815260200160405180910390f35b341561016857600080fd5b6100af600160a060020a03600435166102d5565b005b341561018957600080fd5b61019d600160a060020a0360043516610350565b604051901515815260200160405180910390f35b34156101bc57600080fd5b6100af600160a060020a0360043581169060243516610372565b005b34156101e357600080fd5b6100af600160a060020a0360043516610476565b005b60005433600160a060020a0390811691161461021457600080fd5b600160a060020a038116158015906102455750600160a060020a03811660009081526001602052604090205460ff16155b151561025057600080fd5b600160a060020a0381166000908152600160208190526040909120805460ff191690911790555b5b50565b600054600160a060020a031681565b60016020526000908152604090205460ff8116906101009004600160a060020a031682565b600160a060020a038082166000908152600160205260409020546101009004165b919050565b60005433600160a060020a039081169116146102f057600080fd5b600160a060020a038116158015906103205750600160a060020a03811660009081526001602052604090205460ff165b151561032b57600080fd5b600160a060020a0381166000908152600160205260409020805460ff191690555b5b50565b600160a060020a03811660009081526001602052604090205460ff165b919050565b60005433600160a060020a0390811691161461038d57600080fd5b600160a060020a038216158015906103ad5750600160a060020a03811615155b80156103d65750600160a060020a03808316600090815260016020526040902054610100900416155b80156103f4575080600160a060020a031682600160a060020a031614155b80156104195750600160a060020a03821660009081526001602052604090205460ff16155b151561042457600080fd5b600160a060020a03808316600090815260016020819052604090912080549284166101000274ffffffffffffffffffffffffffffffffffffffff001960ff19909416909217929092161790555b5b5050565b60005433600160a060020a0390811691161461049157600080fd5b600160a060020a03811615610277576000805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0383161790555b5b5b505600a165627a7a723058203c12d65d20a295a278b570500d17cd04d8c0c6ea7efc34fd997900ff9d840f730029"
    },
    ico: {
      address: '0x0',
      abi: []
    }
  }
};
