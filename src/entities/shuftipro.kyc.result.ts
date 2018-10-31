import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity()
export class ShuftiproKycResult {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  event?: string;

  @Column()
  reference?: string;

  @Column()
  token?: string;

  @Column()
  verificationUrl?: string;

  @Column()
  verificationResult?: string | null;

  @Column()
  verificationData?: any;

  @Column()
  declinedReason?: any;

  @Column()
  error?: boolean;

  @Column()
  timestamp: string;

  @Column()
  user: ObjectID;

  static createShuftiproKycResult(data: ShuftiproInitResult): ShuftiproKycResult {
    const kycResult = new ShuftiproKycResult();
    kycResult.event = data.event;
    kycResult.token = data.token;
    kycResult.reference = data.reference;
    kycResult.verificationData = data.verification_data;
    kycResult.verificationResult = data.verification_result;
    kycResult.verificationUrl = data.verification_url;
    kycResult.timestamp = data.timestamp;
    kycResult.declinedReason = data.declined_reason;

    if (data.error) {
      kycResult.error = data.error;
    }

    return kycResult;
  }
}
