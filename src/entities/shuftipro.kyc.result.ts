import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity()
export class ShuftiproKycResult {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  statusCode?: string;

  @Column()
  message: string;

  @Column()
  reference?: string;

  @Column()
  signature?: string;

  @Column()
  error?: boolean;

  @Column()
  timestamp: string;

  @Column()
  user: ObjectID;

  static createShuftiproKycResult(data: ShuftiproInitResult): ShuftiproKycResult {
    const kycResult = new ShuftiproKycResult();
    kycResult.statusCode = data.status_code;
    kycResult.message = data.message;
    kycResult.reference = data.reference;
    kycResult.signature = data.signature;
    kycResult.timestamp = data.timestamp;

    if (data.error) {
      kycResult.error = data.error;
    }

    return kycResult;
  }
}
