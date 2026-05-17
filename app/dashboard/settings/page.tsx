"use client";

import { useEffect, useMemo, useState } from "react";
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

type DataTypeOption = { value: 1 | 2 | 3 | 4; label: string };
const DATA_TYPES: DataTypeOption[] = [
  { value: 1, label: "String" },
  { value: 2, label: "Number" },
  { value: 3, label: "Boolean" },
  { value: 4, label: "Json" },
];

function dataTypeLabel(t?: ProjectSettingDataType): string {
  if (t === 1 || t === "String") return "String";
  if (t === 2 || t === "Number") return "Number";
  if (t === 3 || t === "Boolean") return "Boolean";
  if (t === 4 || t === "Json") return "Json";
  return "?";
}

export default function SettingsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [envs, setEnvs] = useState<ProjectEnvironment[]>([]);
  const [settings, setSettings] = useState<ProjectSettingByEnvironmentDto[]>([]);

  const [orgId, setOrgId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [envId, setEnvId] = useState("");

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [pageError, setPageError] = useState("");

  // Per-row draft values keyed by setting id
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  // Create setting modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDataType, setNewDataType] = useState<1 | 2 | 3 | 4>(1);
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ── load orgs once ── */
  useEffect(() => {
    organizationService
      .getAll()
      .then((res) => {
        const list = res.data ?? [];
        setOrgs(list);
        if (list.length === 1) setOrgId((list[0].id ?? "") as string);
      })
      .catch((e: unknown) =>
        setPageError(e instanceof Error ? e.message : "Organizasyonlar yüklenemedi.")
      );
  }, []);

  /* ── load projects when org changes ── */
  useEffect(() => {
    setProjects([]);
    setProjectId("");
    setEnvs([]);
    setEnvId("");
    setSettings([]);
    if (!orgId) return;

    projectService
      .getByOrganization(orgId)
      .then((res) => {
        const list = res.data ?? [];
        setProjects(list);
        if (list.length === 1) setProjectId((list[0].id ?? "") as string);
      })
      .catch((e: unknown) =>
        setPageError(e instanceof Error ? e.message : "Projeler yüklenemedi.")
      );
  }, [orgId]);

  /* ── load envs when project changes ── */
  useEffect(() => {
    setEnvs([]);
    setEnvId("");
    setSettings([]);
    if (!orgId || !projectId) return;

    environmentService
      .getByProject(projectId, orgId)
      .then((res) => {
        const list = (res.data ?? [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setEnvs(list);
        if (list.length > 0) setEnvId((list[0].id ?? "") as string);
      })
      .catch((e: unknown) =>
        setPageError(e instanceof Error ? e.message : "Environment'lar yüklenemedi.")
      );
  }, [orgId, projectId]);

  /* ── load settings when env changes ── */
  const loadSettings = useMemo(() => {
    return async () => {
      if (!orgId || !projectId || !envId) return;
      setLoadingSettings(true);
      setPageError("");
      try {
        const res = await projectSettingService.getByEnvironment(projectId, orgId, envId);
        const list = res.data ?? [];
        setSettings(list);
        const initialDrafts: Record<string, string> = {};
        for (const s of list) {
          if (s.id) initialDrafts[s.id] = s.value?.value ?? "";
        }
        setDrafts(initialDrafts);
        setRowError({});
      } catch (e: unknown) {
        setPageError(e instanceof Error ? e.message : "Settings yüklenemedi.");
      } finally {
        setLoadingSettings(false);
      }
    };
  }, [orgId, projectId, envId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveValue(s: ProjectSettingByEnvironmentDto) {
    if (!s.id) return;
    setSavingId(s.id);
    setRowError((m) => ({ ...m, [s.id!]: "" }));
    try {
      const draft = drafts[s.id] ?? "";
      const hasExisting = s.value != null && s.value.id != null;
      if (hasExisting) {
        await projectSettingService.updateValue(projectId, s.id, envId, orgId, draft);
      } else {
        await projectSettingService.createValue(projectId, s.id, envId, orgId, draft);
      }
      await loadSettings();
    } catch (e: unknown) {
      setRowError((m) => ({
        ...m,
        [s.id!]: e instanceof Error ? e.message : "Kaydedilemedi.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !orgId) return;
    setCreating(true);
    setCreateError("");
    try {
      await projectSettingService.createSetting(
        projectId,
        orgId,
        newKey.trim(),
        newDesc.trim() || null,
        newDataType,
        newIsSecret
      );
      setCreateOpen(false);
      setNewKey("");
      setNewDesc("");
      setNewDataType(1);
      setNewIsSecret(false);
      await loadSettings();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Setting oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  function isDirty(s: ProjectSettingByEnvironmentDto): boolean {
    if (!s.id) return false;
    const draft = drafts[s.id] ?? "";
    const current = s.value?.value ?? "";
    return draft !== current;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Project Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Runtime config&apos;i environment başına yönet — yeniden build etmeden değiştir.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={!projectId}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Setting
        </button>
      </div>

      {/* Selectors */}
      <div className="glass-card rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Selector
          label="Organizasyon"
          value={orgId}
          onChange={setOrgId}
          options={orgs.map((o) => ({ value: (o.id ?? "") as string, label: o.name ?? "—" }))}
          placeholder="Seçin"
          disabled={orgs.length === 0}
        />
        <Selector
          label="Proje"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: (p.id ?? "") as string, label: p.name ?? "—" }))}
          placeholder={orgId ? "Seçin" : "Önce organizasyon seçin"}
          disabled={!orgId || projects.length === 0}
        />
        <Selector
          label="Environment"
          value={envId}
          onChange={setEnvId}
          options={envs.map((e) => ({ value: (e.id ?? "") as string, label: e.name ?? e.key ?? "—" }))}
          placeholder={projectId ? "Seçin" : "Önce proje seçin"}
          disabled={!projectId || envs.length === 0}
        />
      </div>

      {pageError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
        >
          {pageError}
        </div>
      )}

      {/* List */}
      {!projectId || !envId ? (
        <EmptyState text="Settings'i görmek için organizasyon, proje ve environment seçin." />
      ) : loadingSettings ? (
        <EmptyState text="Yükleniyor…" />
      ) : settings.length === 0 ? (
        <EmptyState text="Bu projede henüz setting yok. Sağ üstten Yeni Setting ile ekleyin." />
      ) : (
        <div className="space-y-3">
          {settings.map((s) => (
            <SettingRow
              key={s.id ?? s.key}
              setting={s}
              draft={drafts[s.id ?? ""] ?? ""}
              onDraftChange={(v) => setDrafts((m) => ({ ...m, [s.id ?? ""]: v }))}
              onSave={() => saveValue(s)}
              saving={savingId === s.id}
              dirty={isDirty(s)}
              error={rowError[s.id ?? ""] ?? ""}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !creating && setCreateOpen(false)}>
          <div
            className="glass-card rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--page-bg)" }}
          >
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              Yeni Setting
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Project seviyesinde tanımlanır, değer environment başına ayrı set edilir.
            </p>

            <form onSubmit={submitCreate} className="space-y-4">
              <Field label="Key" hint="Örn. thirdparty.endpoint">
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ background: "var(--sidebar-item-bg)", border: "1px solid var(--sidebar-border)", color: "var(--text-primary)" }}
                />
              </Field>

              <Field label="Açıklama (opsiyonel)">
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ background: "var(--sidebar-item-bg)", border: "1px solid var(--sidebar-border)", color: "var(--text-primary)" }}
                />
              </Field>

              <Field label="Veri tipi">
                <select
                  value={newDataType}
                  onChange={(e) => setNewDataType(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ background: "var(--sidebar-item-bg)", border: "1px solid var(--sidebar-border)", color: "var(--text-primary)" }}
                >
                  {DATA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <input
                  type="checkbox"
                  checked={newIsSecret}
                  onChange={(e) => setNewIsSecret(e.target.checked)}
                />
                Secret (public SDK endpoint&apos;inden dönmez)
              </label>

              {createError && (
                <p className="text-sm" style={{ color: "#f87171" }}>{createError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "var(--sidebar-item-bg)", color: "var(--text-muted)" }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating || !newKey.trim()}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                >
                  {creating ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── pieces ────────────────────────────────────────────────────── */

function Selector({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg outline-none disabled:opacity-50"
        style={{ background: "var(--sidebar-item-bg)", border: "1px solid var(--sidebar-border)", color: "var(--text-primary)" }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{hint}</p>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      {text}
    </div>
  );
}

function SettingRow({
  setting,
  draft,
  onDraftChange,
  onSave,
  saving,
  dirty,
  error,
}: {
  setting: ProjectSettingByEnvironmentDto;
  draft: string;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  error: string;
}) {
  const hasValue = setting.value != null && setting.value.id != null;
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {setting.key}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
            >
              {dataTypeLabel(setting.dataType)}
            </span>
            {setting.isSecret && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
              >
                Secret
              </span>
            )}
          </div>
          {setting.description && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {setting.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={hasValue ? "" : "Henüz değer yok"}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg font-mono text-sm outline-none"
          style={{ background: "var(--sidebar-item-bg)", border: "1px solid var(--sidebar-border)", color: "var(--text-primary)" }}
        />
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Kaydediliyor…" : hasValue ? "Güncelle" : "Kaydet"}
        </button>
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>
      )}
    </div>
  );
}
