"use client";

import { useEffect, useState } from "react";
import { organizationService } from "@/lib/services/organization.service";
import { projectService } from "@/lib/services/project.service";
import { environmentService } from "@/lib/services/environment.service";
import { projectSettingService } from "@/lib/services/project-setting.service";
import type { Organization } from "@/lib/types/organization";
import type { Project } from "@/lib/types/project";
import type { ProjectEnvironment } from "@/lib/types/environment";
import type {
  ProjectSettingByEnvironmentDto,
  ProjectSettingDataType,
} from "@/lib/types/project-setting";

/* ── env colour palette (by sort order index) ─────────────────── */
const ENV_COLORS = [
  { bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" },
  { bg: "rgba(249,115,22,0.15)",  color: "#f97316" },
  { bg: "rgba(168,85,247,0.15)",  color: "#a855f7" },
  { bg: "rgba(236,72,153,0.15)",  color: "#ec4899" },
];

/* ── DataType badge helpers ────────────────────────────────────── */
function dtLabel(dt?: ProjectSettingDataType): string {
  if (dt === 0 || dt === "String")  return "STR";
  if (dt === 1 || dt === "Number")  return "NUM";
  if (dt === 2 || dt === "Boolean") return "BOOL";
  if (dt === 3 || dt === "Json")    return "JSON";
  return String(dt ?? "?");
}
function dtStyle(dt?: ProjectSettingDataType): React.CSSProperties {
  if (dt === 0 || dt === "String")  return { background: "rgba(59,130,246,0.15)",  color: "#3b82f6" };
  if (dt === 1 || dt === "Number")  return { background: "rgba(16,185,129,0.15)",  color: "#10b981" };
  if (dt === 2 || dt === "Boolean") return { background: "rgba(249,115,22,0.15)",  color: "#f97316" };
  if (dt === 3 || dt === "Json")    return { background: "rgba(168,85,247,0.15)",  color: "#a855f7" };
  return { background: "rgba(100,116,139,0.15)", color: "#64748b" };
}

/* ── Shared eye icons ──────────────────────────────────────────── */
const EyeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

/* ════════════════════════════════════════════════════════════════ */
export default function ProjectsPage() {

  /* ── Organizations ─────────────────────────────────────── */
  const [orgs, setOrgs]                   = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading]     = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  /* ── Projects ──────────────────────────────────────────── */
  const [projects, setProjects]                 = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading]   = useState(false);
  const [projectsError, setProjectsError]       = useState("");

  /* ── Card expansion ────────────────────────────────────── */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Environments per project ──────────────────────────── */
  const [envs, setEnvs]               = useState<Record<string, ProjectEnvironment[]>>({});
  const [envsLoading, setEnvsLoading] = useState<Record<string, boolean>>({});

  /* ── Selected env per project ──────────────────────────── */
  const [selectedEnvId, setSelectedEnvId] = useState<Record<string, string>>({});

  /* ── Settings by env: key = "projectId:envId" ──────────── */
  const [envSettings, setEnvSettings]           = useState<Record<string, ProjectSettingByEnvironmentDto[]>>({});
  const [envSettingsLoading, setEnvSettingsLoading] = useState<Set<string>>(new Set());

  /* ── Revealed secrets: key = "settingId" ──────────────── */
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  /* ── Project key visibility ────────────────────────────── */
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  /* ── Create modal ──────────────────────────────────────── */
  const [modalOpen, setModalOpen]               = useState(false);
  const [newName, setNewName]                   = useState("");
  const [newDescription, setNewDescription]     = useState("");
  const [creating, setCreating]                 = useState(false);
  const [createError, setCreateError]           = useState("");

  /* ═══ fetch orgs on mount ════════════════════════════════ */
  useEffect(() => {
    organizationService.getAll()
      .then((res) => {
        const list = res.data ?? [];
        setOrgs(list);
        if (list.length > 0) setSelectedOrgId(list[0].id ?? null);
      })
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, []);

  /* ═══ fetch projects when org changes ════════════════════ */
  useEffect(() => {
    if (!selectedOrgId) return;
    setProjectsLoading(true);
    setProjectsError("");
    setProjects([]);
    setExpandedId(null);
    setEnvs({});
    setSelectedEnvId({});
    setEnvSettings({});
    setEnvSettingsLoading(new Set());
    setVisibleKeys(new Set());
    setVisibleSecrets(new Set());

    projectService.getByOrganization(selectedOrgId)
      .then((res) => setProjects(res.data ?? []))
      .catch((err: unknown) =>
        setProjectsError(err instanceof Error ? err.message : "Yüklenemedi.")
      )
      .finally(() => setProjectsLoading(false));
  }, [selectedOrgId]);

  /* ═══ toggle card expansion — lazy-fetch envs ════════════ */
  async function toggleExpand(projectId: string) {
    if (expandedId === projectId) { setExpandedId(null); return; }
    setExpandedId(projectId);
    await ensureEnvs(projectId);
  }

  /* ═══ lazy-fetch environments ════════════════════════════ */
  async function ensureEnvs(projectId: string) {
    if (!selectedOrgId || envs[projectId] !== undefined || envsLoading[projectId]) return;
    setEnvsLoading((p) => ({ ...p, [projectId]: true }));
    try {
      const res  = await environmentService.getByProject(projectId, selectedOrgId);
      const list = (res.data ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setEnvs((p) => ({ ...p, [projectId]: list }));
    } catch {
      setEnvs((p) => ({ ...p, [projectId]: [] }));
    } finally {
      setEnvsLoading((p) => ({ ...p, [projectId]: false }));
    }
  }

  /* ═══ select env → lazy-fetch settings for that env ═════ */
  async function handleEnvSelect(projectId: string, envId: string) {
    // Toggle off if already selected
    if (selectedEnvId[projectId] === envId) {
      setSelectedEnvId((p) => { const n = { ...p }; delete n[projectId]; return n; });
      return;
    }
    setSelectedEnvId((p) => ({ ...p, [projectId]: envId }));
    setVisibleSecrets(new Set()); // reset revealed secrets on env change

    const cacheKey = `${projectId}:${envId}`;
    if (envSettings[cacheKey] !== undefined || envSettingsLoading.has(cacheKey) || !selectedOrgId) return;

    setEnvSettingsLoading((p) => { const n = new Set(p); n.add(cacheKey); return n; });
    try {
      const res = await projectSettingService.getByEnvironment(projectId, selectedOrgId, envId);
      setEnvSettings((p) => ({ ...p, [cacheKey]: res.data ?? [] }));
    } catch {
      setEnvSettings((p) => ({ ...p, [cacheKey]: [] }));
    } finally {
      setEnvSettingsLoading((p) => { const n = new Set(p); n.delete(cacheKey); return n; });
    }
  }

  /* ═══ create project ═════════════════════════════════════ */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !selectedOrgId) return;
    setCreating(true);
    setCreateError("");
    try {
      await projectService.create(selectedOrgId, newName.trim(), newDescription.trim());
      setModalOpen(false);
      setNewName("");
      setNewDescription("");
      const res = await projectService.getByOrganization(selectedOrgId);
      setProjects(res.data ?? []);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  /* ═══ helpers ════════════════════════════════════════════ */
  function toggleKeyVisibility(id: string) {
    setVisibleKeys((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSecretVisibility(id: string) {
    setVisibleSecrets((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function maskKey(key: string) {
    if (key.length <= 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
  }
  function getInitials(name?: string) {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const gradients   = [
    "from-violet-500 to-purple-600", "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-600",  "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-600",     "from-indigo-500 to-blue-600",
  ];

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Projeler</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {projectsLoading ? "Yükleniyor…" : selectedOrgId ? `${projects.length} proje` : "Bir organizasyon seçin"}
          </p>
        </div>
        {selectedOrgId && (
          <button
            onClick={() => { setModalOpen(true); setCreateError(""); setNewName(""); setNewDescription(""); }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20 flex-shrink-0"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Proje
            </span>
          </button>
        )}
      </div>

      {/* ── Org selector ─────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap pb-4"
        style={{ borderBottom: "1px solid var(--divider)" }}>
        {/* Label + divider */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <svg className="w-3.5 h-3.5" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
            Organizasyon
          </span>
          <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--divider)" }} />
        </div>

        {/* Org pills */}
        {orgsLoading ? (
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 w-24 rounded-full animate-pulse" style={{ background: "var(--input-bg)" }} />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Henüz organizasyon yok.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {orgs.map((org) => {
              const active = org.id === selectedOrgId;
              return (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id ?? null)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? "rgba(124,58,237,0.18)" : "transparent",
                    color: active ? "#a78bfa" : "var(--text-muted)",
                    border: active ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
                    boxShadow: active ? "0 0 0 1px rgba(124,58,237,0.1)" : "none",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: active ? "#7c3aed" : "#475569" }}
                  >
                    {getInitials(org.name)}
                  </span>
                  {org.name ?? "—"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Projects ─────────────────────────────────────── */}
      {selectedOrgId && (
        <>
          {projectsError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 text-sm">{projectsError}</p>
            </div>
          )}

          {/* Skeleton */}
          {projectsLoading && (
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-1/4" />
                      <div className="h-3 bg-white/5 rounded w-2/5" />
                    </div>
                    <div className="hidden md:block h-9 w-56 bg-white/5 rounded-lg flex-shrink-0" />
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:block h-4 w-20 bg-white/5 rounded" />
                      <div className="h-8 w-24 bg-white/5 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!projectsLoading && !projectsError && projects.length === 0 && (
            <div className="glass-card rounded-2xl p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.1)" }}>
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                {selectedOrg?.name ?? "Bu organizasyon"} için henüz proje yok
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>İlk projeyi oluşturarak başlayın.</p>
              <button
                onClick={() => { setModalOpen(true); setCreateError(""); setNewName(""); setNewDescription(""); }}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Proje Ekle
                </span>
              </button>
            </div>
          )}

          {/* ── Project list (full-width) ─────────────── */}
          {!projectsLoading && projects.length > 0 && (
            <div className="flex flex-col gap-4">
              {projects.map((project, i) => {
                const projectId  = (project.id  ?? project["Id"]  ?? String(i)) as string;
                const projectName = (project.name ?? project["Name"]) as string | undefined;
                const projectKey  = (project.key  ?? project["Key"])  as string | undefined;
                const projectDesc = (project.description ?? project["Description"]) as string | undefined;
                const projectCreatedAt = (project.createdAt ?? project["CreatedAt"]) as string | undefined;
                const isKeyVisible = visibleKeys.has(projectId);
                const isExpanded   = expandedId === projectId;
                const projectEnvs  = envs[projectId];
                const envCount     = projectEnvs?.length;
                const isEnvsLoading = envsLoading[projectId] ?? false;
                const activeEnvId  = selectedEnvId[projectId];
                const settingsCacheKey = activeEnvId ? `${projectId}:${activeEnvId}` : "";
                const activeSettings  = settingsCacheKey ? (envSettings[settingsCacheKey] ?? null) : null;
                const isSettingsLoading = settingsCacheKey ? envSettingsLoading.has(settingsCacheKey) : false;

                return (
                  <div
                    key={projectId}
                    className="glass-card rounded-2xl p-5 transition-all"
                    style={{ borderColor: isExpanded ? "rgba(124,58,237,0.4)" : undefined }}
                  >
                    {/* ── Card header row ──────────────────────── */}
                    <div className="flex items-center gap-4">

                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-lg`}>
                        {getInitials(projectName)}
                      </div>

                      {/* Name + date + description */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{projectName ?? "—"}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {projectCreatedAt && (
                            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                              {new Date(projectCreatedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          )}
                          {projectDesc && (
                            <p className="text-xs truncate max-w-xs" style={{ color: "var(--text-muted)" }}>
                              {projectCreatedAt && <span className="mr-2" style={{ color: "var(--text-faint)" }}>·</span>}
                              {projectDesc}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Project Key — visible on md+ */}
                      <div className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 w-60 flex-shrink-0"
                        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="flex-1 text-xs font-mono truncate select-all"
                          style={{ color: projectKey ? "var(--text-secondary)" : "var(--text-faint)", letterSpacing: isKeyVisible ? "0.02em" : "0.15em" }}>
                          {projectKey ? (isKeyVisible ? projectKey : maskKey(projectKey)) : "—"}
                        </span>
                        {projectKey && (
                          <button onClick={() => toggleKeyVisibility(projectId)} className="flex-shrink-0 p-0.5 rounded hover:opacity-80" style={{ color: "var(--text-faint)" }}>
                            {isKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        )}
                      </div>

                      {/* Stats + Ayrıntılar button */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            <span className="text-xs">0 flag</span>
                          </div>
                          <div className="flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs">{envCount !== undefined ? `${envCount} env.` : "— env."}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpand(projectId)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                          style={{ background: isExpanded ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)", color: "#a78bfa" }}
                        >
                          Ayrıntılar
                          <svg className="w-3 h-3 transition-transform duration-200"
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Project Key — mobile fallback */}
                    <div className="md:hidden mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span className="flex-1 text-xs font-mono truncate select-all"
                        style={{ color: projectKey ? "var(--text-secondary)" : "var(--text-faint)", letterSpacing: isKeyVisible ? "0.02em" : "0.15em" }}>
                        {projectKey ? (isKeyVisible ? projectKey : maskKey(projectKey)) : "—"}
                      </span>
                      {projectKey && (
                        <button onClick={() => toggleKeyVisibility(projectId)} className="flex-shrink-0 p-0.5 rounded hover:opacity-80" style={{ color: "var(--text-faint)" }}>
                          {isKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      )}
                    </div>

                    {/* ══ Expanded section ══════════════════════ */}
                    {isExpanded && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--divider)" }}>

                        {/* ── Environment list (horizontal pills) ── */}
                        {isEnvsLoading ? (
                          <div className="flex flex-wrap gap-2">
                            {[...Array(3)].map((_, k) => (
                              <div key={k} className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "var(--input-bg)" }} />
                            ))}
                          </div>
                        ) : !projectEnvs || projectEnvs.length === 0 ? (
                          <div className="py-5 flex flex-col items-center text-center">
                            <svg className="w-8 h-8 mb-2 text-violet-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Henüz environment yok</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {projectEnvs.map((env, ei) => {
                              const envId      = (env.id   ?? env["Id"]          ?? String(ei)) as string;
                              const envName    = (env.name ?? env["Name"])        as string | undefined;
                              const envSort    = (env.sortOrder ?? env["SortOrder"] ?? ei) as number;
                              const col        = ENV_COLORS[ei % ENV_COLORS.length];
                              const isSelected = activeEnvId === envId;

                              return (
                                <button
                                  key={envId}
                                  onClick={() => handleEnvSelect(projectId, envId)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                  style={{
                                    background: isSelected ? "rgba(124,58,237,0.15)" : "var(--input-bg)",
                                    border: isSelected ? "1px solid rgba(124,58,237,0.4)" : "1px solid var(--input-border)",
                                    color: isSelected ? "#a78bfa" : "var(--text-muted)",
                                  }}
                                >
                                  {/* Colour dot */}
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: col.color }}
                                  />
                                  {envName ?? `Env ${envSort + 1}`}
                                  {/* Down-chevron animates to up when selected */}
                                  <svg
                                    className="w-3 h-3 transition-transform duration-200"
                                    style={{ transform: isSelected ? "rotate(180deg)" : "rotate(0deg)" }}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* ── Settings for selected env ──────── */}
                        {activeEnvId && (
                          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--divider)" }}>

                            {/* Section label */}
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                                Settings
                              </p>
                            </div>

                            {/* Loading */}
                            {isSettingsLoading && (
                              <div className="space-y-2">
                                {[...Array(4)].map((_, k) => (
                                  <div key={k} className="h-9 rounded-lg animate-pulse" style={{ background: "var(--input-bg)" }} />
                                ))}
                              </div>
                            )}

                            {/* Empty */}
                            {!isSettingsLoading && activeSettings !== null && activeSettings.length === 0 && (
                              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                                Bu environment için setting yok.
                              </p>
                            )}

                            {/* Settings list */}
                            {!isSettingsLoading && activeSettings && activeSettings.length > 0 && (
                              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--input-border)" }}>
                                {activeSettings.map((setting, si) => {
                                  const settingId   = (setting.id   ?? setting["Id"])          as string | undefined;
                                  const settingKey  = (setting.key  ?? setting["Key"])          as string | undefined;
                                  const settingDesc = (setting.description ?? setting["Description"]) as string | undefined;
                                  const dataType    = (setting.dataType  ?? setting["DataType"])  as string | number | undefined;
                                  const isSecret    = (setting.isSecret  ?? setting["IsSecret"])  as boolean | undefined;
                                  const valObj      = (setting.value ?? setting["Value"]) as { value?: string | null } | null | undefined;
                                  const rawValue    = valObj?.value ?? (valObj as Record<string, unknown>)?.["Value"] as string | null | undefined;
                                  const revealed    = visibleSecrets.has(settingId ?? "");

                                  return (
                                    <div key={settingId ?? si}
                                      style={{
                                        borderTop: si > 0 ? "1px solid var(--divider)" : "none",
                                        background: si % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                                      }}>
                                      <div className="flex items-start gap-2 px-3 py-2.5">

                                        {/* Left: key + badges + description */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center flex-wrap gap-1.5">
                                            <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                                              {settingKey ?? "—"}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase leading-none" style={dtStyle(dataType)}>
                                              {dtLabel(dataType)}
                                            </span>
                                            {isSecret && (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase leading-none"
                                                style={{ background: "rgba(251,191,36,0.15)", color: "#f59e0b" }}>
                                                secret
                                              </span>
                                            )}
                                          </div>
                                          {settingDesc && (
                                            <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--text-faint)" }}>
                                              {settingDesc}
                                            </p>
                                          )}
                                        </div>

                                        {/* Right: value + eye */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0 max-w-[130px]">
                                          <span className="text-xs font-mono truncate"
                                            style={{
                                              color: rawValue != null ? "var(--text-secondary)" : "var(--text-faint)",
                                              letterSpacing: isSecret && !revealed && rawValue ? "0.06em" : "normal",
                                            }}>
                                            {rawValue == null
                                              ? "—"
                                              : isSecret && !revealed
                                                ? "•".repeat(Math.min(rawValue.length || 8, 10))
                                                : rawValue}
                                          </span>
                                          {isSecret && rawValue != null && (
                                            <button
                                              onClick={() => toggleSecretVisibility(settingId ?? "")}
                                              className="flex-shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
                                              style={{ color: "var(--text-faint)" }}
                                            >
                                              {revealed ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* ══ end expanded ══ */}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Create Modal ─────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Yeni Proje</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {selectedOrg?.name ?? "Organizasyon"} için proje oluştur
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: "var(--text-muted)", background: "var(--input-bg)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Proje Adı <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Web Frontend" autoFocus required
                  className="input-field w-full rounded-xl px-4 py-3 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Açıklama
                  <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-faint)" }}>(opsiyonel)</span>
                </label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Projeyi kısaca açıklayın…" rows={3}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--input-bg)", color: "var(--text-muted)", border: "1px solid var(--input-border)" }}>
                  İptal
                </button>
                <button type="submit" disabled={creating || !newName.trim()}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {creating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Oluşturuluyor…
                      </>
                    ) : "Oluştur"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
