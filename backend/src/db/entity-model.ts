import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEmailPreferenceEntity } from 'src/modules/user/entities/user-email-preference.entity';
import { ClaimCategoryEntity } from 'src/modules/claim-category/entities/claim-category.entity';
import { ClaimCategoryLimitEntity } from 'src/modules/claim-category/entities/claim-category-limit.entity';

export const ENTITY_MODELS = [
  UserEntity,
  OAuthTokenEntity,
  AttachmentEntity,
  UserEmailPreferenceEntity,

  // Claim related
  ClaimEntity,
  ClaimCategoryEntity,
  ClaimCategoryLimitEntity,
];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
