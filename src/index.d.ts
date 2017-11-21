declare interface RegistrationResult {
  id: string;
  email: string;
  login: string;
}

declare interface TenantRegistrationResult extends RegistrationResult {

}

declare interface UserRegistrationResult extends RegistrationResult {
  tenant: string;
  sub: string;
  scope?: any;
}

declare interface VerificationResult {
  id: string;
  login: string;
  jti: string;
  iat: number;
  aud: string;
}

declare interface TenantVerificationResult extends VerificationResult {
  isTenant: boolean;
}

declare interface UserVerificationResult extends VerificationResult {
  deviceId: string;
  sub: string;
  exp: number;
  scope?: any;
}

declare interface UserVerificationResponse {
  decoded: UserVerificationResult;
}

declare interface TenantVerificationResponse {
  decoded: TenantVerificationResult;
}

declare interface AuthUserData {
  email: string;
  login: string;
  password: string;
  sub: string;
  scope?: any;
}

declare interface UserLoginData {
  login: string;
  password: string;
  deviceId: string;
}

declare interface AccessTokenResponse {
  accessToken: string;
}

declare interface AuthClientInterface {
  tenantToken: string;
  registerTenant(email: string, password: string): Promise<TenantRegistrationResult>;
  loginTenant(email: string, password: string): Promise<AccessTokenResponse>;
  verifyTenantToken(token: string): Promise<TenantVerificationResult>;
  logoutTenant(token: string): Promise<void>;
  createUser(data: AuthUserData): Promise<UserRegistrationResult>;
  loginUser(data: UserLoginData): Promise<AccessTokenResponse>;
  verifyUserToken(token: string): Promise<UserVerificationResult>;
  logoutUser(token: string): Promise<void>;
  deleteUser(login: string): Promise<void>;
}

declare interface InitiateData {
  consumer: string;
  issuer?: string;
  template?: {
    body: string;
    fromEmail?: string;
    subject?: string;
  };
  generateCode?: {
    length: number,
    symbolSet: Array<string>
  };
  policy: {
    expiredOn: string
  };
}

declare interface Result {
  status: number;
}

declare interface InitiateResult extends Result {
  verificationId: string;
  attempts: number;
  expiredOn: number;
  method: string;
  code?: string;
  totpUri?: string;
  qrPngDataUri?: string;
}

declare interface ValidationResult extends Result {
  details?: any;
  data?: {
    verificationId: string,
    consumer: string,
    expiredOn: number
  };
}

declare interface ValidateVerificationInput {
  code: string;
  removeSecret?: boolean;
}

declare interface VerificationClientInterface {
  initiateVerification(method: string, data: InitiateData): Promise<InitiateResult>;
  validateVerification(method: string, id: string, input: ValidateVerificationInput): Promise<ValidationResult>;
  invalidateVerification(method: string, id: string): Promise<void>;
}

declare interface UserData {
  email: string;
  name: string;
  agreeTos: boolean;
  referral?: string;
  passwordHash?: string;
}

declare interface InputUserData extends UserData {
  password: string;
}

declare interface Wallet {
  ticker: string;
  address: string;
  balance: string;
  salt?: string;
}

declare interface NewWallet extends Wallet {
  privateKey: string;
  mnemonic: string;
}

declare interface CreatedUserData extends UserData {
  id: string;
  verification: {
    id: string,
    method: string
  };
  isVerified: boolean;
  defaultVerificationMethod: string;
  referralCode: string;
  kycStatus: string;
}

declare interface BaseInitiateResult {
  verification: InitiateResult;
}

declare interface InitiateLoginResult extends BaseInitiateResult {
  accessToken: string;
  isVerified: boolean;
}

declare interface VerifyLoginResult extends InitiateLoginResult {

}

declare interface ActivationUserData {
  email: string;
  verificationId: string;
  code: string;
}

declare interface ActivationResult {
  accessToken: string;
  wallets: Array<NewWallet>;
}

declare interface InitiateLoginInput {
  email: string;
  password: string;
}

declare interface VerifyLoginInput {
  accessToken: string;
  verification: {
    id: string,
    code: string,
    method: string
  };
}

declare interface InitiateChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

declare interface InviteResult {
  email: string;
  invited: boolean;
}

declare interface InviteResultArray {
  emails: Array<InviteResult>;
}

declare interface VerificationInput {
  verification?: {
    verificationId: string,
    code: string,
    method: string
  };
}

declare interface ResetPasswordInput extends VerificationInput {
  email: string;
  password: string;
}

declare interface Enable2faResult {
  enabled: boolean;
}

declare interface KycInitResult {
  timestamp: string;
  authorizationToken: string;
  jumioIdScanReference: string;
  clientRedirectUrl: string;
}

declare interface KycScanStatus {
  timestamp: string;
  scanReference: string;
  status: string;
}

declare interface JumioIdentityVerification {
  similarity: string;
  validity: boolean;
  reason?: string;
}

declare interface UserInfo {
  ethAddress: string;
  email: string;
  name: string;
  kycStatus: string;
  defaultVerificationMethod: string;
}

interface TransactionInput {
  from: string;
  to: string;
  amount: string;
  gas: number;
  gasPrice: string;
}

declare interface UserServiceInterface {
  create(userData: InputUserData): Promise<any>;
  activate(activationData: ActivationUserData): Promise<ActivationResult>;
  initiateLogin(inputData: InitiateLoginInput, ip: string): Promise<InitiateLoginResult>;
  initiateChangePassword(user: any, params: InitiateChangePasswordInput): Promise<BaseInitiateResult>;
  verifyChangePassword(user: any, params: InitiateChangePasswordInput): Promise<AccessTokenResponse>;
  initiateEnable2fa(user: any): Promise<BaseInitiateResult>;
  verifyEnable2fa(user: any, params: VerificationInput): Promise<Enable2faResult>;
  initiateDisable2fa(user: any): Promise<BaseInitiateResult>;
  verifyDisable2fa(user: any, params: VerificationInput): Promise<Enable2faResult>;
  initiateResetPassword(params: ResetPasswordInput): Promise<BaseInitiateResult>;
  verifyResetPassword(params: ResetPasswordInput): Promise<AccessTokenResponse>;
  verifyLogin(inputData: VerifyLoginInput): Promise<VerifyLoginResult>;
  invite(user: any, params: any): Promise<InviteResultArray>;
  getUserInfo(user: any): Promise<UserInfo>;
}

declare interface KycClientInterface {
  init(investor: any): Promise<KycInitResult>;
  getScanReferenceStatus(scanId: string): Promise<KycScanStatus>;
}

declare interface EmailServiceInterface {
  send(sender: string, recipient: string, subject: string, text: string): Promise<any>;
}
