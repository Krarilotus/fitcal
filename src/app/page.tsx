import { FitcalLandingPage } from "@/components/fitcal/landing-page";
import { getChallengeSnapshot } from "@/components/fitcal/challenge-utils";

export default function Home() {
  const snapshot = getChallengeSnapshot();

  return <FitcalLandingPage snapshot={snapshot} />;
}
