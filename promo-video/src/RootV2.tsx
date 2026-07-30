import React from "react";
import {Composition} from "remotion";
import {HubAwakeningRebuild} from "./v2/HubAwakeningRebuild";
import {CodeWorkflowJourney} from "./v2/CodeWorkflowJourney";
import {IntentToResults} from "./v2/IntentToResults";
import {KnowledgeCrystallization} from "./v2/KnowledgeCrystallization";
import {BrandLockup} from "./v2/BrandLockup";
import {PromoV2Core, PromoV2Full} from "./v2/PromoV2Core";
import {InformationFlood} from "./v2/InformationFlood";
import {CollectionIsNotKnowledge} from "./v2/CollectionIsNotKnowledge";

export const RootV2: React.FC = () => (
  <>
    <Composition
      id="InformationFlood"
      component={InformationFlood}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="CollectionIsNotKnowledge"
      component={CollectionIsNotKnowledge}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
    />
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
    <Composition
      id="KnowledgeCrystallization"
      component={KnowledgeCrystallization}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="BrandLockup"
      component={BrandLockup}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="PromoV2Core"
      component={PromoV2Core}
      durationInFrames={810}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="PromoV2Full"
      component={PromoV2Full}
      durationInFrames={1050}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
