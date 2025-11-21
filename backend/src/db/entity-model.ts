import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEmailPreferenceEntity } from 'src/modules/user/entities/user-email-preference.entity';

export const ENTITY_MODELS = [
  UserEntity,
  OAuthTokenEntity,
  ClaimEntity,
  AttachmentEntity,
  UserEmailPreferenceEntity,
];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
