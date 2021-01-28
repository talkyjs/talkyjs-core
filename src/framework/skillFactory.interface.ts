import {
  RequestEnvelope,
  Context,
  ResponseEnvelope,
  services,
} from 'ask-sdk-model';
import { TLogLevelName } from 'tslog';

/**
 * Skill working stage
 */
export type TalkyJSSkillStage = 'development' | 'test' | 'production';

/**
 * Skill database type
 */
export type TalkyJSDBType = 'none' | 's3' | 'dynamodb';

/**
 * ErrorHandler config
 */
export type TalkyJSErrorHandlerConfig = {
  usePreset: boolean;
  sentry?: {
    dsn: string;
  };
};

/**
 * Database (PersistanceAdapter) configs
 */
export interface TalkyJSDBonfig {
  type: TalkyJSDBType;
  tableName: string;
  /**
   * DynamoDB options
   */
  withCreateTable?: boolean;
  /**
   * S3 options
   */
  s3PathPrefix?: string;
}

/**
 * API service client configurations
 */
export interface TalkyJSAPIClientConfig {
  useDefault: boolean;
  client?: services.ApiClient;
}

/**
 * Skill factory config
 */
export interface TalkyJSSkillConfig {
  stage?: TalkyJSSkillStage;
  logLevel?: TLogLevelName;
  database?: TalkyJSDBonfig;
  skillId?: string;
  apiClient?: TalkyJSAPIClientConfig;
  errorHandler?: TalkyJSErrorHandlerConfig;
  opening?: {
    ssml?: string;
    text?: string;
  };
}

/**
 * Native Lambda handler for Alexa Custom skill
 */
export type SkillHandler = (
  event: RequestEnvelope,
  context?: Context
) => Promise<ResponseEnvelope>;
