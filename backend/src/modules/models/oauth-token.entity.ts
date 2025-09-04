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
import { UserEntity } from './user.entity';

@Entity('oauth_tokens')
@Index(['userId', 'provider'], { unique: true })
export class OAuthTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'enum', enum: ['google'], nullable: false })
  provider: 'google';

  @Column({ type: 'text', nullable: false })
  accessToken: string;

  @Column({ type: 'text', nullable: false })
  refreshToken: string;

  @Column({ type: 'timestamp with time zone', nullable: false })
  expiresAt: Date;

  @Column({ type: 'text', nullable: false })
  scope: string;

  @ManyToOne(() => UserEntity, (user) => user.oauthTokens, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user?: Relation<UserEntity>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;
}
