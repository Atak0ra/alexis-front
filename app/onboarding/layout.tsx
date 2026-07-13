"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getApiKey } from "@/lib/session";
import { OnboardingProvider } from "@/lib/onboarding-context";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getApiKey()) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return <OnboardingProvider>{children}</OnboardingProvider>;
}
