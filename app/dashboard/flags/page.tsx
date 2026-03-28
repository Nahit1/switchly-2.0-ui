"use client";

import { useEffect, useState } from "react";
import { organizationService } from "@/lib/services/organization.service";
import { projectService } from "@/lib/services/project.service";
import { featureFlagService } from "@/lib/services/feature-flag.service";
import { segmentService } from "@/lib/services/segment.service";
import type { Organization } from "@/lib/types/organization";
import type { Project } from "@/lib/types/project";
import type {
  GetFlagByProjectDto,
  GetFlagEnvironmentDto,
  GetFlagVariantDto,
  SegmentGroupsDto,
  FeatureFlagType,
  RolloutKind,
} from "@/lib/types/feature-flag";
import type { SegmentGroupDto } from "@/lib/types/segment";

/* ── Flag type helpers (C# enum: Boolean=1, Multivariant=2, Config=3) ── */
function flagTypeLabel(type?: FeatureFlagType): string {
  if (type === 1 || type === "Boolean") return "Boolean";
  if (type === 2 || type === "Multivariant") return "Multivariant";
  if (type === 3 || type === "Config") return "Config";
  return "?";
}
function flagTypeStyle(type?: FeatureFlagType): React.CSSProperties {
  if (type === 1 || type === "Boolean")
    return { background: "rgba(16,185,129,0.15)", color: "#10b981" };
  if (type === 2 || type === "Multivariant")
    return { background: "rgba(168,85,247,0.15)", color: "#a855f7" };
  if (type === 3 || type === "Config")
    return { background: "rgba(249,115,22,0.15)", color: "#f97316" };
  return { background: "rgba(100,116,139,0.15)", color: "#64748b" };
}
function flagTypeDotColor(type?: FeatureFlagType): string {
  if (type === 1 || type === "Boolean") return "#10b981";
  if (type === 2 || type === "Multivariant") return "#a855f7";
  if (type === 3 || type === "Config") return "#f97316";
  return "#64748b";
}

/* ── RolloutKind helpers (C# enum: AllUsers=1, Percentage=2, Off=3) ── */
function rolloutKindLabel(kind?: RolloutKind): string {
  if (kind === 1 || kind === "AllUsers") return "Tüm Kullanıcılar";
  if (kind === 2 || kind === "Percentage") return "Yüzde";
  if (kind === 3 || kind === "Off") return "Kapalı";
  return String(kind ?? "—");
}

