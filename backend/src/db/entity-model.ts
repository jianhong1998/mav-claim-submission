import { OAuthTokenEntity } from 'src/modules/models/oauth-token.entity';
import { UserEntity } from 'src/modules/models/user.entity';

export const ENTITY_MODELS = [UserEntity, OAuthTokenEntity];

export type ModelConstructorType = (typeof ENTITY_MODELS)[number];
