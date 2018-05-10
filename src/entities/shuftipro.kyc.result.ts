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
}
