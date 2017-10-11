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
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNmMTc3Zjc5LWU3Y2MtNDY1Mi1iYzMzLWIxYjAxOTI5NWViYyIsImxvZ2luIjoidGVuYW50OnRlc3RAdGVzdC5jb20iLCJqdGkiOiJjZjE3N2Y3OS1lN2NjLTQ2NTItYmMzMy1iMWIwMTkyOTVlYmMxNTA3NTM0MDI5NzAxIiwiaWF0IjoxNTA3NTM0MDI5NzAxLCJhdWQiOiJqaW5jb3IuY29tIiwiaXNUZW5hbnQiOnRydWV9.i8ifYNs13QO_lJmiKQlXRQv4WvKaIWbYeNCmD-3TsLk'
  },
  verify: {
    port: parseInt(VERIFY_PORT, 10) || 3000,
    host: VERIFY_HOST || 'verify'
  }
};
