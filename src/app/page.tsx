import { redirect } from "next/navigation";
import { RegistrationStatus } from "@prisma/client";
import { FitcalLandingPage } from "@/components/fitcal/landing-page";
import { getChallengeSnapshot } from "@/components/fitcal/challenge-utils";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  if (user?.registrationStatus === RegistrationStatus.APPROVED) {
    redirect("/dashboard");
  }

  const snapshot = getChallengeSnapshot();

  return <FitcalLandingPage snapshot={snapshot} />;
}
