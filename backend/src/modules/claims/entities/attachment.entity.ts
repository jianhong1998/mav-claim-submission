import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { ClaimEntity } from '../../claims/entities/claim.entity';
import { AttachmentStatus } from '../enums/attachment-status.enum';

@Entity('attachments')
@Index(['claimId'])
@Index(['status'])
export class AttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'claimId',
    type: 'uuid',
    nullable: false,
  })
  claimId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  originalFilename: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  storedFilename: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleDriveFileId: string | null;

  @Column({ type: 'text', nullable: true })
  googleDriveUrl: string | null;

  @Column({ type: 'bigint', nullable: false })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: AttachmentStatus,
    nullable: false,
    default: AttachmentStatus.PENDING,
  })
  status: AttachmentStatus;

  @ManyToOne(() => ClaimEntity, (claim) => claim.attachments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'claimId' })
  claim: Relation<ClaimEntity>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}
