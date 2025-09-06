import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { UserEntity } from '../entities/user.entity';
import { IUserCreationData } from '../types/user-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserDBUtil extends BaseDBUtil<UserEntity, IUserCreationData> {
  constructor(
    @InjectRepository(UserEntity)
    userRepo: Repository<UserEntity>,
  ) {
    super(UserEntity, userRepo);
  }

  public async create(params: {
    creationData: IUserCreationData;
    entityManager?: EntityManager;
  }): Promise<UserEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(UserEntity) ?? this.repo;

    const user = repo.create(creationData);
    const createdUser = await repo.save(user);

    return createdUser;
  }
}
