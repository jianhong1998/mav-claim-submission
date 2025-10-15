import { ConsoleLogger, Injectable } from '@nestjs/common';

import { EnvironmentVariableUtil } from './environment-variable.util';

@Injectable()
export class LoggerUtil {
  private readonly varList: ReturnType<EnvironmentVariableUtil['getVariables']>;

  constructor(private readonly envVarUtil: EnvironmentVariableUtil) {
    this.varList = envVarUtil.getVariables();
  }

  public createLogger(logKey: string): ConsoleLogger {
    const isLocal = this.varList.nodeEnv === 'local';

    const shouldLogTimestamp = isLocal;
    const shouldColoriseLog = isLocal;
    const shouldOutputInJson = !isLocal;

    return new ConsoleLogger(logKey, {
      timestamp: shouldLogTimestamp,
      colors: shouldColoriseLog,
      json: shouldOutputInJson,
    });
  }
}
