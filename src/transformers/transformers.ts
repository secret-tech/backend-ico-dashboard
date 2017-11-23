import { Investor } from '../entities/investor';
import { VerifiedToken } from '../entities/verified.token';
import config from '../config';

export function transformInvestorForAuth(investor: Investor) {
  return {
    email: investor.email,
    login: investor.email,
    password: investor.passwordHash,
    sub: investor.verification.id
  };
}

export function transformCreatedInvestor(investor: Investor): CreatedUserData {
  return {
    id: investor.id.toString(),
    email: investor.email,
    name: investor.name,
    agreeTos: investor.agreeTos,
    verification: {
      id: investor.verification.id.toString(),
      method: investor.verification.method
    },
    isVerified: investor.isVerified,
    defaultVerificationMethod: investor.defaultVerificationMethod,
    referralCode: investor.referralCode,
    kycStatus: investor.kycStatus,
    referral: investor.referral
  };
}

export function transformVerifiedToken(token: VerifiedToken): VerifyLoginResult {
  return {
    accessToken: token.token,
    isVerified: token.verified,
    verification: {
      verificationId: token.verification.id,
      method: token.verification.method,
      attempts: token.verification.attempts,
      expiredOn: token.verification.expiredOn,
      status: 200
    }
  };
}

export function transformReqBodyToInvestInput(body: any, investor: Investor): TransactionInput {
  const gas = body.gas ? body.gas.toString() : '200000';
  const gasPrice = body.gasPrice || '20';
  const amount = body.ethAmount.toString();

  return {
    from: investor.ethWallet.address,
    to: config.contracts.ico.address,
    amount,
    gas,
    gasPrice
  };
}
