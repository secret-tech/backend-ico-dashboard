require('dotenv').config();
import 'reflect-metadata';
import * as fs from 'fs';

const {
  CLIENT_IP_FORWARD_HEADER,
  LOGGING_LEVEL,
  LOGGING_FORMAT,
  LOGGING_COLORIZE,
  REDIS_URL,
  REDIS_PREFIX,
  HTTP_SERVER,
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
  MONGO_AUTH_SOURCE,
  MONGO_REPLICA_SET,
  SC_ABI_FOLDER,
  ICO_SC_ADDRESS,
  ICO_OLD_SC_ADDRESSES,
  WHITELIST_SC_ADDRESS,
  TOKEN_ADDRESS,
  RPC_TYPE,
  RPC_ADDRESS,
  ACCESS_LOG,
  MAILGUN_DOMAIN,
  MAILGUN_API_KEY,
  MAILJET_API_KEY,
  MAILJET_API_SECRET,
  WEB3_RESTORE_START_BLOCK,
  WEB3_BLOCK_OFFSET,
  WL_OWNER_PK,
  KYC_PROVIDER,
  KYC_ENABLED,
  KYC_JUMIO_TOKEN,
  KYC_JUMIO_SECRET,
  KYC_JUMIO_BASE_URL,
  KYC_JUMIO_TOKEN_LIFETIME,
  KYC_STATUS_DEFAULT,
  COINPAYMENTS_API_KEY,
  COINPAYMENTS_API_SECRET,
  COINPAYMENTS_API_CURRENCY1,
  COINPAYMENTS_API_MERCHANT_ID,
  COINPAYMENTS_API_MERCHANT_SECRET,
  COMPANY_NAME,
  EMAIL_FROM,
  EMAIL_REFERRAL,
  EMAIL_TEMPLATE_FOLDER,
  TOKEN_PRICE_USD,
  KYC_SHUFTIPRO_CLIENT_ID,
  KYC_SHUFTIPRO_SECRET_KEY,
  KYC_SHUFTIPRO_CALLBACK_URL,
  KYC_SHUFTIPRO_REDIRECT_URL,
  TEST_FUND_PK,
  DEFAULT_INVEST_GAS,
  PURCHASE_GAS_LIMIT,
  ICO_END_TIMESTAMP,
  KYC_SHUFTIPRO_ALLOW_RECREATE_SESSION,
  KYC_SHUFTIPRO_DEFAULT_PHONE
} = process.env;

