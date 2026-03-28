"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { organizationService } from "@/lib/services/organization.service";
import { projectService } from "@/lib/services/project.service";
import { featureFlagService } from "@/lib/services/feature-flag.service";

export default function DashboardPage() {
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [flagCount, setFlagCount] = useState<number | null>(null);
  const [activeFlagCount, setActiveFlagCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        /* 1 — Orgs */
        const orgRes = await organizationService.getAll();
        const orgs = orgRes.data ?? [];
        setOrgCount(orgs.length);

        if (orgs.length === 0) {
          setFlagCount(0);
          setActiveFlagCount(0);
          return;
        }

        /* 2 — Projects for all orgs (parallel) */
        const projectResults = await Promise.all(
          orgs.map((o) =>
            projectService
              .getByOrganization((o.id ?? o["Id"] ?? "") as string)
              .catch(() => ({ data: [] as typeof orgs }))
          )
        );

        const allProjects = projectResults.flatMap((res, i) => {
          const orgId = (orgs[i].id ?? orgs[i]["Id"] ?? "") as string;
          return (res.data ?? []).map((p) => ({
            orgId,
            projectId: (p.id ?? p["Id"] ?? "") as string,
          }));
        });

        if (allProjects.length === 0) {
          setFlagCount(0);
          setActiveFlagCount(0);
          return;
        }

        /* 3 — Flags for all projects (parallel) */
        const flagResults = await Promise.all(
          allProjects.map(({ orgId, projectId }) =>
            featureFlagService
              .getByProject(orgId, projectId)
              .catch(() => ({ success: false, data: [] }))
          )
        );

        const allFlags = flagResults.flatMap((res) => res.data ?? []);
        setFlagCount(allFlags.length);

        /* Active = at least one environment with isEnabled = true */
        const active = allFlags.filter((flag) => {
          const envs =
            flag.environments ??
            (flag as { Environments?: unknown[] })["Environments"] ??
            [];
          return (envs as { isEnabled?: boolean; IsEnabled?: boolean }[]).some(
            (env) => env.isEnabled ?? env["IsEnabled"] ?? false
          );
        });
        setActiveFlagCount(active.length);
      } catch {
        setOrgCount((v) => v ?? 0);
        setFlagCount(0);
        setActiveFlagCount(0);
      }
    }

    loadStats();
  }, []);

  const stats = [
    {
      label: "Organizasyonlar",
      value: orgCount === null ? "—" : orgCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: "from-violet-500 to-purple-600",
      href: "/dashboard/organizations",
    },
    {
      label: "Toplam Flag",
      value: flagCount === null ? "—" : flagCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      color: "from-blue-500 to-cyan-600",
      href: "/dashboard/flags",
    },
    {
      label: "Aktif Flagler",
      value: activeFlagCount === null ? "—" : activeFlagCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-emerald-500 to-green-600",
      href: "/dashboard/flags",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Genel Bakış</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Switchly paneline hoş geldiniz.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block">
            <div className="glass-card rounded-2xl p-5 hover:border-violet-500/40 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>
                  {s.icon}
                </div>
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick action */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Hızlı Başlangıç</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          İlk organizasyonunuzu oluşturun ve feature flag yönetimine başlayın.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/organizations" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20">
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Organizasyon Oluştur
            </span>
          </Link>
          <Link href="/dashboard/flags" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: "var(--sidebar-item-bg)", color: "var(--text-muted)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            Flag Yönetimi
          </Link>
        </div>
      </div>
    </div>
  );
}
