"use client";

import { Suspense, useEffect } from "react";
import DashboardClient from "./DashboardClient";
import { useRouter } from "next/navigation";

function DashboardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-600">
      Loading dashboard...
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  // useEffect(() => {
  //   const token = sessionStorage.getItem("app_token");

  //   if (!token) {
  //     router.replace("/auth/login?error=login+first");
  //   }
  // }, [router]);

  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}