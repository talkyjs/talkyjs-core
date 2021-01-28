import {
  CustomSkillBuilder,
  SkillBuilders,
  DefaultApiClient,
  RequestHandler,
  RequestInterceptor,
  ErrorHandler,
  ResponseInterceptor,
} from 'ask-sdk-core';
import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { S3PersistenceAdapter } from 'ask-sdk-s3-persistence-adapter';
import { TLogLevelName } from 'tslog';
import { Router, RequestHandlerFactory } from '../router';
import { LoggerService } from '../Logger';
import {
  TalkyJSSkillConfig,
  SkillHandler,
  TalkyJSSkillStage,
  TalkyJSErrorHandlerConfig,
  TalkyJSDBType,
} from './skillFactory.interface';
import {
  IntentRelectorHandler,
  withRepeatIntentHandler,
  SessionEndedRequestHandler,
  SkillDisabledEventHandler,
  withErrorHandler,
} from '../handlers/index';
import { SavePersistentAttributesInterceptor } from '../PersistentAttributesManager';
import { SkillInvocationRecorder } from '../CRM';
import { SkillConfig } from '../Config/Config';
import { RequestSituationInterceptor } from '../Situation/Situation.interceptor';
import { createOpningTalkInterceptor } from '../handlers/OpeningInterceptor/Opening.interceptor';

// let cachedSkill: CustomSkillBuilder

export class SkillFactory {
  /**
   * Skill builder
   */
  private readonly skillBuilders: CustomSkillBuilder = SkillBuilders.custom();

  /**
   * Factory instance
   */
  private static _instance: SkillFactory;

  /**
   * Skill Router factory
   */
  private readonly router = new RequestHandlerFactory();

  private _hasDevHandlerAdded: boolean = false;
  private _hasGeneralHandlerAdded: boolean = false;

  /**
   * Skill PersistenceAttributesManager Type
   */
  private dbType: TalkyJSDBType = 'none';

  /**
   * Log level
   */
  public logLevel: TLogLevelName;

  /**
   * ErrorConfig
   */
  private _errorHandler: TalkyJSErrorHandlerConfig;

  /**
   * Skill working stage
   */
  protected readonly stage: TalkyJSSkillStage;

  public constructor(config?: TalkyJSSkillConfig) {
    const configManager = SkillConfig.getInstance(config);
    const {
      stage,
      logLevel,
      skillId,
      errorHandler,
    } = configManager.loadConfig();
    this.stage = stage;
    this.logLevel = logLevel;
    if (skillId) this.skillBuilders.withSkillId(skillId);
    this._configureAPIClients(config);
    this._configureDBClients(config);
    this._addOpeningInterceptor(config);
    this._errorHandler = errorHandler;
  }

  private _addOpeningInterceptor(config?: TalkyJSSkillConfig) {
    if (!config) return;
    const interceptor = createOpningTalkInterceptor(config);
    if (!interceptor) return;
    this.addRequestInterceptors(interceptor);
  }

  /**
   * Get factory instance
   * @param config
   */
  public static launch(config?: TalkyJSSkillConfig) {
    if (!this._instance) {
      this._instance = new SkillFactory(config);
    }
    return this._instance;
  }
  /**
   * Add helper handlers
   */
  private _addGeneralHelpers(): this {
    if (this._hasGeneralHandlerAdded) return this;
    this._hasGeneralHandlerAdded = true;
    this.addRequestHandlers(
      SessionEndedRequestHandler,
      SkillDisabledEventHandler
    ).addRequestInterceptors(RequestSituationInterceptor);
    withRepeatIntentHandler(this.skillBuilders);
    withErrorHandler(this.skillBuilders, this._errorHandler);
    this._addUsingDBHelpers();
    return this;
  }

  /**
   * Add helpers using persistenceAttributesManager
   */
  private _addUsingDBHelpers(): this {
    if (this.dbType === 'none') return this;
    this.addResponseInterceptors(
      SavePersistentAttributesInterceptor
    ).addRequestInterceptors(SkillInvocationRecorder);
    return this;
  }

  /**
   * Add development helper handlers
   */
  private _addDevelopmentHelpers(): this {
    if (this.stage === 'production') return this;
    if (this._hasDevHandlerAdded) return this;
    this._hasDevHandlerAdded = true;
    this.skillBuilders.addRequestHandlers(IntentRelectorHandler);
    return this;
  }

  /**
   * Configure Skill API Client
   * @param apiClient
   */
  private _configureAPIClients(config?: TalkyJSSkillConfig): this {
    if (!config) return this;
    const { apiClient } = config;
    if (!apiClient) return this;
    if (apiClient.useDefault) {
      this.skillBuilders.withApiClient(new DefaultApiClient());
    } else if (apiClient.client) {
      this.skillBuilders.withApiClient(apiClient.client);
    }
    return this;
  }

  /**
   * Configure Skill PersistenceAdapter
   * @param database
   */
  private _configureDBClients(config?: TalkyJSSkillConfig): this {
    if (!config) return this;
    const { database } = config;
    // ここでDBタイプをRequestAttributesに保存しておく
    if (!database || database.type === 'none') return this;
    this.dbType = database.type;
    if (database.type === 'dynamodb') {
      this.skillBuilders.withPersistenceAdapter(
        new DynamoDbPersistenceAdapter({
          tableName: database.tableName,
          createTable: database.withCreateTable || false,
        })
      );
    } else if (database.type === 's3') {
      this.skillBuilders.withPersistenceAdapter(
        new S3PersistenceAdapter({
          bucketName: database.tableName,
          pathPrefix: database.s3PathPrefix || '',
        })
      );
    }
    return this;
  }

  /**
   * Add Router handlers
   * @param routers
   */
  public addRequestRouter(...routers: Router[]): this {
    const handlers = this.router.addRoutes(...routers).createHandlers();
    this.addRequestHandlers(...handlers);
    return this;
  }

  /**
   * Add Router handlers
   * @param routers
   */
  public addRequestRouters(routers: Router[]): this {
    this.addRequestRouter(...routers);
    return this;
  }

  /**
   * [Proxy] add ErrorHandlers
   * @param handlers
   */
  public addErrorHandlers(...handlers: ErrorHandler[]): this {
    this.skillBuilders.addErrorHandlers(...handlers);
    return this;
  }

  /**
   * [Proxy] add requestInterceptors
   * @param interceptors
   */
  public addRequestInterceptors(...interceptors: RequestInterceptor[]): this {
    this.skillBuilders.addRequestInterceptors(...interceptors);
    return this;
  }

  /**
   * [Proxy] add ResponseInterceptors
   * @param interceptors
   */
  public addResponseInterceptors(...interceptors: ResponseInterceptor[]): this {
    this.skillBuilders.addResponseInterceptors(...interceptors);
    return this;
  }

  /**
   * Add native request handler
   * @param handlres
   */
  public addRequestHandlers(...handlres: RequestHandler[]): this {
    this.skillBuilders.addRequestHandlers(...handlres);
    return this;
  }

  /**
   * Create SKill
   */
  public getSkill(): CustomSkillBuilder {
    this._addGeneralHelpers();
    /**
     * Add dev helpers
     */
    this._addDevelopmentHelpers();
    return this.skillBuilders;
  }

  /**
   * get lambda handler
   */
  public createLambdaHandler(): SkillHandler {
    return async (event, context) => {
      const { logger } = LoggerService.getInstance(event, {
        minLevel: this.logLevel,
      });
      logger.info(event);
      const skill = this.getSkill();
      const result = await skill.create().invoke(event, context);
      logger.info(result);
      return result;
    };
  }
}
