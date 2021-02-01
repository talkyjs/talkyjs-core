import { HandlerInput } from 'ask-sdk-core';
import { getRequest, isIntentRequestType } from '@ask-utils/core';
import { Request } from 'ask-sdk-model'; // 'ask-sdk-core/node_modules/ask-sdk-model'
import { Router } from '../model';
import { shouldMatchIntentRequest, shouldMatchRequestType } from './helpers';
import { RouteSituationMatcher } from './SituationMatcher';

type State = string;

export class RouteMatcher<T extends State = State> {
  private readonly input: HandlerInput;
  private readonly request: Request;
  private readonly targetRoute: Router<T>;
  private canHandle: boolean = false;
  public constructor(input: HandlerInput, targetRoute: Router<T>) {
    this.input = input;
    this.request = getRequest(input);
    this.targetRoute = targetRoute;
  }

  private async executeCustomSituation(): Promise<void> {
    if (!this.targetRoute.situation || !this.targetRoute.situation.custom)
      return;
    this.canHandle = await this.targetRoute.situation.custom(this.input);
  }

  /**
   * Check the situation
   * - invocationCount
   * - turnCount
   **/
  private handleRequestSituation() {
    const situationMatcher = new RouteSituationMatcher(
      this.input,
      this.targetRoute
    );
    this.canHandle = situationMatcher.handle(this.canHandle);
  }

  public async match(): Promise<void> {
    const { request, targetRoute } = this;
    /**
     * If request type unmatch, always return false
     */
    if (!shouldMatchRequestType(request, targetRoute)) {
      this.canHandle = false;
      return;
    }

    /**
     * If the request is intent request should check the intent name
     */
    if (isIntentRequestType(this.request)) {
      const shouldMatchIntent = shouldMatchIntentRequest(request, targetRoute);
      if (!shouldMatchIntent) return;
      this.canHandle = shouldMatchIntentRequest(request, targetRoute);
    } else {
      // If the request is not Intent Request, set true.(We can overwrite by state and custom)
      this.canHandle = true;
    }

    /**
     * Check the situation
     * - invocationCount
     * - turnCount
     **/
    this.handleRequestSituation();
    /**/

    /**
     * Execute custom matcher function
     */
    await this.executeCustomSituation();
  }

  public getMatchResult(): boolean {
    return this.canHandle;
  }
}