export default {
  app: {
    clientIpHeader: CLIENT_IP_FORWARD_HEADER || 'x-forwarded-for',
    companyName: COMPANY_NAME || 'secret_tech',
    port: parseInt(PORT, 10) || 3000,
    httpsPort: parseInt(HTTPS_PORT, 10) || 4000,
    httpServer: HTTP_SERVER || 'enabled',
    httpsServer: HTTPS_SERVER || 'disabled',
    forceHttps: FORCE_HTTPS || 'disabled',
    apiUrl: API_URL,
    frontendUrl: FRONTEND_URL,
    accessLog: ACCESS_LOG || true,
    icoEndTimestamp: parseInt(ICO_END_TIMESTAMP, 10) || 1517443200
  },
  logging: {
    level: LOGGING_LEVEL || 'warn',
    format: LOGGING_FORMAT || 'text',
    colorize: LOGGING_COLORIZE || false
  },
  web3: {
    startBlock: parseInt(WEB3_RESTORE_START_BLOCK, 10) || 1,
    blockOffset: parseInt(WEB3_BLOCK_OFFSET, 10) || 200,
    defaultInvestGas: parseInt(DEFAULT_INVEST_GAS, 10) || 130000,
    purchaseGasLimit: parseInt(PURCHASE_GAS_LIMIT, 10) || 100000
  },
  redis: {
    url: REDIS_URL || 'redis://redis:6379',
    prefix: REDIS_PREFIX || 'icodashboard_space_'
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
    baseUrl: VERIFY_BASE_URL || 'http://verify:3000',
    maxAttempts: 3
  },
  email: {
    domain: MAILGUN_DOMAIN || 'icodashboard.space',
    mailgun: {
      secret: MAILGUN_API_KEY || 'key-0123456789'
    },
    mailjet: {
      apiKey: MAILJET_API_KEY,
      apiSecret: MAILJET_API_SECRET
    },
    from: {
      general: EMAIL_FROM || 'noreply@icodashboard.space',
      referral: EMAIL_REFERRAL || 'partners@icodashboard.space'
    },
    template: {
      folder: EMAIL_TEMPLATE_FOLDER || 'default',
      required: [
        'init-buy-tokens',
        'init-change-password',
        'init-reset-password',
        'init-signin',
        'init-signup',
        'invite'
      ]
    }
  },
  contracts: {
    // old ropsten whitelist: 0x94c4b2ee76ff421cdae95a9affeea7c80d4334e8
    whiteList: {
      address: WHITELIST_SC_ADDRESS,
      abi: JSON.parse(fs.readFileSync(SC_ABI_FOLDER + '/whitelist-sc-abi.json').toString()),
      ownerPk: WL_OWNER_PK
    },
    // old ropsten ico: 0xfd7345eaa260ec6259223ca996abac70a7cc8ac3
    ico: {
      address: ICO_SC_ADDRESS,
      oldAddresses: ICO_OLD_SC_ADDRESSES ? ICO_OLD_SC_ADDRESSES.split(',') : [],
      abi: JSON.parse(fs.readFileSync(SC_ABI_FOLDER + '/ico-sc-abi.json').toString())
    },
    token: {
      priceUsd: parseFloat(TOKEN_PRICE_USD),
      address: TOKEN_ADDRESS,
      abi: JSON.parse(fs.readFileSync(SC_ABI_FOLDER + '/token-sc-abi.json').toString())
    }
  },
  typeOrm: {
    type: 'mongodb',
    synchronize: true,
    logging: false,
    url: MONGO_URL,
    authSource: MONGO_AUTH_SOURCE,
    replicaSet: MONGO_REPLICA_SET,
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
    enabled: (KYC_ENABLED == 'true'), // 60 days - Jumio max allowed value
    status: {
      default: KYC_STATUS_DEFAULT
    },
    jumio: {
      apiToken: KYC_JUMIO_TOKEN,
      apiSecret: KYC_JUMIO_SECRET,
      baseUrl: KYC_JUMIO_BASE_URL,
      defaultTokenLifetime: parseInt(KYC_JUMIO_TOKEN_LIFETIME, 10) || 5184000 // 60 days - Jumio max allowed value
    },
    shuftipro: {
      clientId: KYC_SHUFTIPRO_CLIENT_ID,
      secretKey: KYC_SHUFTIPRO_SECRET_KEY,
      baseUrl: 'https://api.shuftipro.com',
      callbackUrl: KYC_SHUFTIPRO_CALLBACK_URL,
      redirectUrl: KYC_SHUFTIPRO_REDIRECT_URL,
      allowRecreateSession: (KYC_SHUFTIPRO_ALLOW_RECREATE_SESSION === 'true') || false,
      defaultPhone: KYC_SHUFTIPRO_DEFAULT_PHONE
    },
    provider: KYC_PROVIDER || 'JUMIO'
  },
  rpc: {
    type: RPC_TYPE,
    address: RPC_ADDRESS,
    reconnectTimeout: 5000 // in milliseconds
  },
  coinPayments: {
    key: COINPAYMENTS_API_KEY || 'api_key',
    secret: COINPAYMENTS_API_SECRET || 'api_secret',
    currency1: COINPAYMENTS_API_CURRENCY1 || 'ETH',
    merchantId: COINPAYMENTS_API_MERCHANT_ID || 'api_merchant_id',
    merchantSecret: COINPAYMENTS_API_MERCHANT_SECRET || 'api_merchant_secret',
    incomingPaymentsFee: 0.005
  },
  test_fund: {
    private_key: TEST_FUND_PK
  }
};
