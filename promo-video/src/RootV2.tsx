import React from "react";
import {Composition} from "remotion";
import {HubAwakeningRebuild} from "./v2/HubAwakeningRebuild";
import {CodeWorkflowJourney} from "./v2/CodeWorkflowJourney";

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
  </>
);
