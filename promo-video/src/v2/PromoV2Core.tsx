import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {HubAwakeningRebuild} from "./HubAwakeningRebuild";
import {CodeWorkflowJourney} from "./CodeWorkflowJourney";
import {IntentToResults} from "./IntentToResults";
import {KnowledgeCrystallization} from "./KnowledgeCrystallization";
import {BrandLockup} from "./BrandLockup";
import {InformationFlood} from "./InformationFlood";
import {CollectionIsNotKnowledge} from "./CollectionIsNotKnowledge";

export const PromoV2Core: React.FC = () => (
  <AbsoluteFill style={{background: "#02040A"}}>
    <Sequence from={0} durationInFrames={150} premountFor={30}><HubAwakeningRebuild /></Sequence>
    <Sequence from={150} durationInFrames={240} premountFor={30}><CodeWorkflowJourney /></Sequence>
    <Sequence from={390} durationInFrames={210} premountFor={30}><IntentToResults /></Sequence>
    <Sequence from={600} durationInFrames={120} premountFor={30}><KnowledgeCrystallization /></Sequence>
    <Sequence from={720} durationInFrames={90} premountFor={30}><BrandLockup /></Sequence>
  </AbsoluteFill>
);

export const PromoV2Full: React.FC = () => (
  <AbsoluteFill style={{background: "#02040A"}}>
    <Sequence from={0} durationInFrames={120} premountFor={30}><InformationFlood /></Sequence>
    <Sequence from={120} durationInFrames={120} premountFor={30}><CollectionIsNotKnowledge /></Sequence>
    <Sequence from={240} durationInFrames={150} premountFor={30}><HubAwakeningRebuild /></Sequence>
    <Sequence from={390} durationInFrames={240} premountFor={30}><CodeWorkflowJourney /></Sequence>
    <Sequence from={630} durationInFrames={210} premountFor={30}><IntentToResults /></Sequence>
    <Sequence from={840} durationInFrames={120} premountFor={30}><KnowledgeCrystallization /></Sequence>
    <Sequence from={960} durationInFrames={90} premountFor={30}><BrandLockup /></Sequence>
  </AbsoluteFill>
);
