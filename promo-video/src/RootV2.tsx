import React from "react";
import {Composition} from "remotion";
import {HubAwakeningRebuild} from "./v2/HubAwakeningRebuild";
import {CodeWorkflowJourney} from "./v2/CodeWorkflowJourney";
import {IntentToResults} from "./v2/IntentToResults";

export const RootV2: React.FC = () => (
  <>
    <Composition
      id="HubAwakeningRebuild"
      component={HubAwakeningRebuild}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="CodeWorkflowJourney"
      component={CodeWorkflowJourney}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="IntentToResults"
      component={IntentToResults}
      durationInFrames={210}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
