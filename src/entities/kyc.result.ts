import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

export const JUMIO_SCAN_STATUS_ERROR = 'ERROR';
export const JUMIO_SCAN_STATUS_SUCCESS = 'SUCCESS';

@Entity()
export class KycResult {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  idScanStatus: string;

  @Column()
  idCheckMicroprint: string;

  @Column()
  idType: string;

  @Column()
  jumioIdScanReference: string;

  @Column()
  callBackType: string;

  @Column()
  merchantIdScanReference: string;

  @Column()
  verificationStatus: string;

  @Column()
  idCheckDocumentValidation: string;

  @Column()
  idScanImage: string;

  @Column()
  callbackDate: string;

  @Column()
  transactionDate: string;

  @Column()
  idCheckDataPositions: string;

  @Column()
  idCountry: string;

  @Column()
  idCheckSignature: string;

  @Column()
  rejectReason: string;

  @Column()
  clientIp: string;

  @Column()
  customerId: string;

  @Column()
  idScanImageFace: string;

  @Column()
  idCheckSecurityFeatures: string;

  @Column()
  firstAttemptDate: string;

  @Column()
  idCheckHologram: string;

  @Column()
  idScanSource: string;

  @Column()
  idCheckMRZcode: string;

  @Column()
  identityVerification: JumioIdentityVerification;
}
