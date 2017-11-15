import { MongoRepository } from "typeorm";
import { EntityRepository } from "typeorm/decorator/EntityRepository";
import {KycResult, VERIFICATION_STATUS_NO_ID_UPLOADED} from "../entities/kyc.result";
import {Investor} from "../entities/investor";

@EntityRepository(KycResult)
export class KycResultRepository extends MongoRepository<KycResult> {
  async getFailedVerificationsCountByInvestor(investor: Investor) {
    const query = {
      '$and': [
        {
          customerId: investor.email
        },
        {
          verificationStatus: {
            '$ne': VERIFICATION_STATUS_NO_ID_UPLOADED
          }
        }
      ]
    };
    return await this.manager.createEntityCursor(KycResult, query).count(false);
  }
}