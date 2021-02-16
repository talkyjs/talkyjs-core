import {
  HandlerInputFactory,
  RequestEnvelopeFactory,
  MockPersistenceAdapter,
  IntentRequestFactory,
} from '@ask-utils/test';
import { HandlerInput } from 'ask-sdk-core';
import { Router } from '../../../model';
import { RouteSituationMatcher } from '../../../matcher/SituationMatcher';

describe('RouteSituationMatcher', () => {
  let handlerInput: HandlerInput;
  let adapter = new MockPersistenceAdapter();
  describe('handleByState', () => {
    const router: Router = {
      requestType: 'IntentRequest',
      situation: {
        state: 'Hello',
      },
      handler: input => input.responseBuilder.getResponse(),
    };
    let requestEnvelopeFactory: RequestEnvelopeFactory;

    beforeEach(() => {
      requestEnvelopeFactory = new RequestEnvelopeFactory(
        new IntentRequestFactory().setIntent({
          name: 'HelloIntent',
          confirmationStatus: 'NONE',
        })
      );
    });
    it.each([
      [undefined, false],
      ['', false],
      ['Hello', true],
      ['hello', false],
    ])('state is %p, should return %p', (state, expectedBehavior) => {
      requestEnvelopeFactory.session.putAttributes({
        __talkyjs: {
          sessionSituation: {
            state,
          },
        },
      });
      handlerInput = new HandlerInputFactory(requestEnvelopeFactory)
        .setPersistanceAdapter(adapter)
        .create();
      const matcher = new RouteSituationMatcher(handlerInput, router);
      expect(matcher.handleByState(false)).toEqual(expectedBehavior);
    });
  });
  describe('handleByTurnCount', () => {
    const router: Router = {
      requestType: 'IntentRequest',
      situation: {
        turnCount: {
          eq: 1,
        },
      },
      handler: input => input.responseBuilder.getResponse(),
    };
    let requestEnvelopeFactory: RequestEnvelopeFactory;

    beforeEach(() => {
      requestEnvelopeFactory = new RequestEnvelopeFactory(
        new IntentRequestFactory().setIntent({
          name: 'HelloIntent',
          confirmationStatus: 'NONE',
        })
      );
    });
    it.each([
      [undefined, false],
      ['', false],
      [1, true],
      [2, false],
    ])('state is %p, should return %p', (turnCount, expectedBehavior) => {
      requestEnvelopeFactory.session.putAttributes({
        __talkyjs: {
          sessionSituation: {
            turnCount,
          },
        },
      });
      handlerInput = new HandlerInputFactory(requestEnvelopeFactory)
        .setPersistanceAdapter(adapter)
        .create();
      const matcher = new RouteSituationMatcher(handlerInput, router);
      expect(matcher.handleByTurnCount(false)).toEqual(expectedBehavior);
    });

    it.each([
      [{ gte: 0 }, true],
      [{ gt: 0 }, false],
      [{ eq: 0 }, true],
      [{ lt: 0 }, false],
      [{ lte: 0 }, true],
      [{ gte: 5 }, false],
      [{ gt: 5 }, false],
      [{ eq: 5 }, false],
      [{ lt: 5 }, true],
      [{ lte: 5 }, true],
    ])(
      'should return true if the invocation Count situation is 0 (Operator; %p)',
      async (turnCount, expectedResult) => {
        handlerInput = new HandlerInputFactory(requestEnvelopeFactory)
          .setPersistanceAdapter(adapter)
          .create();
        const router: Router = {
          requestType: 'IntentRequest',
          intentName: ['AMAZON.StopIntent', 'AMAZON.CancelIntent'],
          situation: {
            turnCount,
          },
          handler: input => input.responseBuilder.getResponse(),
        };
        const matcher = new RouteSituationMatcher(handlerInput, router);
        expect(matcher.handleByTurnCount(false)).toEqual(expectedResult);
      }
    );
  });
  describe('handleByInvocationCount', () => {
    let requestEnvelopeFactory: RequestEnvelopeFactory;

    beforeEach(() => {
      requestEnvelopeFactory = new RequestEnvelopeFactory(
        new IntentRequestFactory().setIntent({
          name: 'HelloIntent',
          confirmationStatus: 'NONE',
        })
      );
    });
    it.each([
      [{ gte: 0 }, true],
      [{ gt: 0 }, false],
      [{ eq: 0 }, true],
      [{ lt: 0 }, false],
      [{ lte: 0 }, true],
      [{ gte: 5 }, false],
      [{ gt: 5 }, false],
      [{ eq: 5 }, false],
      [{ lt: 5 }, true],
      [{ lte: 5 }, true],
    ])(
      'should return true if the invocation Count situation is 0 (Operator; %p)',
      async (invocationCount, expectedResult) => {
        handlerInput = new HandlerInputFactory(requestEnvelopeFactory)
          .setPersistanceAdapter(adapter)
          .create();
        const router: Router = {
          requestType: 'IntentRequest',
          intentName: ['AMAZON.StopIntent', 'AMAZON.CancelIntent'],
          situation: {
            invocationCount,
          },
          handler: input => input.responseBuilder.getResponse(),
        };
        const matcher = new RouteSituationMatcher(handlerInput, router);
        expect(matcher.handleByInvocationCount(false)).toEqual(expectedResult);
      }
    );
  });
});
