import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  type Relation,
} from 'typeorm';
import { OAuthTokenEntity } from './oauth-token.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['googleId'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  picture?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  googleId: string;

  @OneToMany(() => OAuthTokenEntity, (token) => token.user, {
    cascade: true,
  })
  oauthTokens?: Relation<OAuthTokenEntity>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;
}
