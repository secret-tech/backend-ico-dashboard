require('dotenv').config();
import 'reflect-metadata';

const {
  REDIS_URL,
  PORT,
  HTTPS_PORT,
  HTTPS_SERVER,
  FORCE_HTTPS,
  THROTTLER_WHITE_LIST,
  THROTTLER_INTERVAL,
  THROTTLER_MAX,
  THROTTLER_MIN_DIFF,
  ORM_ENTITIES_DIR,
  ORM_SUBSCRIBER_DIR,
  ORM_MIGRATIONS_DIR,
  API_URL,
  FRONTEND_URL,
  AUTH_JWT,
  AUTH_BASE_URL,
  VERIFY_BASE_URL,
  MONGO_URL,
  ICO_SC_ADDRESS,
  WHITELIST_SC_ADDRESS,
  JCR_TOKEN_ADDRESS,
  RPC_TYPE,
  RPC_ADDRESS,
  ACCESS_LOG,
  MAILJET_API_KEY,
  MAILJET_API_SECRET,
  WEB3_RESTORE_START_BLOCK
} = process.env;

export default {
  app: {
    port: parseInt(PORT, 10) || 3000,
    httpsPort: parseInt(HTTPS_PORT, 10) || 4000,
    httpsServer: HTTPS_SERVER || 'disabled',
    forceHttps: FORCE_HTTPS || 'disabled',
    apiUrl: API_URL,
    frontendUrl: FRONTEND_URL,
    accessLog: ACCESS_LOG
  },
  web3: {
    startBlock: WEB3_RESTORE_START_BLOCK || 1
  },
  redis: {
    url: REDIS_URL || 'redis://redis:6379',
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
    baseUrl: AUTH_BASE_URL || 'http://auth:3000',
    token: AUTH_JWT
  },
  verify: {
    baseUrl: VERIFY_BASE_URL || 'http://verify:3000'
  },
  email: {
    domain: 'jincor.com',
    mailgun: {
      secret: 'key-176cd97e7ce70c9e75d826792669e53a'
    },
    mailjet: {
      apiKey: MAILJET_API_KEY,
      apiSecret: MAILJET_API_SECRET
    },
    from: {
      general: 'noreply@jincor.com',
      referral: 'partners@jincor.com'
    }
  },
  contracts: {
    // old ropsten whitelist: 0x94c4b2ee76ff421cdae95a9affeea7c80d4334e8
    whiteList: {
      address: WHITELIST_SC_ADDRESS,
      abi: [{'constant': false,'inputs': [{'name': 'investor','type': 'address'}],'name': 'addInvestorToWhiteList','outputs': [],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'owner','outputs': [{'name': '','type': 'address'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': '','type': 'address'}],'name': 'referralList','outputs': [{'name': '','type': 'address'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': '','type': 'address'}],'name': 'investorWhiteList','outputs': [{'name': '','type': 'bool'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': 'investor','type': 'address'}],'name': 'getReferralOf','outputs': [{'name': 'result','type': 'address'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': 'investor','type': 'address'}],'name': 'removeInvestorFromWhiteList','outputs': [],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': 'investor','type': 'address'},{'name': 'referral','type': 'address'}],'name': 'addReferralOf','outputs': [],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': 'investor','type': 'address'}],'name': 'isAllowed','outputs': [{'name': 'result','type': 'bool'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': 'newOwner','type': 'address'}],'name': 'transferOwnership','outputs': [],'payable': false,'type': 'function'},{'inputs': [],'payable': false,'type': 'constructor'}]
    },
    // old ropsten ico: 0xfd7345eaa260ec6259223ca996abac70a7cc8ac3
    ico: {
      address: ICO_SC_ADDRESS,
      abi: [{'constant': true,'inputs': [],'name': 'name','outputs': [{'name': '','type': 'string'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'endBlock','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'softCapReached','outputs': [{'name': '','type': 'bool'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'jcrUsdRate','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'btcUsdRate','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'beneficiary','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'ethUsdRate','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [{'name': 'btcUsdPrice','type': 'uint256'}],'name': 'receiveBtcPrice','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': false,'inputs': [],'name': 'withdraw','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'startBlock','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'tokensSold','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [],'name': 'refund','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'weiRefunded','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [],'name': 'halt','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': false,'inputs': [{'name': 'provider','type': 'address'}],'name': 'setBtcPriceProvider','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'collected','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'owner','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'softCap','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [{'name': 'ethUsdPrice','type': 'uint256'}],'name': 'receiveEthPrice','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'halted','outputs': [{'name': '','type': 'bool'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'btcPriceProvider','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [{'name': '','type': 'address'}],'name': 'deposited','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [],'name': 'unhalt','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': false,'inputs': [{'name': 'newWhiteList','type': 'address'}],'name': 'setNewWhiteList','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'investorWhiteList','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'ethPriceProvider','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [{'name': 'provider','type': 'address'}],'name': 'setEthPriceProvider','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'preSaleAddress','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'crowdsaleFinished','outputs': [{'name': '','type': 'bool'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': false,'inputs': [{'name': 'newOwner','type': 'address'}],'name': 'transferOwnership','outputs': [],'payable': false,'stateMutability': 'nonpayable','type': 'function'},{'constant': true,'inputs': [],'name': 'hardCap','outputs': [{'name': '','type': 'uint256'}],'payable': false,'stateMutability': 'view','type': 'function'},{'constant': true,'inputs': [],'name': 'token','outputs': [{'name': '','type': 'address'}],'payable': false,'stateMutability': 'view','type': 'function'},{'inputs': [{'name': '_hardCapJCR','type': 'uint256'},{'name': '_softCapJCR','type': 'uint256'},{'name': '_token','type': 'address'},{'name': '_beneficiary','type': 'address'},{'name': '_investorWhiteList','type': 'address'},{'name': '_baseEthUsdPrice','type': 'uint256'},{'name': '_baseBtcUsdPrice','type': 'uint256'},{'name': '_startBlock','type': 'uint256'},{'name': '_endBlock','type': 'uint256'}],'payable': false,'stateMutability': 'nonpayable','type': 'constructor'},{'payable': true,'stateMutability': 'payable','type': 'fallback'},{'anonymous': false,'inputs': [{'indexed': false,'name': 'softCap','type': 'uint256'}],'name': 'SoftCapReached','type': 'event'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'holder','type': 'address'},{'indexed': false,'name': 'tokenAmount','type': 'uint256'},{'indexed': false,'name': 'etherAmount','type': 'uint256'}],'name': 'NewContribution','type': 'event'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'investor','type': 'address'},{'indexed': true,'name': 'referral','type': 'address'},{'indexed': false,'name': 'tokenAmount','type': 'uint256'}],'name': 'NewReferralTransfer','type': 'event'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'holder','type': 'address'},{'indexed': false,'name': 'amount','type': 'uint256'}],'name': 'Refunded','type': 'event'}]
    },
    jcrToken: {
      address: JCR_TOKEN_ADDRESS,
      abi: [{'constant': false,'inputs': [{'name': 'addr','type': 'address'},{'name': 'state','type': 'bool'}],'name': 'setTransferAgent','outputs': [],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'name','outputs': [{'name': '','type': 'string'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': '_spender','type': 'address'},{'name': '_value','type': 'uint256'}],'name': 'approve','outputs': [{'name': '','type': 'bool'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'totalSupply','outputs': [{'name': '','type': 'uint256'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': '_from','type': 'address'},{'name': '_to','type': 'address'},{'name': '_value','type': 'uint256'}],'name': 'transferFrom','outputs': [{'name': 'success','type': 'bool'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': 'addr','type': 'address'}],'name': 'setReleaseAgent','outputs': [],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'INITIAL_SUPPLY','outputs': [{'name': '','type': 'uint256'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'decimals','outputs': [{'name': '','type': 'uint8'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': '_value','type': 'uint256'}],'name': 'burn','outputs': [{'name': 'success','type': 'bool'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': '_owner','type': 'address'}],'name': 'balanceOf','outputs': [{'name': 'balance','type': 'uint256'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': '_from','type': 'address'},{'name': '_value','type': 'uint256'}],'name': 'burnFrom','outputs': [{'name': 'success','type': 'bool'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': '','type': 'address'}],'name': 'transferAgents','outputs': [{'name': '','type': 'bool'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [],'name': 'release','outputs': [],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'owner','outputs': [{'name': '','type': 'address'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'symbol','outputs': [{'name': '','type': 'string'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'released','outputs': [{'name': '','type': 'bool'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': '_to','type': 'address'},{'name': '_value','type': 'uint256'}],'name': 'transfer','outputs': [{'name': 'success','type': 'bool'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [],'name': 'releaseAgent','outputs': [{'name': '','type': 'address'}],'payable': false,'type': 'function'},{'constant': true,'inputs': [{'name': '_owner','type': 'address'},{'name': '_spender','type': 'address'}],'name': 'allowance','outputs': [{'name': 'remaining','type': 'uint256'}],'payable': false,'type': 'function'},{'constant': false,'inputs': [{'name': 'newOwner','type': 'address'}],'name': 'transferOwnership','outputs': [],'payable': false,'type': 'function'},{'inputs': [],'payable': false,'type': 'constructor'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'from','type': 'address'},{'indexed': false,'name': 'value','type': 'uint256'}],'name': 'Burn','type': 'event'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'owner','type': 'address'},{'indexed': true,'name': 'spender','type': 'address'},{'indexed': false,'name': 'value','type': 'uint256'}],'name': 'Approval','type': 'event'},{'anonymous': false,'inputs': [{'indexed': true,'name': 'from','type': 'address'},{'indexed': true,'name': 'to','type': 'address'},{'indexed': false,'name': 'value','type': 'uint256'}],'name': 'Transfer','type': 'event'}]
    }
  },
  typeOrm: {
    type: 'mongodb',
    synchronize: true,
    logging: false,
    url: MONGO_URL,
    entities: [
      ORM_ENTITIES_DIR
    ],
    migrations: [
      ORM_MIGRATIONS_DIR
    ],
    subscribers: [
      ORM_SUBSCRIBER_DIR
    ]
  },
  kyc: {
    apiToken: '68b0d36a-46f4-4336-8f4e-e1f570cea5d9',
    apiSecret: 'w37alAxYV9i5bIsiOF9bROvdzMqNlJGZ',
    baseUrl: 'https://lon.netverify.com/api/netverify/v2/',
    defaultTokenLifetime: 5184000 // 60 days - Jumio max allowed value
  },
  rpc: {
    type: RPC_TYPE,
    address: RPC_ADDRESS,
    reconnectTimeout: 5000 // in milliseconds
  }
};
