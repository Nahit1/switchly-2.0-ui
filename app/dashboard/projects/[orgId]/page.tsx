"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { projectService } from "@/lib/services/project.service";
import type { Project } from "@/lib/types/project";

export default function ProjectsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Set of project ids whose key is currently visible
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Org name derived from the first project (backend returns it in each item)
  const orgName = (projects[0]?.organizationName ?? projects[0]?.["OrganizationName"]) as string | undefined;

  function toggleKeyVisibility(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function maskKey(key: string) {
    if (key.length <= 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
  }

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function fetchProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await projectService.getByOrganization(orgId);
      setProjects(res.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await projectService.create(orgId, newName.trim(), newDescription.trim());
      setModalOpen(false);
      setNewName("");
      setNewDescription("");
      await fetchProjects();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  function getInitials(name?: string) {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
  }

  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-2">
            <Link
              href="/dashboard/organizations"
              className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Organizasyonlar
            </Link>
            <svg className="w-3 h-3" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium truncate max-w-[160px]" style={{ color: "var(--text-secondary)" }}>
              {orgName ?? "Projeler"}
            </span>
          </nav>

          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Projeler</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {loading ? "Yükleniyor…" : `${projects.length} proje`}
          </p>
        </div>

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
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchProjects} className="ml-auto text-xs text-red-400 underline">Tekrar dene</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="h-px bg-white/5 mb-4" />
              <div className="h-6 bg-white/5 rounded w-full mb-3" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.1)" }}>
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Henüz proje yok</h3>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Bu organizasyona ait ilk projenizi oluşturun.
          </p>
          <button
            onClick={() => { setModalOpen(true); setCreateError(""); setNewName(""); setNewDescription(""); }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Proje Oluştur
            </span>
          </button>
        </div>
      )}

      {/* Projects grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => {
            const projectId = (project.id ?? project["Id"] ?? String(i)) as string;
            const projectName = (project.name ?? project["Name"]) as string | undefined;
            const projectKey = (project.key ?? project["Key"]) as string | undefined;
            const projectDesc = (project.description ?? project["Description"]) as string | undefined;
            const projectCreatedAt = (project.createdAt ?? project["CreatedAt"]) as string | undefined;
            const isVisible = visibleKeys.has(projectId);

            return (
              <div
                key={projectId}
                className="glass-card rounded-2xl p-5 hover:border-violet-500/40 transition-all group"
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg`}>
                    {getInitials(projectName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {projectName ?? "—"}
                    </h3>
                    {projectCreatedAt && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {new Date(projectCreatedAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {projectDesc && (
                  <p className="text-xs mb-4 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {projectDesc}
                  </p>
                )}

                <div className="h-px mb-4" style={{ background: "var(--divider)" }} />

                {/* Project Key */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-faint)" }}>
                    Project Key
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span
                      className="flex-1 text-xs font-mono truncate select-all"
                      style={{
                        color: projectKey ? "var(--text-secondary)" : "var(--text-faint)",
                        letterSpacing: isVisible ? "0.02em" : "0.15em",
                      }}
                    >
                      {projectKey
                        ? (isVisible ? projectKey : maskKey(projectKey))
                        : "—"}
                    </span>
                    {projectKey && (
                      <button
                        onClick={() => toggleKeyVisibility(projectId)}
                        className="flex-shrink-0 p-0.5 rounded transition-colors hover:opacity-80"
                        style={{ color: "var(--text-faint)" }}
                        title={isVisible ? "Gizle" : "Göster"}
                      >
                        {isVisible ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}
                  >
                    Ayrıntılar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Yeni Proje</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Proje bilgilerini girin</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--text-muted)", background: "var(--input-bg)" }}
              >
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

              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Proje Adı <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Web Frontend"
                  autoFocus
                  required
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Açıklama
                  <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-faint)" }}>(opsiyonel)</span>
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Projeyi kısaca açıklayın…"
                  rows={3}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "var(--input-bg)", color: "var(--text-muted)", border: "1px solid var(--input-border)" }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                >
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
