import { RequestEnvelope, Response } from 'ask-sdk-model';
import {
  RequestEnvelopeFactory,
  LaunchRequestFactory,
  IntentRequestFactory,
} from '@ask-utils/test';
import { SkillFactory } from '../index';
import {
  TalkyJSDBonfig,
  TalkyJSDBType,
  TalkyJSSkillStage,
} from '../skillFactory.interface';

describe('SkillFactoryr', () => {
  let requestEnvelope: RequestEnvelope = new RequestEnvelopeFactory(
    new LaunchRequestFactory()
  ).getRequest();
  let skill: SkillFactory;
  describe('persistenceAdaptoer configuration', () => {
    const createSkillWithDB = (type?: 'none' | 's3' | 'dynamodb') => {
      const dbConf: TalkyJSDBonfig | undefined =
        !type || type === 'none'
          ? undefined
          : {
              type,
              tableName: 'dummy',
            };
      return new SkillFactory({
        database: dbConf,
        errorHandler: {
          usePreset: false,
        },
      }).addRequestHandlers({
        canHandle() {
          return true;
        },
        async handle(input) {
          const data = await input.attributesManager.getPersistentAttributes();
          return input.responseBuilder
            .speak('db data can get it!')
            .withSimpleCard('db data', JSON.stringify(data))
            .getResponse();
        },
      });
    };
    beforeEach(() => {
      requestEnvelope = new RequestEnvelopeFactory(
        new LaunchRequestFactory()
      ).getRequest();
    });
    it.each([undefined, 'none'])(
      'should reject using persistenceAdapter without %p db type',
      async type => {
        skill = createSkillWithDB(type as TalkyJSDBType);
        await expect(
          skill.createLambdaHandler()(requestEnvelope)
        ).rejects.toThrowError(
          'Cannot get PersistentAttributes without PersistenceManager'
        );
      }
    );
    /**
     * @TODO Should mock
     */
    it.skip.each(['s3', 'dynamodb'])(
      'should resolve using persistenceAdapter without %p db type',
      async type => {
        skill = createSkillWithDB(type as TalkyJSDBType);
        await expect(
          skill.createLambdaHandler()(requestEnvelope)
        ).rejects.toThrowError(
          'Cannot get PersistentAttributes without PersistenceManager'
        );
      }
    );
  });
  describe('stage configuration', () => {
    describe('intentReflector', () => {
      it.each(['development', 'test'])(
        'should execute intentReflector when stage is %p',
        async stage => {
          const requestEnvelope = new RequestEnvelopeFactory(
            new IntentRequestFactory().setIntent({
              name: 'dummy',
              confirmationStatus: 'NONE',
            })
          ).getRequest();
          const skill = new SkillFactory({
            stage: stage as TalkyJSSkillStage,
          });
          await expect(
            skill.createLambdaHandler()(requestEnvelope)
          ).resolves.toMatchObject({
            response: {
              outputSpeech: {
                ssml: '<speak>You just triggered dummy</speak>',
                type: 'SSML',
              },
            },
            sessionAttributes: {},
            userAgent: expect.any(String),
            version: expect.any(String),
          });
        }
      );
      it('should reject intentReflector when stage is production', async () => {
        const requestEnvelope = new RequestEnvelopeFactory(
          new IntentRequestFactory().setIntent({
            name: 'dummy',
            confirmationStatus: 'NONE',
          })
        ).getRequest();
        const skill = new SkillFactory({
          stage: 'production',
          errorHandler: {
            usePreset: false,
          },
        });
        await expect(
          skill.createLambdaHandler()(requestEnvelope)
        ).rejects.toThrowError('Unable to find a suitable request handler');
      });
    });
  });
  describe('generalHandlers', () => {
    describe('AMAZON.RepeatIntent', () => {
      const mockResponse: Response = {
        outputSpeech: {
          ssml: '<speak>Hello</speak>',
          type: 'SSML',
        },
      };
      const mockAttributes = {
        __talkyjs: {
          recordedResponse: mockResponse,
        },
      };
      let skill: SkillFactory;
      let requestEnvelope: RequestEnvelope;
      beforeEach(() => {
        skill = new SkillFactory({
          stage: 'development',
        });
        requestEnvelope = new RequestEnvelopeFactory(
          new IntentRequestFactory().setIntent({
            name: 'AMAZON.RepeatIntent',
            confirmationStatus: 'NONE',
          })
        ).getRequest();
      });
      it('should nothing to work when no session data and ended session requested', async () => {
        const result = await skill.createLambdaHandler()(requestEnvelope);
        expect(result).toMatchObject({
          response: {
            outputSpeech: {
              ssml: '<speak>You just triggered AMAZON.RepeatIntent</speak>',
              type: 'SSML',
            },
          },
          sessionAttributes: {},
          userAgent: expect.any(String),
          version: expect.any(String),
        });
      });
      it('should return recorded response when has matched session attribues is recorded', async () => {
        const factory = new RequestEnvelopeFactory(
          new IntentRequestFactory().setIntent({
            name: 'AMAZON.RepeatIntent',
            confirmationStatus: 'NONE',
          })
        );
        factory.session.putAttributes(mockAttributes);
        const requestEnvelope = factory.getRequest();
        const result = await skill.createLambdaHandler()(requestEnvelope);
        expect(result).toMatchObject({
          response: mockResponse,
          sessionAttributes: mockAttributes,
          userAgent: expect.any(String),
          version: expect.any(String),
        });
      });
      it('should record the last reponse', async () => {
        skill.addRequestHandlers({
          canHandle() {
            return true;
          },
          handle(input) {
            return input.responseBuilder
              .speak('Hello')
              .reprompt('bye')
              .getResponse();
          },
        });
        const result = await skill.createLambdaHandler()(requestEnvelope);
        expect(result).toMatchObject({
          response: {
            outputSpeech: {
              ssml: '<speak>Hello</speak>',
              type: 'SSML',
            },
            reprompt: {
              outputSpeech: {
                ssml: '<speak>bye</speak>',
                type: 'SSML',
              },
            },
            shouldEndSession: false,
          },
          sessionAttributes: {
            __talkyjs: {
              recordedResponse: {
                outputSpeech: {
                  ssml: '<speak>Hello</speak>',
                  type: 'SSML',
                },
                reprompt: {
                  outputSpeech: {
                    ssml: '<speak>bye</speak>',
                    type: 'SSML',
                  },
                },
                shouldEndSession: false,
              },
            },
          },
          userAgent: expect.any(String),
          version: expect.any(String),
        });
      });
    });
  });
  describe.skip('openingTalk', () => {
    beforeEach(() => {
      requestEnvelope = new RequestEnvelopeFactory(
        new LaunchRequestFactory()
      ).getRequest();
      skill = new SkillFactory({
        apiClient: {
          useDefault: true,
        },
        opening: {
          text: 'opening talk is here',
        },
      });
    });
    it('should execute the skill', async () => {
      await expect(
        skill.createLambdaHandler()(requestEnvelope)
      ).rejects.toMatchObject({
        name: 'ServiceError',
        statusCode: 401,
        response: {
          type: 'INVALID_AUTHENTICATION_TOKEN',
          message: 'The authentication token is not valid.',
        },
      });
    });
  });
  describe('addRequestHandlers', () => {
    beforeEach(() => {
      requestEnvelope = new RequestEnvelopeFactory(
        new LaunchRequestFactory()
      ).getRequest();
      skill = new SkillFactory({});
    });
    it('should execute the skill', async () => {
      skill.addRequestHandlers({
        canHandle(input) {
          return input.requestEnvelope.request.type === 'LaunchRequest';
        },
        handle(input) {
          return input.responseBuilder.speak('hello').getResponse();
        },
      });
      await expect(
        skill.createLambdaHandler()(requestEnvelope)
      ).resolves.toMatchObject({
        response: {
          outputSpeech: {
            ssml: '<speak>hello</speak>',
            type: 'SSML',
          },
        },
        sessionAttributes: {},
        userAgent: expect.any(String),
        version: expect.any(String),
      });
    });
  });
});
