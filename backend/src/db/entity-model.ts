import { UserEntity } from './entities/user.entity';
import { OAuthTokenEntity } from './entities/oauth-token.entity';

export const ENTITY_MODELS = [UserEntity, OAuthTokenEntity];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
