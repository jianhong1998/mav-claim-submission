import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';

export const ENTITY_MODELS = [UserEntity, OAuthTokenEntity];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
