/* eslint-disable no-console */

import { dataSource } from 'config/data-source';

import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';

const TEXT_COLORS = Object.freeze({
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
} as const);
const TEXT_STYLE = Object.freeze({
  BOLD: `\x1b[1m`,
  UNDERLINE: `\x1b[4m`,
} as const);
const TEXT_RESET = `\x1b[0m`;

const printDeleteSuccessMessage = (params: {
  numberOfEntry: number;
  entityName: string;
}) => {
  const { entityName, numberOfEntry } = params;

  console.log(
    `${TEXT_COLORS.GREEN}[Data Down]${TEXT_RESET} Deleted ${numberOfEntry} of ${TEXT_STYLE.BOLD}${entityName}${TEXT_RESET}`,
  );
};

const dataDown = async () => {
  const db = await dataSource.initialize();

  await db.manager.transaction(async (manager) => {
    console.log(`Start deleting all data`);

    const numberOfAttachments = await manager.count(AttachmentEntity);
    const numberOfClaims = await manager.count(ClaimEntity);
    const numberOfTokens = await manager.count(OAuthTokenEntity);
    const numberOfUsers = await manager.count(UserEntity);

    if (numberOfAttachments) {
      await manager.deleteAll(AttachmentEntity);
      printDeleteSuccessMessage({
        entityName: 'Attachment',
        numberOfEntry: numberOfAttachments,
      });
    }

    if (numberOfClaims) {
      await manager.deleteAll(ClaimEntity);
      printDeleteSuccessMessage({
        entityName: 'Claim',
        numberOfEntry: numberOfClaims,
      });
    }

    if (numberOfTokens) {
      await manager.deleteAll(OAuthTokenEntity);
      printDeleteSuccessMessage({
        entityName: 'Token',
        numberOfEntry: numberOfTokens,
      });
    }

    if (numberOfUsers) {
      await manager.deleteAll(UserEntity);
      printDeleteSuccessMessage({
        entityName: 'User',
        numberOfEntry: numberOfUsers,
      });
    }
  });
};

dataDown()
  .then(() => {
    console.log(`✅ Data cleaned successfully.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
