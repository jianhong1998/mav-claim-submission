import { UserEntity } from '../../user/entities/user.entity';

export class TestDataResponseDTO {
  public user: {
    id: string;
    email: string;
    name: string;
    googleId: string;
  };

  constructor(userEntity: UserEntity) {
    this.user = {
      id: userEntity.id,
      email: userEntity.email,
      name: userEntity.name,
      googleId: userEntity.googleId,
    };
  }
}
