import { RequestInterceptor, isNewSession } from 'ask-sdk-core';
import { isSkillEvent } from '@ask-utils/core';
import { TalkyJSSkillConfig } from '../../framework';

export const createOpningTalkInterceptor = ({
  opening,
}: TalkyJSSkillConfig): RequestInterceptor | undefined => {
  if (!opening) return;
  const speechText = (() => {
    if (opening.ssml) return opening.ssml;
    if (opening.text) {
      return `<speak>${opening.text}</speak>`;
    }
    return undefined;
  })();
  if (!speechText) return;
  return {
    async process(input) {
      console.log({ speechText });
      const { requestEnvelope, serviceClientFactory } = input;
      if (!serviceClientFactory) return;
      if (!isNewSession(requestEnvelope)) return;
      if (isSkillEvent(requestEnvelope)) return;

      const directiveServiceClient = serviceClientFactory.getDirectiveServiceClient();

      // build the progressive response directive
      await directiveServiceClient.enqueue({
        header: {
          requestId: requestEnvelope.request.requestId,
        },
        directive: {
          type: 'VoicePlayer.Speak',
          speech: speechText,
        },
      });
    },
  };
};