/* ── Helpers ───────────────────────────────────────────────────── */
function getInitials(name?: string): string {
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

/* ── Flag type options for create modal ────────────────────────── */
const FLAG_TYPES: {
  value: FeatureFlagType;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 1,
    label: "Boolean",
    desc: "Aç / Kapat özelliği",
    color: "#10b981",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l4-4 4 4m0 6l-4 4-4-4"
        />
      </svg>
    ),
  },
  {
    value: 2,
    label: "Multivariant",
    desc: "A/B test, çok varyantlı",
    color: "#a855f7",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    value: 3,
    label: "Config",
    desc: "Yapılandırma değeri",
    color: "#f97316",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

/* ── RolloutKind options for update modal ──────────────────────── */
const ROLLOUT_KINDS: { value: RolloutKind; label: string; desc: string }[] = [
  { value: 1, label: "Tüm Kullanıcılar", desc: "Herkese açık" },
  { value: 2, label: "Yüzde", desc: "Belirli yüzde" },
  { value: 3, label: "Kapalı", desc: "Kimseye açık değil" },
];

const VARIANT_HUES = [220, 280, 160, 30, 340, 200];

/* ── Update modal state type ───────────────────────────────────── */
interface UpdateEnvModal {
  open: boolean;
  flagId: string;
  featureFlagEnvId: string;
  projectEnvId: string;
  envName: string;
  isEnabled: boolean;
  rolloutKind: RolloutKind;
  rolloutPct: number;
  saving: boolean;
  error: string;
}
const CLOSED_UPDATE_MODAL: UpdateEnvModal = {
  open: false,
  flagId: "",
  featureFlagEnvId: "",
  projectEnvId: "",
  envName: "",
  isEnabled: false,
  rolloutKind: 1,
  rolloutPct: 0,
  saving: false,
  error: "",
};

/* ── Assign Segment Modal state ─────────────────────────────────── */
interface AssignSegmentModal {
  open: boolean;
  featureFlagEnvId: string;
  envName: string;
  saving: boolean;
  error: string;
  segments: SegmentGroupDto[];
  segmentsLoading: boolean;
  selectedGroupId: string;
}
const CLOSED_ASSIGN_MODAL: AssignSegmentModal = {
  open: false,
  featureFlagEnvId: "",
  envName: "",
  saving: false,
  error: "",
  segments: [],
  segmentsLoading: false,
  selectedGroupId: "",
};

/* ════════════════════════════════════════════════════════════════ */
export default function FlagsPage() {
  /* ── Orgs ──────────────────────────────────────────────── */
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  /* ── Projects ──────────────────────────────────────────── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  /* ── Flags ─────────────────────────────────────────────── */
  const [flags, setFlags] = useState<GetFlagByProjectDto[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState("");

  /* ── Expansion ─────────────────────────────────────────── */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Toggle loading: keyed by "flagId:featureFlagEnvId" ── */
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  /* ── Update env modal ──────────────────────────────────── */
  const [updateModal, setUpdateModal] =
    useState<UpdateEnvModal>(CLOSED_UPDATE_MODAL);

  /* ── Assign segment modal ───────────────────────────────── */
  const [assignModal, setAssignModal] =
    useState<AssignSegmentModal>(CLOSED_ASSIGN_MODAL);

  /* ── Create modal ──────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<FeatureFlagType>(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ═══ fetch orgs on mount ════════════════════════════════ */
  useEffect(() => {
    organizationService
      .getAll()
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
    setProjects([]);
    setSelectedProjectId(null);
    setFlags([]);
    setFlagsError("");
    setExpandedId(null);

    projectService
      .getByOrganization(selectedOrgId)
      .then((res) => {
        const list = res.data ?? [];
        setProjects(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedProjectId(first.id ?? (first["Id"] as string) ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, [selectedOrgId]);

  /* ═══ fetch flags when project changes ═══════════════════ */
  useEffect(() => {
    if (!selectedOrgId || !selectedProjectId) return;
    setFlagsLoading(true);
    setFlagsError("");
    setFlags([]);
    setExpandedId(null);

    featureFlagService
      .getByProject(selectedOrgId, selectedProjectId)
      .then((res) => setFlags(res.data ?? []))
      .catch((err: unknown) =>
        setFlagsError(err instanceof Error ? err.message : "Yüklenemedi.")
      )
      .finally(() => setFlagsLoading(false));
  }, [selectedOrgId, selectedProjectId]);

  /* ═══ toggle env isEnabled (optimistic) ══════════════════ */
  async function handleToggle(
    flag: GetFlagByProjectDto,
    env: GetFlagEnvironmentDto
  ) {
    if (!selectedOrgId || !selectedProjectId) return;
    const flagId = (flag.id ?? flag["Id"]) as string;
    const featureFlagEnvId = (env.featureFlagEnvironmentId ??
      env["FeatureFlagEnvironmentId"]) as string;
    const currentEnabled = (env.isEnabled ?? env["IsEnabled"]) as
      | boolean
      | undefined;
    const nextEnabled = !currentEnabled;
    const toggleKey = `${flagId}:${featureFlagEnvId}`;

    if (togglingIds.has(toggleKey)) return;

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => {
        if ((f.id ?? (f["Id"] as string)) !== flagId) return f;
        return {
          ...f,
          environments: (
            f.environments ??
            (f["Environments"] as GetFlagEnvironmentDto[]) ??
            []
          ).map((e) => {
            const eid = (e.featureFlagEnvironmentId ??
              e["FeatureFlagEnvironmentId"]) as string;
            if (eid !== featureFlagEnvId) return e;
            return { ...e, isEnabled: nextEnabled };
          }),
        };
      })
    );

    setTogglingIds((p) => {
      const n = new Set(p);
      n.add(toggleKey);
      return n;
    });
    try {
      await featureFlagService.toggle(
        flagId,
        featureFlagEnvId,
        selectedOrgId,
        selectedProjectId,
        nextEnabled
      );
    } catch {
      // Revert on error
      setFlags((prev) =>
        prev.map((f) => {
          if ((f.id ?? (f["Id"] as string)) !== flagId) return f;
          return {
            ...f,
            environments: (
              f.environments ??
              (f["Environments"] as GetFlagEnvironmentDto[]) ??
              []
            ).map((e) => {
              const eid = (e.featureFlagEnvironmentId ??
                e["FeatureFlagEnvironmentId"]) as string;
              if (eid !== featureFlagEnvId) return e;
              return { ...e, isEnabled: currentEnabled };
            }),
          };
        })
      );
    } finally {
      setTogglingIds((p) => {
        const n = new Set(p);
        n.delete(toggleKey);
        return n;
      });
    }
  }

  /* ═══ open update env modal ══════════════════════════════ */
  function openUpdateModal(
    flag: GetFlagByProjectDto,
    env: GetFlagEnvironmentDto
  ) {
    const flagId = (flag.id ?? flag["Id"]) as string;
    const featureFlagEnvId = (env.featureFlagEnvironmentId ??
      env["FeatureFlagEnvironmentId"]) as string;
    const projectEnvId = (env.projectEnvironmentId ??
      env["ProjectEnvironmentId"]) as string;
    const envName = (env.environmentName ?? env["EnvironmentName"]) as string;
    const isEnabled = ((env.isEnabled ?? env["IsEnabled"]) as boolean) ?? false;
    const rolloutKind = (env.defaultRolloutKind ??
      env["DefaultRolloutKind"] ??
      1) as RolloutKind;
    const rolloutPct = (env.defaultRolloutPercentage ??
      env["DefaultRolloutPercentage"] ??
      0) as number;

    setUpdateModal({
      open: true,
      flagId,
      featureFlagEnvId,
      projectEnvId,
      envName,
      isEnabled,
      rolloutKind,
      rolloutPct,
      saving: false,
      error: "",
    });
  }

  /* ═══ submit update env ══════════════════════════════════ */
  async function handleUpdateEnv(e: React.FormEvent) {
    e.preventDefault();
    setUpdateModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      await featureFlagService.updateFlagEnvironment(
        updateModal.flagId,
        updateModal.projectEnvId,
        updateModal.isEnabled,
        updateModal.rolloutKind,
        updateModal.rolloutPct
      );
      // Update local state
      setFlags((prev) =>
        prev.map((f) => {
          if ((f.id ?? (f["Id"] as string)) !== updateModal.flagId) return f;
          return {
            ...f,
            environments: (
              f.environments ??
              (f["Environments"] as GetFlagEnvironmentDto[]) ??
              []
            ).map((e) => {
              const eid = (e.featureFlagEnvironmentId ??
                e["FeatureFlagEnvironmentId"]) as string;
              if (eid !== updateModal.featureFlagEnvId) return e;
              return {
                ...e,
                isEnabled: updateModal.isEnabled,
                defaultRolloutKind: updateModal.rolloutKind,
                defaultRolloutPercentage: updateModal.rolloutPct,
              };
            }),
          };
        })
      );
      setUpdateModal(CLOSED_UPDATE_MODAL);
    } catch (err: unknown) {
      setUpdateModal((p) => ({
        ...p,
        saving: false,
        error: err instanceof Error ? err.message : "Güncellenemedi.",
      }));
    }
  }

  /* ═══ open assign segment modal ══════════════════════════ */
  async function openAssignSegmentModal(env: GetFlagEnvironmentDto) {
    const featureFlagEnvId = (env.featureFlagEnvironmentId ??
      env["FeatureFlagEnvironmentId"]) as string;
    const envName = (env.environmentName ?? env["EnvironmentName"]) as string;

    setAssignModal({
      ...CLOSED_ASSIGN_MODAL,
      open: true,
      featureFlagEnvId,
      envName,
      segmentsLoading: true,
    });

    if (!selectedOrgId) {
      setAssignModal((p) => ({
        ...p,
        segmentsLoading: false,
        error: "Organizasyon seçili değil.",
      }));
      return;
    }
    try {
      const res = await segmentService.getAllGroups(selectedOrgId);
      const list =
        res.data ?? (res as { Data?: SegmentGroupDto[] })["Data"] ?? [];
      setAssignModal((p) => ({ ...p, segments: list, segmentsLoading: false }));
    } catch {
      setAssignModal((p) => ({
        ...p,
        segmentsLoading: false,
        error: "Segment grupları yüklenemedi.",
      }));
    }
  }

  /* ═══ submit assign segment ══════════════════════════════ */
  async function handleAssignSegment() {
    if (!assignModal.selectedGroupId || !assignModal.featureFlagEnvId) return;
    setAssignModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      await featureFlagService.assignSegment(
        assignModal.featureFlagEnvId,
        assignModal.selectedGroupId
      );
      setAssignModal(CLOSED_ASSIGN_MODAL);
      // Flagleri yenile
      if (selectedOrgId && selectedProjectId) {
        const res = await featureFlagService.getByProject(
          selectedOrgId,
          selectedProjectId
        );
        setFlags(res.data ?? []);
      }
    } catch (err: unknown) {
      setAssignModal((p) => ({
        ...p,
        saving: false,
        error: err instanceof Error ? err.message : "Segment atanamadı.",
      }));
    }
  }

  /* ═══ create flag ════════════════════════════════════════ */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (
      !newKey.trim() ||
      !newName.trim() ||
      !selectedOrgId ||
      !selectedProjectId
    )
      return;
    setCreating(true);
    setCreateError("");
    try {
      await featureFlagService.create(
        selectedOrgId,
        selectedProjectId,
        newKey.trim(),
        newName.trim(),
        newDescription.trim(),
        newType
      );
      setModalOpen(false);
      resetModal();
      const res = await featureFlagService.getByProject(
        selectedOrgId,
        selectedProjectId
      );
      setFlags(res.data ?? []);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  function resetModal() {
    setNewKey("");
    setNewName("");
    setNewDescription("");
    setNewType(1);
    setCreateError("");
  }

  function openModal() {
    resetModal();
    setModalOpen(true);
  }
  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const selectedProject = projects.find(
    (p) => (p.id ?? (p["Id"] as string)) === selectedProjectId
  );

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Feature Flags
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {flagsLoading
              ? "Yükleniyor…"
              : selectedProjectId
              ? `${flags.length} flag`
              : "Bir proje seçin"}
          </p>
        </div>
        {selectedProjectId && (
          <button
            onClick={openModal}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-500/20 flex-shrink-0"
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
              Yeni Flag
            </span>
          </button>
        )}
      </div>

      {/* ── Filter bar: Org + Project ─────────────────────── */}
      <div
        className="space-y-3 pb-4"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        {/* Org row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-faint)" }}
            >
              Organizasyon
            </span>
            <div
              className="w-px h-4 flex-shrink-0"
              style={{ background: "var(--divider)" }}
            />
          </div>
          {orgsLoading ? (
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-24 rounded-full animate-pulse"
                  style={{ background: "var(--input-bg)" }}
                />
              ))}
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Henüz organizasyon yok.
            </p>
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
                      background: active
                        ? "rgba(124,58,237,0.18)"
                        : "transparent",
                      color: active ? "#a78bfa" : "var(--text-muted)",
                      border: active
                        ? "1px solid rgba(124,58,237,0.35)"
                        : "1px solid transparent",
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
        {/* Project row */}
        {selectedOrgId && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-faint)" }}
              >
                Proje
              </span>
              <div
                className="w-px h-4 flex-shrink-0"
                style={{ background: "var(--divider)" }}
              />
            </div>
            {projectsLoading ? (
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-24 rounded-full animate-pulse"
                    style={{ background: "var(--input-bg)" }}
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Bu organizasyonda proje yok.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => {
                  const pid = (project.id ??
                    (project["Id"] as string)) as string;
                  const pname = (project.name ??
                    (project["Name"] as string)) as string | undefined;
                  const active = pid === selectedProjectId;
                  return (
                    <button
                      key={pid}
                      onClick={() => setSelectedProjectId(pid)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: active
                          ? "rgba(124,58,237,0.18)"
                          : "transparent",
                        color: active ? "#a78bfa" : "var(--text-muted)",
                        border: active
                          ? "1px solid rgba(124,58,237,0.35)"
                          : "1px solid transparent",
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: active ? "#7c3aed" : "#475569" }}
                      >
                        {getInitials(pname)}
                      </span>
                      {pname ?? "—"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      {selectedProjectId && (
        <>
          {flagsError && (
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
              <p className="text-red-400 text-sm">{flagsError}</p>
            </div>
          )}

          {/* Skeleton */}
          {flagsLoading && (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-5 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-1/5" />
                      <div className="h-3 bg-white/5 rounded w-1/3" />
                    </div>
                    <div className="hidden sm:flex gap-1.5">
                      {[...Array(3)].map((_, k) => (
                        <div
                          key={k}
                          className="h-5 w-16 bg-white/5 rounded-full"
                        />
                      ))}
                    </div>
                    <div className="h-8 w-24 bg-white/5 rounded-lg flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!flagsLoading && !flagsError && flags.length === 0 && (
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
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
              </div>
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {selectedProject
                  ? `${
                      (selectedProject.name ??
                        (selectedProject["Name"] as string)) ||
                      "Bu proje"
                    } için henüz flag yok`
                  : "Henüz flag yok"}
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-muted)" }}
              >
                İlk feature flag oluşturarak başlayın.
              </p>
              <button
                onClick={openModal}
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
                  Flag Ekle
                </span>
              </button>
            </div>
          )}

          {/* ── Flag list ─────────────────────────────────── */}
          {!flagsLoading && flags.length > 0 && (
            <div className="flex flex-col gap-3">
              {flags.map((flag) => {
                const flagId = (flag.id ?? flag["Id"]) as string;
                const flagKey = (flag.key ?? flag["Key"]) as string | undefined;
                const flagName = (flag.name ?? flag["Name"]) as
                  | string
                  | undefined;
                const flagDesc = (flag.description ?? flag["Description"]) as
                  | string
                  | undefined;
                const flagType = (flag.type ?? flag["Type"]) as
                  | FeatureFlagType
                  | undefined;
                const flagDate = (flag.createdAt ?? flag["CreatedAt"]) as
                  | string
                  | undefined;
                const envList = (flag.environments ??
                  flag["Environments"] ??
                  []) as GetFlagEnvironmentDto[];
                const varList = (flag.variants ??
                  flag["Variants"] ??
                  []) as GetFlagVariantDto[];
                const isExpanded = expandedId === flagId;
                const dotColor = flagTypeDotColor(flagType);
                const isMulti = flagType === 2 || flagType === "Multivariant";

                return (
                  <div
                    key={flagId}
                    className="glass-card rounded-2xl overflow-hidden transition-all"
                    style={{
                      borderColor: isExpanded
                        ? "rgba(124,58,237,0.35)"
                        : undefined,
                    }}
                  >
                    {/* ── Collapsed row ──────────────────── */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Type icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${dotColor}20` }}
                      >
                        <svg
                          className="w-4 h-4"
                          style={{ color: dotColor }}
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
                      </div>
                      {/* Key + name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-mono font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {flagKey ?? "—"}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase leading-none"
                            style={flagTypeStyle(flagType)}
                          >
                            {flagTypeLabel(flagType)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {flagName && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {flagName}
                            </p>
                          )}
                          {flagName && flagDesc && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-faint)" }}
                            >
                              ·
                            </span>
                          )}
                          {flagDesc && (
                            <p
                              className="text-xs truncate max-w-sm"
                              style={{ color: "var(--text-faint)" }}
                            >
                              {flagDesc}
                            </p>
                          )}
                          {!flagName && !flagDesc && flagDate && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-faint)" }}
                            >
                              {new Date(flagDate).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Env status pills */}
                      <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                        {envList.length === 0 ? (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-faint)" }}
                          >
                            Env yok
                          </span>
                        ) : (
                          envList.map((env, ei) => {
                            const envName = (env.environmentName ??
                              env["EnvironmentName"]) as string | undefined;
                            const isEnabled = (env.isEnabled ??
                              env["IsEnabled"]) as boolean | undefined;
                            return (
                              <span
                                key={ei}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{
                                  background: isEnabled
                                    ? "rgba(16,185,129,0.12)"
                                    : "rgba(100,116,139,0.1)",
                                  color: isEnabled
                                    ? "#10b981"
                                    : "var(--text-faint)",
                                  border: `1px solid ${
                                    isEnabled
                                      ? "rgba(16,185,129,0.25)"
                                      : "var(--input-border)"
                                  }`,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    background: isEnabled
                                      ? "#10b981"
                                      : "#475569",
                                  }}
                                />
                                {envName ?? `Env ${ei + 1}`}
                              </span>
                            );
                          })
                        )}
                      </div>
                      {/* Ayrıntılar */}
                      <button
                        onClick={() => toggleExpand(flagId)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 flex-shrink-0"
                        style={{
                          background: isExpanded
                            ? "rgba(124,58,237,0.2)"
                            : "rgba(124,58,237,0.1)",
                          color: "#a78bfa",
                        }}
                      >
                        Ayrıntılar
                        <svg
                          className="w-3 h-3 transition-transform duration-200"
                          style={{
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* ══ Expanded ════════════════════════ */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--divider)" }}>
                        {/* Environments */}
                        <div className="p-5">
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                            style={{ color: "var(--text-faint)" }}
                          >
                            Environments
                          </p>
                          {envList.length === 0 ? (
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Environment bulunamadı.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {envList.map((env, ei) => {
                                const envName = (env.environmentName ??
                                  env["EnvironmentName"]) as string | undefined;
                                const isEnabled = (env.isEnabled ??
                                  env["IsEnabled"]) as boolean | undefined;
                                const rolloutKind = (env.defaultRolloutKind ??
                                  env["DefaultRolloutKind"]) as
                                  | RolloutKind
                                  | undefined;
                                const rolloutPct =
                                  (env.defaultRolloutPercentage ??
                                    env["DefaultRolloutPercentage"]) as
                                    | number
                                    | undefined;
                                const segGroups = (env.segmentGroups ??
                                  env["SegmentGroups"] ??
                                  []) as SegmentGroupsDto[];
                                const featureFlagEnvId =
                                  (env.featureFlagEnvironmentId ??
                                    env["FeatureFlagEnvironmentId"]) as string;
                                const toggleKey = `${flagId}:${featureFlagEnvId}`;
                                const isToggling = togglingIds.has(toggleKey);

                                return (
                                  <div
                                    key={ei}
                                    className="rounded-xl overflow-hidden"
                                    style={{
                                      border: "1px solid var(--input-border)",
                                    }}
                                  >
                                    {/* ── Env header with action buttons ── */}
                                    <div
                                      className="flex items-center gap-3 px-4 py-3"
                                      style={{ background: "var(--input-bg)" }}
                                    >
                                      {/* Dot + name */}
                                      <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{
                                          background: isEnabled
                                            ? "#10b981"
                                            : "#475569",
                                        }}
                                      />
                                      <span
                                        className="text-xs font-semibold"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {envName ?? `Env ${ei + 1}`}
                                      </span>

                                      {/* Badges */}
                                      <div className="flex items-center gap-2 ml-1 flex-1 flex-wrap">
                                        <span
                                          className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                                          style={{
                                            background: isEnabled
                                              ? "rgba(16,185,129,0.15)"
                                              : "rgba(100,116,139,0.12)",
                                            color: isEnabled
                                              ? "#10b981"
                                              : "#64748b",
                                          }}
                                        >
                                          {isEnabled ? "Aktif" : "Pasif"}
                                        </span>
                                        <div
                                          className="flex items-center gap-1"
                                          style={{ color: "var(--text-faint)" }}
                                        >
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                            />
                                          </svg>
                                          <span className="text-xs">
                                            {rolloutKindLabel(rolloutKind)}
                                            {(rolloutKind === 2 ||
                                              rolloutKind === "Percentage") &&
                                              rolloutPct !== undefined &&
                                              ` · %${rolloutPct}`}
                                          </span>
                                        </div>
                                        {segGroups.length > 0 && (
                                          <div
                                            className="flex items-center gap-1"
                                            style={{
                                              color: "var(--text-faint)",
                                            }}
                                          >
                                            <svg
                                              className="w-3 h-3"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                              />
                                            </svg>
                                            <span className="text-xs">
                                              {segGroups.length} segment
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* ── Action buttons ── */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Toggle switch */}
                                        <button
                                          onClick={() =>
                                            handleToggle(flag, env)
                                          }
                                          disabled={isToggling}
                                          title={isEnabled ? "Kapat" : "Aç"}
                                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none"
                                          style={{
                                            background: isEnabled
                                              ? "#10b981"
                                              : "rgba(100,116,139,0.35)",
                                            opacity: isToggling ? 0.7 : 1,
                                            cursor: isToggling
                                              ? "not-allowed"
                                              : "pointer",
                                          }}
                                        >
                                          {isToggling ? (
                                            <svg
                                              className="w-3 h-3 absolute left-1/2 -translate-x-1/2 animate-spin text-white"
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
                                          ) : (
                                            <span
                                              className="w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200"
                                              style={{
                                                transform: isEnabled
                                                  ? "translateX(18px)"
                                                  : "translateX(2px)",
                                              }}
                                            />
                                          )}
                                        </button>

                                        {/* Edit / Update button */}
                                        <button
                                          onClick={() =>
                                            openUpdateModal(flag, env)
                                          }
                                          title="Güncelle"
                                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                                          style={{
                                            background: "rgba(124,58,237,0.12)",
                                            color: "#a78bfa",
                                          }}
                                        >
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>

                                        {/* Assign segment button */}
                                        <button
                                          onClick={() =>
                                            openAssignSegmentModal(env)
                                          }
                                          title="Kural Ekle"
                                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                                          style={{
                                            background: "rgba(16,185,129,0.12)",
                                            color: "#10b981",
                                          }}
                                        >
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Segment groups */}
                                    {segGroups.length > 0 && (
                                      <div className="px-4 py-3 space-y-2">
                                        {segGroups.map((sg, si) => {
                                          const sgName = (sg.name ??
                                            sg["Name"]) as string | undefined;
                                          const sgKey = (sg.key ??
                                            sg["Key"]) as string | undefined;
                                          const sgRules = (sg.segmentRules ??
                                            sg["SegmentRules"] ??
                                            []) as {
                                            traitKey?: string;
                                            operator?: string;
                                            value?: string;
                                          }[];
                                          return (
                                            <div
                                              key={si}
                                              className="rounded-lg px-3 py-2.5"
                                              style={{
                                                background:
                                                  "rgba(124,58,237,0.06)",
                                                border:
                                                  "1px solid rgba(124,58,237,0.12)",
                                              }}
                                            >
                                              <div className="flex items-center gap-2 mb-2">
                                                <span
                                                  className="text-xs font-semibold"
                                                  style={{ color: "#a78bfa" }}
                                                >
                                                  {sgName ??
                                                    sgKey ??
                                                    `Segment ${si + 1}`}
                                                </span>
                                                {sgKey && sgName && (
                                                  <span
                                                    className="text-[10px] font-mono"
                                                    style={{
                                                      color:
                                                        "var(--text-faint)",
                                                    }}
                                                  >
                                                    {sgKey}
                                                  </span>
                                                )}
                                              </div>
                                              {sgRules.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                  {sgRules.map((rule, ri) => (
                                                    <span
                                                      key={ri}
                                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono"
                                                      style={{
                                                        background:
                                                          "var(--input-bg)",
                                                        color:
                                                          "var(--text-secondary)",
                                                        border:
                                                          "1px solid var(--input-border)",
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          color:
                                                            "var(--text-primary)",
                                                        }}
                                                      >
                                                        {rule.traitKey ?? "?"}
                                                      </span>
                                                      <span
                                                        style={{
                                                          color: "#a78bfa",
                                                        }}
                                                      >
                                                        {rule.operator ?? "="}
                                                      </span>
                                                      <span
                                                        style={{
                                                          color: "#10b981",
                                                        }}
                                                      >
                                                        {rule.value ?? "?"}
                                                      </span>
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Variants — only for Multivariant */}
                        {isMulti && (
                          <div className="px-5 pb-5">
                            <div
                              className="pt-4"
                              style={{ borderTop: "1px solid var(--divider)" }}
                            >
                              <p
                                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                                style={{ color: "var(--text-faint)" }}
                              >
                                Variants
                              </p>
                              {varList.length === 0 ? (
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  Variant bulunamadı.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {varList.map((v, vi) => {
                                    const vKey = (v.key ?? v["Key"]) as
                                      | string
                                      | undefined;
                                    const vName = (v.name ?? v["Name"]) as
                                      | string
                                      | undefined;
                                    const vPayload = (v.payloadJson ??
                                      v["PayloadJson"]) as string | undefined;
                                    return (
                                      <div
                                        key={vi}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                                        style={{
                                          background: "var(--input-bg)",
                                          border:
                                            "1px solid var(--input-border)",
                                        }}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{
                                            background: `hsl(${
                                              VARIANT_HUES[
                                                vi % VARIANT_HUES.length
                                              ]
                                            },65%,55%)`,
                                          }}
                                        />
                                        <div>
                                          <p
                                            className="text-xs font-mono font-bold"
                                            style={{
                                              color: "var(--text-primary)",
                                            }}
                                          >
                                            {vKey ?? "—"}
                                          </p>
                                          {vName && (
                                            <p
                                              className="text-[10px]"
                                              style={{
                                                color: "var(--text-faint)",
                                              }}
                                            >
                                              {vName}
                                            </p>
                                          )}
                                        </div>
                                        {vPayload && (
                                          <span
                                            className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                                            style={{
                                              background:
                                                "rgba(168,85,247,0.12)",
                                              color: "#a855f7",
                                              border:
                                                "1px solid rgba(168,85,247,0.2)",
                                            }}
                                          >
                                            JSON
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ Update Env Modal ══════════════════════════════════ */}
      {updateModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setUpdateModal(CLOSED_UPDATE_MODAL)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Environment Güncelle
                </h2>
                <p
                  className="text-sm mt-0.5 font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {updateModal.envName}
                </p>
              </div>
              <button
                onClick={() => setUpdateModal(CLOSED_UPDATE_MODAL)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
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
            </div>

            <form onSubmit={handleUpdateEnv} className="space-y-5">
              {updateModal.error && (
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
                  <p className="text-red-400 text-sm">{updateModal.error}</p>
                </div>
              )}

              {/* IsEnabled toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Durum
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Bu environment da flag aktif mi?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setUpdateModal((p) => ({ ...p, isEnabled: !p.isEnabled }))
                  }
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                  style={{
                    background: updateModal.isEnabled
                      ? "#10b981"
                      : "rgba(100,116,139,0.35)",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{
                      transform: updateModal.isEnabled
                        ? "translateX(23px)"
                        : "translateX(3px)",
                    }}
                  />
                </button>
              </div>

              {/* RolloutKind */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Rollout Tipi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLLOUT_KINDS.map((rk) => {
                    const active = updateModal.rolloutKind === rk.value;
                    return (
                      <button
                        key={String(rk.value)}
                        type="button"
                        onClick={() =>
                          setUpdateModal((p) => ({
                            ...p,
                            rolloutKind: rk.value,
                          }))
                        }
                        className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-all"
                        style={{
                          background: active
                            ? "rgba(124,58,237,0.15)"
                            : "var(--input-bg)",
                          border: active
                            ? "1.5px solid rgba(124,58,237,0.4)"
                            : "1.5px solid var(--input-border)",
                          color: active ? "#a78bfa" : "var(--text-muted)",
                        }}
                      >
                        <p className="text-xs font-semibold leading-tight">
                          {rk.label}
                        </p>
                        <p
                          className="text-[10px] leading-tight"
                          style={{
                            color: active
                              ? "rgba(167,139,250,0.7)"
                              : "var(--text-faint)",
                          }}
                        >
                          {rk.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RolloutPercentage — only for Percentage */}
              {(updateModal.rolloutKind === 2 ||
                updateModal.rolloutKind === "Percentage") && (
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Yüzde{" "}
                    <span
                      className="text-xs font-normal"
                      style={{ color: "var(--text-faint)" }}
                    >
                      (%0 – %100)
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={updateModal.rolloutPct}
                      onChange={(e) =>
                        setUpdateModal((p) => ({
                          ...p,
                          rolloutPct: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-violet-500"
                    />
                    <div
                      className="w-14 text-center rounded-lg px-2 py-1.5 text-sm font-mono font-semibold"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "#a78bfa",
                      }}
                    >
                      %{updateModal.rolloutPct}
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setUpdateModal(CLOSED_UPDATE_MODAL)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--input-border)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateModal.saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {updateModal.saving ? (
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
                        Kaydediliyor…
                      </>
                    ) : (
                      "Kaydet"
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Assign Segment Modal ═══════════════════════════════ */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() =>
              !assignModal.saving && setAssignModal(CLOSED_ASSIGN_MODAL)
            }
          />
          {/* Modal */}
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 z-10"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Segment Grubu Ata
                </h3>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {assignModal.envName}
                  </span>{" "}
                  ortamı için segment grubu seç
                </p>
              </div>
              <button
                onClick={() =>
                  !assignModal.saving && setAssignModal(CLOSED_ASSIGN_MODAL)
                }
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-faint)" }}
              >
                <svg
                  className="w-5 h-5"
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
            </div>

            {/* Segment list */}
            {assignModal.segmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ background: "var(--sidebar-item-bg)" }}
                  />
                ))}
              </div>
            ) : assignModal.segments.length === 0 ? (
              <div className="text-center py-10">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(124,58,237,0.1)" }}
                >
                  <svg
                    className="w-6 h-6"
                    style={{ color: "#a78bfa" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Segment grubu bulunamadı
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Bu organizasyona henüz segment grubu eklenmemiş.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {assignModal.segments.map((sg) => {
                  const sgId = (sg.id ?? sg["Id"] ?? "") as string;
                  const sgName = (sg.name ?? sg["Name"] ?? "—") as string;
                  const sgKey = (sg.key ?? sg["Key"] ?? "") as string;
                  const isSelected = assignModal.selectedGroupId === sgId;
                  return (
                    <button
                      key={sgId}
                      onClick={() =>
                        setAssignModal((p) => ({ ...p, selectedGroupId: sgId }))
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected
                          ? "rgba(124,58,237,0.12)"
                          : "var(--sidebar-item-bg)",
                        border: isSelected
                          ? "1px solid rgba(124,58,237,0.35)"
                          : "1px solid transparent",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{
                          background: isSelected
                            ? "rgba(124,58,237,0.8)"
                            : "linear-gradient(135deg,#7c3aed,#3b82f6)",
                        }}
                      >
                        {getInitials(sgName)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{
                            color: isSelected
                              ? "#a78bfa"
                              : "var(--text-primary)",
                          }}
                        >
                          {sgName}
                        </p>
                        {sgKey && (
                          <p
                            className="text-xs font-mono mt-0.5"
                            style={{ color: "var(--text-faint)" }}
                          >
                            {sgKey}
                          </p>
                        )}
                      </div>
                      {/* Checkmark */}
                      {isSelected && (
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: "#a78bfa" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Error */}
            {assignModal.error && (
              <div
                className="mt-4 rounded-xl px-3 py-2.5 text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {assignModal.error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() =>
                  !assignModal.saving && setAssignModal(CLOSED_ASSIGN_MODAL)
                }
                disabled={assignModal.saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--sidebar-item-bg)",
                  color: "var(--text-muted)",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAssignSegment}
                disabled={assignModal.saving || !assignModal.selectedGroupId}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background:
                    assignModal.saving || !assignModal.selectedGroupId
                      ? "rgba(16,185,129,0.3)"
                      : "rgba(16,185,129,0.8)",
                  color: "white",
                  cursor:
                    assignModal.saving || !assignModal.selectedGroupId
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {assignModal.saving ? (
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
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Atanıyor…
                  </>
                ) : (
                  "Segment Ata"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Create Flag Modal ══════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Yeni Flag
                </h2>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {selectedProject
                    ? `${
                        (selectedProject.name ??
                          (selectedProject["Name"] as string)) ||
                        "Proje"
                      } için flag oluştur`
                    : "Feature flag oluştur"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
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
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
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
              {/* Flag type */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Flag Türü <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FLAG_TYPES.map((ft) => {
                    const active = newType === ft.value;
                    return (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => setNewType(ft.value)}
                        className="flex flex-col items-center gap-2 rounded-xl px-3 py-3.5 text-center transition-all"
                        style={{
                          background: active
                            ? `${ft.color}15`
                            : "var(--input-bg)",
                          border: active
                            ? `1.5px solid ${ft.color}50`
                            : "1.5px solid var(--input-border)",
                          color: active ? ft.color : "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            color: active ? ft.color : "var(--text-faint)",
                          }}
                        >
                          {ft.icon}
                        </span>
                        <div>
                          <p className="text-xs font-semibold leading-tight">
                            {ft.label}
                          </p>
                          <p
                            className="text-[10px] mt-0.5 leading-tight"
                            style={{
                              color: active
                                ? `${ft.color}aa`
                                : "var(--text-faint)",
                            }}
                          >
                            {ft.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Key */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Key <span className="text-red-400">*</span>
                  <span
                    className="ml-1.5 text-xs font-normal"
                    style={{ color: "var(--text-faint)" }}
                  >
                    (benzersiz tanımlayıcı)
                  </span>
                </label>
                <input
                  type="text"
                  value={newKey}
                  autoFocus
                  required
                  onChange={(e) =>
                    setNewKey(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-_]/g, "")
                    )
                  }
                  placeholder="my-feature-flag"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm font-mono"
                />
              </div>
              {/* Name */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  İsim <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  required
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Yeni Ödeme Sayfası"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              {/* Description */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Açıklama{" "}
                  <span
                    className="ml-1 text-xs font-normal"
                    style={{ color: "var(--text-faint)" }}
                  >
                    (opsiyonel)
                  </span>
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Bu flag ne işe yarıyor?"
                  rows={2}
                  className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--input-border)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating || !newKey.trim() || !newName.trim()}
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
