import { redirect } from "next/navigation";
import { FitcalLandingPage } from "@/components/fitcal/landing-page";
import { getChallengeSnapshot } from "@/components/fitcal/challenge-utils";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const snapshot = getChallengeSnapshot();

  return <FitcalLandingPage snapshot={snapshot} />;
}
