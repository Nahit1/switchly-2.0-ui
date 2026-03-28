"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@/lib/services/organization.service";
import type { Organization } from "@/lib/types/organization";

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // True when page was opened because user has NO org yet (setup mode)
  const [isSetupMode, setIsSetupMode] = useState(false);

  // Set of org ids whose publicKey is currently visible
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

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
    return (
      key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4)
    );
  }

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    setLoading(true);
    setError("");
    try {
      const res = await organizationService.getAll();
      const list = res.data ?? [];
      setOrgs(list);
      // If no orgs exist → we're in setup mode, open modal immediately
      if (list.length === 0) {
        setIsSetupMode(true);
        setModalOpen(true);
      }
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
      await organizationService.create(newName.trim());
      const wasSetup = isSetupMode;
      setModalOpen(false);
      setNewName("");
      setIsSetupMode(false);

      if (wasSetup) {
        // First org → go to dashboard (layout will re-check org status)
        router.replace("/dashboard");
      } else {
        // Re-fetch list from server to get accurate data
        await fetchOrgs();
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  function getInitials(name?: string) {
    if (!name) return "?";
    return (
      name
        .split(" ")
        .map((w) => w[0] ?? "")
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?"
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Organizasyonlar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {loading ? "Yükleniyor…" : `${orgs.length} organizasyon`}
          </p>
        </div>
        <button
          onClick={() => {
            setModalOpen(true);
            setCreateError("");
            setNewName("");
          }}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Yeni Organizasyon
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <svg
            className="w-4 h-4 text-red-400 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchOrgs}
            className="ml-auto text-xs text-red-400 underline"
          >
            Tekrar dene
          </button>
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
              <div className="h-8 bg-white/5 rounded-lg w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && orgs.length === 0 && (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(124,58,237,0.1)" }}
          >
            <svg
              className="w-8 h-8 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Henüz organizasyon yok
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            İlk organizasyonunuzu oluşturun ve feature flag yönetimine başlayın.
          </p>
          <button
            onClick={() => {
              setModalOpen(true);
              setCreateError("");
              setNewName("");
            }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Organizasyon Oluştur
            </span>
          </button>
        </div>
      )}

      {/* Organization grid */}
      {!loading && orgs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org, i) => {
            const orgId = org.id ?? String(i);
            const isVisible = visibleKeys.has(orgId);
            const publicKey = org.publicKey as string | undefined;

            return (
              <div
                key={orgId}
                className="glass-card rounded-2xl p-5 hover:border-violet-500/40 transition-all group"
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      gradients[i % gradients.length]
                    } flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg`}
                  >
                    {getInitials(org.name)}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {org.name ?? "—"}
                    </h3>
                    {org.createdAt && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {new Date(org.createdAt as string).toLocaleDateString(
                          "tr-TR",
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="h-px mb-4"
                  style={{ background: "var(--divider)" }}
                />

                {/* Public Key row */}
                <div className="mb-4">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Public Key
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "var(--text-faint)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span
                      className="flex-1 text-xs font-mono truncate select-all"
                      style={{
                        color: publicKey
                          ? "var(--text-secondary)"
                          : "var(--text-faint)",
                        letterSpacing: isVisible ? "0.02em" : "0.15em",
                      }}
                    >
                      {publicKey
                        ? isVisible
                          ? publicKey
                          : maskKey(publicKey)
                        : "—"}
                    </span>
                    {publicKey && (
                      <button
                        onClick={() => toggleKeyVisibility(orgId)}
                        className="flex-shrink-0 p-0.5 rounded transition-colors"
                        style={{ color: "var(--text-faint)" }}
                        title={isVisible ? "Gizle" : "Göster"}
                      >
                        {isVisible ? (
                          /* Eye-off icon */
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          /* Eye icon */
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--text-faint)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                      />
                    </svg>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      0 flag
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/projects/${orgId}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      color: "#a78bfa",
                    }}
                  >
                    Yönet
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Organization Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop — not dismissible in setup mode */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isSetupMode) setModalOpen(false);
            }}
          />

          {/* Modal */}
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                {isSetupMode ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "rgba(234,179,8,0.15)",
                          color: "#fbbf24",
                        }}
                      >
                        Kurulum
                      </span>
                    </div>
                    <h2
                      className="text-lg font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      İlk organizasyonunuzu oluşturunnn
                    </h2>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Devam etmek için en az bir organizasyon gerekli..
                    </p>
                  </>
                ) : (
                  <>
                    <h2
                      className="text-lg font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Yeni Organizasyon
                    </h2>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Organizasyon adını girin
                    </p>
                  </>
                )}
              </div>
              {/* Hide close button in setup mode */}
              {!isSetupMode && (
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    color: "var(--text-muted)",
                    background: "var(--input-bg)",
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <svg
                    className="w-4 h-4 text-red-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Organizasyon Adı
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Acme Corp"
                  autoFocus
                  required
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {/* Hide cancel in setup mode */}
                {!isSetupMode && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: "var(--input-bg)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--input-border)",
                    }}
                  >
                    İptal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {creating ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Oluşturuluyor…
                      </>
                    ) : (
                      "Oluştur"
                    )}
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
