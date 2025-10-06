import { Injectable, CanActivate, NotFoundException } from '@nestjs/common';

@Injectable()
export class ApiTestModeGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.BACKEND_ENABLE_API_TEST_MODE !== 'true') {
      throw new NotFoundException();
    }
    return true;
  }
}
