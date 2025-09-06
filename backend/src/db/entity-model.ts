import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { DelayedJobEntity } from 'src/modules/jobs/entities/delayed-job.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';

export const ENTITY_MODELS = [
  UserEntity,
  OAuthTokenEntity,
  ClaimEntity,
  AttachmentEntity,
  DelayedJobEntity,
];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
