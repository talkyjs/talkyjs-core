import { HandlerInput } from 'ask-sdk-core';
import { Router } from '../model';
import { compareCountableSituation } from './helpers';
import { SituationService } from '../../Situation/Situation.service';

type State = string;

export class RouteSituationMatcher<T extends State = State> {
  //private readonly input: HandlerInput;
  private readonly targetRoute: Router<T>;
  private readonly situationManager: SituationService;

  constructor(input: HandlerInput, targetRoute: Router<T>) {
    //this.input = input;
    this.targetRoute = targetRoute;
    this.situationManager = new SituationService(input);
  }

  /**
   * check the state
   * __talkyjs: {
   *     sessionSituation: {
   *         state
   *     }
   * }
   * @param canHandle
   */
  public handleByState(canHandle: boolean) {
    if (!this.targetRoute.situation) return canHandle;
    const currentState = this.situationManager.getState();
    const { state } = this.targetRoute.situation;
    if (state) {
      canHandle = state === currentState;
    }
    return canHandle;
  }

  /**
   * check the invocation count
   * __talkyjs: {
   *     sessionSituation: {
   *         invocation count
   *     }
   * }
   * @param canHandle
   */
  public handleByInvocationCount(canHandle: boolean) {
    if (!this.targetRoute.situation) return canHandle;
    const situation = this.situationManager.getSituation();
    const { invocationCount } = this.targetRoute.situation;
    if (invocationCount) {
      const compareByInvocationCount = compareCountableSituation(
        invocationCount,
        situation.invocationNumber
      );
      if (compareByInvocationCount)
        canHandle = compareByInvocationCount === 'true';
    }
    return canHandle;
  }

  /**
   * check the turn count
   * __talkyjs: {
   *     sessionSituation: {
   *         turn count
   *     }
   * }
   * @param canHandle
   */
  public handleByTurnCount(canHandle: boolean) {
    if (!this.targetRoute.situation) return canHandle;
    const { turnCount } = this.targetRoute.situation;
    const situation = this.situationManager.getSituation();
    if (turnCount) {
      const compareByTurnCount = compareCountableSituation(
        turnCount,
        situation.turnCount
      );
      if (compareByTurnCount) canHandle = compareByTurnCount === 'true';
    }
    return canHandle;
  }

  public handle(canHandle: boolean) {
    if (!this.targetRoute.situation) return canHandle;
    canHandle = this.handleByState(canHandle);
    canHandle = this.handleByInvocationCount(canHandle);
    canHandle = this.handleByTurnCount(canHandle);
    return canHandle;
  }
}
