"use client";

import { Fragment, useEffect, useState } from "react";
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
  VariantInput,
  VariantWeightDto,
  FlagExposureStatsDto,
  FlagConversionStatsDto,
  VariantConversionStatsDto,
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
  rolloutKind: RolloutKind;
  rolloutPct: number;
  priority: number;
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
  rolloutKind: 1,
  rolloutPct: 100,
  priority: 0,
};

/* ── Weights Modal state (env veya targeting scope'unda) ────────── */
interface WeightsModal {
  open: boolean;
  scope: "env" | "targeting";
  ownerId: string;        // envId or targetingId
  ownerLabel: string;     // header'da gösterilecek (env adı / targeting key)
  flagKey: string;
  variants: GetFlagVariantDto[];
  weights: Record<string, number>;   // variantId -> weight
  saving: boolean;
  error: string;
}

const CLOSED_WEIGHTS_MODAL: WeightsModal = {
  open: false,
  scope: "env",
  ownerId: "",
  ownerLabel: "",
  flagKey: "",
  variants: [],
  weights: {},
  saving: false,
  error: "",
};

/* ── Variant Edit/Add Modal state ───────────────────────────────── */
interface VariantEditModal {
  open: boolean;
  mode: "add" | "edit";
  flagId: string;
  flagKey: string;
  variantId: string;     // edit'te dolu, add'de boş
  key: string;
  name: string;
  payloadJson: string;
  saving: boolean;
  error: string;
}

const CLOSED_VARIANT_MODAL: VariantEditModal = {
  open: false,
  mode: "add",
  flagId: "",
  flagKey: "",
  variantId: "",
  key: "",
  name: "",
  payloadJson: "",
  saving: false,
  error: "",
};

/* ── Targeting Edit Modal state ─────────────────────────────────── */
interface EditTargetingModal {
  open: boolean;
  targetingId: string;
  segmentName: string;
  rolloutKind: RolloutKind;
  rolloutPct: number;
  priority: number;
  isEnabled: boolean;
  saving: boolean;
  error: string;
}
const CLOSED_EDIT_TARGETING_MODAL: EditTargetingModal = {
  open: false,
  targetingId: "",
  segmentName: "",
  rolloutKind: 1,
  rolloutPct: 100,
  priority: 0,
  isEnabled: true,
  saving: false,
  error: "",
};

/* ── Analytics Modal state (exposure + conversion stats per flag) ─ */
type AnalyticsRange = "1h" | "24h" | "7d" | "30d";
type AnalyticsView = "exposure" | "conversion";

interface AnalyticsModal {
  open: boolean;
  flagId: string;
  flagKey: string;
  view: AnalyticsView;
  rangeKey: AnalyticsRange;
  eventName: string;                          // conversion sekmesi için
  loading: boolean;
  error: string;
  exposureData: FlagExposureStatsDto | null;
  conversionData: FlagConversionStatsDto | null;
}

const CLOSED_ANALYTICS_MODAL: AnalyticsModal = {
  open: false,
  flagId: "",
  flagKey: "",
  view: "exposure",
  rangeKey: "24h",
  eventName: "checkout_completed",
  loading: false,
  error: "",
  exposureData: null,
  conversionData: null,
};

function rangeToSinceIso(range: AnalyticsRange): string {
  const now = Date.now();
  const ms: Record<AnalyticsRange, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - ms[range]).toISOString();
}

function rangeLabel(range: AnalyticsRange): string {
  if (range === "1h") return "Son 1s";
  if (range === "24h") return "Son 24s";
  if (range === "7d") return "Son 7g";
  return "Son 30g";
}

// "Off"/"on"/variant key — outcome row için human label.
function outcomeLabel(variantKey: string | null | undefined, isOn: boolean): string {
  if (variantKey) return variantKey;
  return isOn ? "on" : "off";
}

/* ── Conversion stats helpers ─────────────────────────────────── */
function conversionRate(v: VariantConversionStatsDto): number {
  return v.exposedUsers > 0 ? v.convertedUsers / v.exposedUsers : 0;
}

function avgValuePerConverter(v: VariantConversionStatsDto): number {
  return v.convertedUsers > 0
    ? Number(v.totalValue) / v.convertedUsers
    : 0;
}

// Baseline: outcome label alfabetik küçük (deterministik). Lift bunun üzerinden hesaplanır.
function pickBaseline(
  variants: VariantConversionStatsDto[]
): VariantConversionStatsDto | null {
  if (variants.length === 0) return null;
  return [...variants].sort((a, b) => {
    const ak = outcomeLabel(a.variantKey, a.isOn);
    const bk = outcomeLabel(b.variantKey, b.isOn);
    return ak.localeCompare(bk);
  })[0];
}

function liftPercent(rate: number, baselineRate: number): number | null {
  if (baselineRate <= 0) return null;
  return ((rate - baselineRate) / baselineRate) * 100;
}

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

  const [editTargetingModal, setEditTargetingModal] =
    useState<EditTargetingModal>(CLOSED_EDIT_TARGETING_MODAL);

  /* ── Variant add/edit modal ─────────────────────────────── */
  const [variantModal, setVariantModal] =
    useState<VariantEditModal>(CLOSED_VARIANT_MODAL);

  /* ── Weights modal (env / targeting) ────────────────────── */
  const [weightsModal, setWeightsModal] =
    useState<WeightsModal>(CLOSED_WEIGHTS_MODAL);

  /* ── Analytics modal (exposure stats) ───────────────────── */
  const [analyticsModal, setAnalyticsModal] =
    useState<AnalyticsModal>(CLOSED_ANALYTICS_MODAL);

  /* ── Create modal ──────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<FeatureFlagType>(1);
  const [newVariants, setNewVariants] = useState<VariantInput[]>([
    { key: "control", name: "" },
    { key: "treatment", name: "" },
  ]);
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
        assignModal.selectedGroupId,
        assignModal.rolloutKind,
        assignModal.rolloutPct,
        assignModal.priority
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

  /* ═══ submit edit targeting ══════════════════════════════ */
  async function handleEditTargeting() {
    if (!editTargetingModal.targetingId) return;
    setEditTargetingModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      await featureFlagService.updateTargeting(
        editTargetingModal.targetingId,
        editTargetingModal.rolloutKind,
        editTargetingModal.rolloutPct,
        editTargetingModal.priority,
        editTargetingModal.isEnabled
      );
      setEditTargetingModal(CLOSED_EDIT_TARGETING_MODAL);
      if (selectedOrgId && selectedProjectId) {
        const res = await featureFlagService.getByProject(
          selectedOrgId,
          selectedProjectId
        );
        setFlags(res.data ?? []);
      }
    } catch (err: unknown) {
      setEditTargetingModal((p) => ({
        ...p,
        saving: false,
        error: err instanceof Error ? err.message : "Targeting güncellenemedi.",
      }));
    }
  }

  /* ═══ remove segment from flag ═════════════════════════════ */
  async function handleRemoveTargeting(targetingId: string, segmentName: string) {
    if (!targetingId) return;
    if (
      !window.confirm(
        `"${segmentName}" segment'i bu flag'den kaldırılsın mı?`
      )
    )
      return;

    try {
      await featureFlagService.removeTargeting(targetingId);
      if (selectedOrgId && selectedProjectId) {
        const res = await featureFlagService.getByProject(
          selectedOrgId,
          selectedProjectId
        );
        setFlags(res.data ?? []);
      }
    } catch (err: unknown) {
      window.alert(
        err instanceof Error ? err.message : "Segment kaldırılamadı."
      );
    }
  }

  /* ═══ refresh flag list (helper) ═══════════════════════════ */
  async function refreshFlags() {
    if (!selectedOrgId || !selectedProjectId) return;
    const res = await featureFlagService.getByProject(
      selectedOrgId,
      selectedProjectId
    );
    setFlags(res.data ?? []);
  }

  /* ═══ open variant add/edit modal ══════════════════════════ */
  function openAddVariantModal(flagId: string, flagKey: string) {
    setVariantModal({
      ...CLOSED_VARIANT_MODAL,
      open: true,
      mode: "add",
      flagId,
      flagKey,
    });
  }

  function openEditVariantModal(
    flagId: string,
    flagKey: string,
    variant: GetFlagVariantDto
  ) {
    setVariantModal({
      open: true,
      mode: "edit",
      flagId,
      flagKey,
      variantId: (variant.id ?? (variant["Id"] as string)) ?? "",
      key: (variant.key ?? (variant["Key"] as string)) ?? "",
      name: (variant.name ?? (variant["Name"] as string)) ?? "",
      payloadJson:
        (variant.payloadJson ?? (variant["PayloadJson"] as string)) ?? "",
      saving: false,
      error: "",
    });
  }

  /* ═══ submit variant add/edit ═════════════════════════════ */
  async function handleVariantSave() {
    setVariantModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      if (variantModal.mode === "add") {
        if (!variantModal.key.trim()) {
          setVariantModal((p) => ({
            ...p,
            saving: false,
            error: "Key boş olamaz.",
          }));
          return;
        }
        await featureFlagService.addVariant(
          variantModal.flagId,
          variantModal.key.trim(),
          variantModal.name.trim() || undefined,
          variantModal.payloadJson.trim() || undefined
        );
      } else {
        await featureFlagService.updateVariant(
          variantModal.variantId,
          variantModal.name.trim() || undefined,
          variantModal.payloadJson.trim() || undefined
        );
      }
      setVariantModal(CLOSED_VARIANT_MODAL);
      await refreshFlags();
    } catch (err: unknown) {
      setVariantModal((p) => ({
        ...p,
        saving: false,
        error: err instanceof Error ? err.message : "Variant kaydedilemedi.",
      }));
    }
  }

  /* ═══ open weights modal (env / targeting) ════════════════ */
  function openWeightsModal(
    scope: "env" | "targeting",
    ownerId: string,
    ownerLabel: string,
    flagKey: string,
    variants: GetFlagVariantDto[],
    currentWeights: VariantWeightDto[]
  ) {
    // Variantları sortOrder'a göre sırala (yoksa 0 say); UI bucket order'ı bunu yansıtır.
    const sortedVariants = [...variants].sort((a, b) => {
      const ao = (a.sortOrder ?? (a["SortOrder"] as number) ?? 0) as number;
      const bo = (b.sortOrder ?? (b["SortOrder"] as number) ?? 0) as number;
      return ao - bo;
    });

    const weights: Record<string, number> = {};
    sortedVariants.forEach((v) => {
      const id = (v.id ?? (v["Id"] as string)) ?? "";
      if (id) weights[id] = 0;
    });
    currentWeights.forEach((w) => {
      const id = w.variantId ?? (w["VariantId"] as string);
      const wt = w.weight ?? (w["Weight"] as number);
      if (id && weights[id] !== undefined) weights[id] = Number(wt) || 0;
    });

    setWeightsModal({
      open: true,
      scope,
      ownerId,
      ownerLabel,
      flagKey,
      variants: sortedVariants,
      weights,
      saving: false,
      error: "",
    });
  }

  function updateWeightInput(variantId: string, raw: string) {
    const num = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    setWeightsModal((p) => ({
      ...p,
      weights: { ...p.weights, [variantId]: num },
    }));
  }

  /* ═══ submit weights ══════════════════════════════════════ */
  async function handleWeightsSave() {
    const total = Object.values(weightsModal.weights).reduce(
      (acc, w) => acc + w,
      0
    );
    if (total !== 100) {
      setWeightsModal((p) => ({
        ...p,
        error: `Weight toplamı 100 olmalı, şu an ${total}.`,
      }));
      return;
    }

    setWeightsModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      const payload = Object.entries(weightsModal.weights).map(
        ([variantId, weight]) => ({ variantId, weight })
      );
      if (weightsModal.scope === "env") {
        await featureFlagService.setEnvVariantWeights(
          weightsModal.ownerId,
          payload
        );
      } else {
        await featureFlagService.setTargetingVariantWeights(
          weightsModal.ownerId,
          payload
        );
      }
      setWeightsModal(CLOSED_WEIGHTS_MODAL);
      await refreshFlags();
    } catch (err: unknown) {
      setWeightsModal((p) => ({
        ...p,
        saving: false,
        error: err instanceof Error ? err.message : "Weight kaydedilemedi.",
      }));
    }
  }

  /* ═══ open analytics modal + fetch ═══════════════════════ */
  async function openAnalyticsModal(flagId: string, flagKey: string) {
    setAnalyticsModal({
      ...CLOSED_ANALYTICS_MODAL,
      open: true,
      flagId,
      flagKey,
      view: "exposure",
      rangeKey: "24h",
      loading: true,
    });
    await fetchAnalytics(flagId, "exposure", "24h", "checkout_completed");
  }

  async function fetchAnalytics(
    flagId: string,
    view: AnalyticsView,
    range: AnalyticsRange,
    eventName: string
  ) {
    setAnalyticsModal((p) => ({
      ...p,
      loading: true,
      error: "",
      view,
      rangeKey: range,
      eventName,
    }));
    try {
      if (view === "exposure") {
        const res = await featureFlagService.getExposureStats(
          flagId,
          rangeToSinceIso(range)
        );
        setAnalyticsModal((p) => ({
          ...p,
          loading: false,
          exposureData: res.data ?? null,
          error: res.success ? "" : res.message ?? "Bir hata oluştu.",
        }));
      } else {
        const res = await featureFlagService.getConversionStats(
          flagId,
          eventName,
          rangeToSinceIso(range)
        );
        setAnalyticsModal((p) => ({
          ...p,
          loading: false,
          conversionData: res.data ?? null,
          error: res.success ? "" : res.message ?? "Bir hata oluştu.",
        }));
      }
    } catch (err: unknown) {
      setAnalyticsModal((p) => ({
        ...p,
        loading: false,
        error:
          err instanceof Error ? err.message : "Analytics çekilemedi.",
      }));
    }
  }

  /* ═══ delete variant ══════════════════════════════════════ */
  async function handleDeleteVariant(variantId: string, variantKey: string) {
    if (!variantId) return;
    if (
      !window.confirm(
        `"${variantKey}" variant'ı silinsin mi? Bağlı weight kayıtları da düşer; kalan variant'ların weight'lerini yeniden set etmen gerekebilir.`
      )
    )
      return;

    try {
      await featureFlagService.deleteVariant(variantId);
      await refreshFlags();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Variant silinemedi.");
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

    const isMulti = newType === 2 || newType === "Multivariant";
    let variantsPayload: VariantInput[] | undefined;

    if (isMulti) {
      const trimmed = newVariants.map((v) => ({
        key: v.key.trim(),
        name: v.name?.trim() || undefined,
        payloadJson: v.payloadJson?.trim() || undefined,
      }));
      if (trimmed.length < 2) {
        setCreateError("Multivariant flag için en az 2 variant gerekli.");
        return;
      }
      if (trimmed.some((v) => !v.key)) {
        setCreateError("Variant key'leri boş olamaz.");
        return;
      }
      const lowered = trimmed.map((v) => v.key.toLowerCase());
      if (new Set(lowered).size !== lowered.length) {
        setCreateError("Variant key'leri benzersiz olmalı.");
        return;
      }
      variantsPayload = trimmed;
    }

    setCreating(true);
    setCreateError("");
    try {
      await featureFlagService.create(
        selectedOrgId,
        selectedProjectId,
        newKey.trim(),
        newName.trim(),
        newDescription.trim(),
        newType,
        variantsPayload
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
    setNewVariants([
      { key: "control", name: "" },
      { key: "treatment", name: "" },
    ]);
    setCreateError("");
  }

  function updateVariantField(
    idx: number,
    field: keyof VariantInput,
    value: string
  ) {
    setNewVariants((prev) =>
      prev.map((v, i) =>
        i === idx
          ? {
              ...v,
              [field]:
                field === "key"
                  ? value
                      .toLowerCase()
                      .replace(/\s+/g, "_")
                      .replace(/[^a-z0-9_-]/g, "")
                  : value,
            }
          : v
      )
    );
  }

  function addVariantRow() {
    setNewVariants((prev) => [...prev, { key: "", name: "" }]);
  }

  function removeVariantRow(idx: number) {
    setNewVariants((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)
    );
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
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
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
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
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
                            className="text-[11px] px-1.5 py-0.5 rounded font-bold uppercase leading-none"
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
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
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
                      {/* Analytics */}
                      <button
                        onClick={() =>
                          openAnalyticsModal(flagId, flagKey ?? "")
                        }
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 flex-shrink-0"
                        style={{
                          background: "rgba(59,130,246,0.1)",
                          color: "#60a5fa",
                        }}
                        title="Exposure analytics"
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
                            strokeWidth={2.5}
                            d="M9 19V9m6 10V5m-12 14h18"
                          />
                        </svg>
                        Analytics
                      </button>

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
                            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
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
                                const envWeights = (env.variantWeights ??
                                  env["VariantWeights"] ??
                                  []) as VariantWeightDto[];
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
                                          className="text-[11px] px-1.5 py-0.5 rounded font-bold uppercase"
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

                                        {/* Variant weights button — only Multivariant */}
                                        {isMulti && (
                                          <button
                                            onClick={() =>
                                              openWeightsModal(
                                                "env",
                                                featureFlagEnvId,
                                                envName ?? `Env ${ei + 1}`,
                                                flagKey ?? "",
                                                varList,
                                                envWeights
                                              )
                                            }
                                            title="Variant Weights"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                                            style={{
                                              background: "rgba(168,85,247,0.12)",
                                              color: "#a855f7",
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
                                                d="M3 12h4l3-9 4 18 3-9h4"
                                              />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Env-level variant weights distribution bar (Multivariant only) */}
                                    {isMulti && varList.length > 0 && (
                                      <div className="px-4 pt-3">
                                        <div
                                          className="flex items-center gap-2 mb-1.5"
                                          style={{ color: "var(--text-faint)" }}
                                        >
                                          <span className="text-[11px] font-semibold uppercase tracking-widest">
                                            Default split
                                          </span>
                                          {envWeights.length === 0 && (
                                            <span
                                              className="text-[11px]"
                                              style={{ color: "#f59e0b" }}
                                            >
                                              · weight set edilmemiş
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className="flex w-full h-2 rounded-full overflow-hidden"
                                          style={{
                                            background: "var(--input-bg)",
                                            border: "1px solid var(--input-border)",
                                          }}
                                        >
                                          {varList.map((v, vi) => {
                                            const vId = (v.id ?? v["Id"]) as string | undefined;
                                            const w = envWeights.find(
                                              (x) =>
                                                (x.variantId ??
                                                  (x["VariantId"] as string)) === vId
                                            );
                                            const pct =
                                              (w?.weight ?? (w?.["Weight"] as number) ?? 0) as number;
                                            if (pct <= 0) return null;
                                            return (
                                              <div
                                                key={vi}
                                                title={`${
                                                  v.key ?? v["Key"]
                                                }: ${pct}%`}
                                                style={{
                                                  width: `${pct}%`,
                                                  background: `hsl(${
                                                    VARIANT_HUES[
                                                      vi % VARIANT_HUES.length
                                                    ]
                                                  },65%,55%)`,
                                                }}
                                              />
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

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
                                                    className="text-[11px] font-mono"
                                                    style={{
                                                      color:
                                                        "var(--text-faint)",
                                                    }}
                                                  >
                                                    {sgKey}
                                                  </span>
                                                )}
                                                {/* Rollout badge */}
                                                <span
                                                  className="text-[11px] px-1.5 py-0.5 rounded font-semibold"
                                                  style={{
                                                    background:
                                                      "rgba(124,58,237,0.15)",
                                                    color: "#a78bfa",
                                                  }}
                                                >
                                                  {rolloutKindLabel(
                                                    sg.rolloutKind
                                                  )}
                                                  {(sg.rolloutKind === 2 ||
                                                    sg.rolloutKind ===
                                                      "Percentage") &&
                                                    ` ${sg.rolloutPercentage ?? 0}%`}
                                                </span>
                                                {/* Priority badge */}
                                                {(sg.priority ?? 0) > 0 && (
                                                  <span
                                                    className="text-[11px] px-1.5 py-0.5 rounded"
                                                    style={{
                                                      background:
                                                        "var(--input-bg)",
                                                      color: "var(--text-muted)",
                                                    }}
                                                  >
                                                    P{sg.priority}
                                                  </span>
                                                )}
                                                {/* IsEnabled / disabled badge */}
                                                {sg.isEnabled === false && (
                                                  <span
                                                    className="text-[11px] px-1.5 py-0.5 rounded font-semibold"
                                                    style={{
                                                      background:
                                                        "rgba(239,68,68,0.12)",
                                                      color: "#f87171",
                                                    }}
                                                  >
                                                    DISABLED
                                                  </span>
                                                )}
                                                {/* Edit button — sağa yapıştır */}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    sg.id &&
                                                    setEditTargetingModal({
                                                      open: true,
                                                      targetingId: sg.id,
                                                      segmentName:
                                                        sgName ??
                                                        sgKey ??
                                                        "Segment",
                                                      rolloutKind:
                                                        (sg.rolloutKind ??
                                                          1) as RolloutKind,
                                                      rolloutPct:
                                                        sg.rolloutPercentage ??
                                                        100,
                                                      priority: sg.priority ?? 0,
                                                      isEnabled:
                                                        sg.isEnabled ?? true,
                                                      saving: false,
                                                      error: "",
                                                    })
                                                  }
                                                  className="ml-auto text-[11px] px-2 py-0.5 rounded transition-colors"
                                                  style={{
                                                    background:
                                                      "var(--input-bg)",
                                                    color: "var(--text-muted)",
                                                    border:
                                                      "1px solid var(--input-border)",
                                                  }}
                                                >
                                                  Düzenle
                                                </button>
                                                {/* Weights button — only Multivariant */}
                                                {isMulti && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (!sg.id) return;
                                                      const tWeights = (sg.variantWeights ??
                                                        sg["VariantWeights"] ??
                                                        []) as VariantWeightDto[];
                                                      openWeightsModal(
                                                        "targeting",
                                                        sg.id,
                                                        sgName ?? sgKey ?? "Targeting",
                                                        flagKey ?? "",
                                                        varList,
                                                        tWeights
                                                      );
                                                    }}
                                                    className="text-[11px] px-2 py-0.5 rounded transition-colors"
                                                    style={{
                                                      background:
                                                        "rgba(168,85,247,0.12)",
                                                      color: "#a855f7",
                                                      border:
                                                        "1px solid rgba(168,85,247,0.25)",
                                                    }}
                                                  >
                                                    Weights
                                                  </button>
                                                )}
                                                {/* Remove button */}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    sg.id &&
                                                    handleRemoveTargeting(
                                                      sg.id,
                                                      sgName ??
                                                        sgKey ??
                                                        "Segment"
                                                    )
                                                  }
                                                  className="text-[11px] px-2 py-0.5 rounded transition-colors"
                                                  style={{
                                                    background:
                                                      "rgba(239,68,68,0.10)",
                                                    color: "#f87171",
                                                    border:
                                                      "1px solid rgba(239,68,68,0.25)",
                                                  }}
                                                >
                                                  Kaldır
                                                </button>
                                              </div>
                                              {sgRules.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  {sgRules.map((rule, ri) => (
                                                    <Fragment key={ri}>
                                                      {ri > 0 && (
                                                        <span
                                                          className="text-[11px] font-bold px-1"
                                                          style={{ color: "#a78bfa" }}
                                                        >
                                                          {sg.logicalOperator === 2 ||
                                                          sg.logicalOperator === "Or"
                                                            ? "OR"
                                                            : "AND"}
                                                        </span>
                                                      )}
                                                      <span
                                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-mono"
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
                                                    </Fragment>
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
                              <div className="flex items-center justify-between mb-3">
                                <p
                                  className="text-[11px] font-semibold uppercase tracking-widest"
                                  style={{ color: "var(--text-faint)" }}
                                >
                                  Variants
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddVariantModal(flagId, flagKey ?? "")
                                  }
                                  className="text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                                  style={{
                                    background: "rgba(168,85,247,0.12)",
                                    color: "#a855f7",
                                    border: "1px solid rgba(168,85,247,0.25)",
                                  }}
                                >
                                  + Variant
                                </button>
                              </div>
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
                                    const vId = (v.id ?? v["Id"]) as
                                      | string
                                      | undefined;
                                    return (
                                      <div
                                        key={vi}
                                        className="group flex items-center gap-2.5 rounded-xl px-3 py-2"
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
                                              className="text-[11px]"
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
                                            className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                                            style={{
                                              background:
                                                "rgba(168,85,247,0.12)",
                                              color: "#a855f7",
                                              border:
                                                "1px solid rgba(168,85,247,0.2)",
                                            }}
                                            title="Payload var"
                                          >
                                            JSON
                                          </span>
                                        )}
                                        <div className="flex items-center gap-1 ml-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openEditVariantModal(
                                                flagId,
                                                flagKey ?? "",
                                                v
                                              )
                                            }
                                            aria-label="Variant düzenle"
                                            className="w-6 h-6 flex items-center justify-center rounded-md opacity-60 hover:opacity-100 transition-opacity"
                                            style={{
                                              background: "var(--input-bg)",
                                              color: "var(--text-muted)",
                                              border:
                                                "1px solid var(--input-border)",
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
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                              />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              vId &&
                                              handleDeleteVariant(
                                                vId,
                                                vKey ?? ""
                                              )
                                            }
                                            aria-label="Variant sil"
                                            disabled={varList.length <= 2}
                                            className="w-6 h-6 flex items-center justify-center rounded-md opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
                                            style={{
                                              background:
                                                "rgba(239,68,68,0.10)",
                                              color: "#f87171",
                                              border:
                                                "1px solid rgba(239,68,68,0.25)",
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
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                                              />
                                            </svg>
                                          </button>
                                        </div>
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
                          className="text-[11px] leading-tight"
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

            {/* Rollout controls — sadece segment seçilince görünür */}
            {assignModal.selectedGroupId && (
              <div className="mt-5 space-y-3">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-faint)" }}
                >
                  Rollout
                </p>

                {/* RolloutKind selector */}
                <div className="flex gap-2">
                  {ROLLOUT_KINDS.map((rk) => {
                    const active = assignModal.rolloutKind === rk.value;
                    return (
                      <button
                        key={rk.value}
                        type="button"
                        onClick={() =>
                          setAssignModal((p) => ({ ...p, rolloutKind: rk.value }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: active
                            ? "rgba(124,58,237,0.15)"
                            : "var(--sidebar-item-bg)",
                          color: active ? "#a78bfa" : "var(--text-muted)",
                          border: active
                            ? "1px solid rgba(124,58,237,0.4)"
                            : "1px solid transparent",
                        }}
                      >
                        {rk.label}
                      </button>
                    );
                  })}
                </div>

                {/* Percentage — sadece Percentage seçili ise */}
                {(assignModal.rolloutKind === 2 ||
                  assignModal.rolloutKind === "Percentage") && (
                  <div>
                    <label
                      className="block text-xs mb-1.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Yüzde: {assignModal.rolloutPct}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={assignModal.rolloutPct}
                      onChange={(e) =>
                        setAssignModal((p) => ({
                          ...p,
                          rolloutPct: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label
                    className="block text-xs mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Öncelik (yüksek olan önce değerlendirilir)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={assignModal.priority}
                    onChange={(e) =>
                      setAssignModal((p) => ({
                        ...p,
                        priority: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--sidebar-item-bg)",
                      border: "1px solid var(--sidebar-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
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

      {/* ══ Edit Targeting Modal ══════════════════════════════ */}
      {editTargetingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              !editTargetingModal.saving &&
              setEditTargetingModal(CLOSED_EDIT_TARGETING_MODAL)
            }
          />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 glass-card"
            style={{ background: "var(--page-bg)" }}
          >
            <div className="mb-4">
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Targeting Düzenle
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="font-mono">{editTargetingModal.segmentName}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* RolloutKind */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-faint)" }}
                >
                  Rollout
                </label>
                <div className="flex gap-2">
                  {ROLLOUT_KINDS.map((rk) => {
                    const active = editTargetingModal.rolloutKind === rk.value;
                    return (
                      <button
                        key={rk.value}
                        type="button"
                        onClick={() =>
                          setEditTargetingModal((p) => ({
                            ...p,
                            rolloutKind: rk.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: active
                            ? "rgba(124,58,237,0.15)"
                            : "var(--sidebar-item-bg)",
                          color: active ? "#a78bfa" : "var(--text-muted)",
                          border: active
                            ? "1px solid rgba(124,58,237,0.4)"
                            : "1px solid transparent",
                        }}
                      >
                        {rk.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Percentage */}
              {(editTargetingModal.rolloutKind === 2 ||
                editTargetingModal.rolloutKind === "Percentage") && (
                <div>
                  <label
                    className="block text-xs mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Yüzde: {editTargetingModal.rolloutPct}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editTargetingModal.rolloutPct}
                    onChange={(e) =>
                      setEditTargetingModal((p) => ({
                        ...p,
                        rolloutPct: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label
                  className="block text-xs mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Öncelik
                </label>
                <input
                  type="number"
                  min={0}
                  value={editTargetingModal.priority}
                  onChange={(e) =>
                    setEditTargetingModal((p) => ({
                      ...p,
                      priority: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--sidebar-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* IsEnabled */}
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                <input
                  type="checkbox"
                  checked={editTargetingModal.isEnabled}
                  onChange={(e) =>
                    setEditTargetingModal((p) => ({
                      ...p,
                      isEnabled: e.target.checked,
                    }))
                  }
                />
                Targeting aktif
              </label>

              {/* Error */}
              {editTargetingModal.error && (
                <div
                  className="rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {editTargetingModal.error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    !editTargetingModal.saving &&
                    setEditTargetingModal(CLOSED_EDIT_TARGETING_MODAL)
                  }
                  disabled={editTargetingModal.saving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleEditTargeting}
                  disabled={editTargetingModal.saving}
                  className="btn-primary flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                >
                  {editTargetingModal.saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
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
                            className="text-[11px] mt-0.5 leading-tight"
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
              {/* Variants — only for Multivariant */}
              {(newType === 2 || newType === "Multivariant") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Variants <span className="text-red-400">*</span>
                      <span
                        className="ml-1.5 text-xs font-normal"
                        style={{ color: "var(--text-faint)" }}
                      >
                        (en az 2; key benzersiz)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{
                        background: "rgba(168,85,247,0.12)",
                        color: "#a855f7",
                        border: "1px solid rgba(168,85,247,0.25)",
                      }}
                    >
                      + Variant
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newVariants.map((v, vi) => (
                      <div
                        key={vi}
                        className="flex items-center gap-2 rounded-xl p-2.5"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: `hsl(${
                              VARIANT_HUES[vi % VARIANT_HUES.length]
                            },65%,55%)`,
                          }}
                        />
                        <input
                          type="text"
                          value={v.key}
                          onChange={(e) =>
                            updateVariantField(vi, "key", e.target.value)
                          }
                          placeholder="key (örn. control)"
                          className="input-field flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={v.name ?? ""}
                          onChange={(e) =>
                            updateVariantField(vi, "name", e.target.value)
                          }
                          placeholder="isim (opsiyonel)"
                          className="input-field flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariantRow(vi)}
                          disabled={newVariants.length <= 2}
                          aria-label="Variant sil"
                          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            background: "rgba(248,81,73,0.1)",
                            color: "#f85149",
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p
                    className="text-[12px] mt-1"
                    style={{ color: "var(--text-faint)" }}
                  >
                    İlk variant default env&apos;de %100 weight alır. Diğer
                    env&apos;lerin weight&apos;leri sonradan flag detayından
                    set edilir.
                  </p>
                </div>
              )}
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
                        Oluşturuluyor….
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

      {/* ══ Variant Add/Edit Modal ════════════════════════════ */}
      {variantModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setVariantModal(CLOSED_VARIANT_MODAL)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {variantModal.mode === "add"
                    ? "Variant Ekle"
                    : "Variant Düzenle"}
                </h2>
                <p
                  className="text-sm mt-0.5 font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {variantModal.flagKey}
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setVariantModal(CLOSED_VARIANT_MODAL)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--input-border)",
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

            {variantModal.error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                <p className="text-red-400 text-sm">{variantModal.error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Key */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Key{" "}
                  {variantModal.mode === "add" ? (
                    <span className="text-red-400">*</span>
                  ) : (
                    <span
                      className="ml-1.5 text-xs font-normal"
                      style={{ color: "var(--text-faint)" }}
                    >
                      (değiştirilemez)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={variantModal.key}
                  disabled={variantModal.mode === "edit"}
                  onChange={(e) =>
                    setVariantModal((p) => ({
                      ...p,
                      key: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_-]/g, ""),
                    }))
                  }
                  placeholder="örn. variant_b"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm font-mono disabled:opacity-60"
                />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  İsim{" "}
                  <span
                    className="ml-1 text-xs font-normal"
                    style={{ color: "var(--text-faint)" }}
                  >
                    (opsiyonel)
                  </span>
                </label>
                <input
                  type="text"
                  value={variantModal.name}
                  onChange={(e) =>
                    setVariantModal((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Örn: Yeni öneri algoritması"
                  className="input-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              {/* Payload */}
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Payload JSON{" "}
                  <span
                    className="ml-1 text-xs font-normal"
                    style={{ color: "var(--text-faint)" }}
                  >
                    (opsiyonel)
                  </span>
                </label>
                <textarea
                  value={variantModal.payloadJson}
                  onChange={(e) =>
                    setVariantModal((p) => ({
                      ...p,
                      payloadJson: e.target.value,
                    }))
                  }
                  placeholder={`{ "theme": "v2" }`}
                  rows={3}
                  className="input-field w-full rounded-xl px-4 py-3 text-xs font-mono resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setVariantModal(CLOSED_VARIANT_MODAL)}
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
                type="button"
                onClick={handleVariantSave}
                disabled={
                  variantModal.saving ||
                  (variantModal.mode === "add" && !variantModal.key.trim())
                }
                className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {variantModal.saving
                  ? "Kaydediliyor…"
                  : variantModal.mode === "add"
                  ? "Ekle"
                  : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Variant Weights Modal ═════════════════════════════ */}
      {weightsModal.open && (() => {
        const total = Object.values(weightsModal.weights).reduce(
          (acc, w) => acc + w,
          0
        );
        const sumOk = total === 100;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setWeightsModal(CLOSED_WEIGHTS_MODAL)}
            />
            <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Variant Weights
                  </h2>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="font-mono">{weightsModal.flagKey}</span>
                    <span className="mx-1.5">·</span>
                    <span style={{ color: "#a855f7" }}>
                      {weightsModal.scope === "env"
                        ? "env"
                        : "targeting"}
                    </span>
                    <span className="mx-1.5">·</span>
                    {weightsModal.ownerLabel}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Kapat"
                  onClick={() => setWeightsModal(CLOSED_WEIGHTS_MODAL)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--input-border)",
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

              <p
                className="text-xs mb-5 leading-relaxed"
                style={{ color: "var(--text-faint)" }}
              >
                {weightsModal.scope === "env"
                  ? "Bu env'de hiçbir targeting eşleşmediğinde uygulanacak default dağılım."
                  : "Bu targeting eşleştiğinde uygulanacak dağılım."}{" "}
                Toplam <strong>100</strong> olmalı.
              </p>

              {weightsModal.error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-red-400 text-sm">{weightsModal.error}</p>
                </div>
              )}

              {/* Variants list with weight input + bar */}
              <div className="space-y-3 mb-5">
                {weightsModal.variants.length === 0 ? (
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Bu flag&apos;de variant yok. Önce variant ekle.
                  </p>
                ) : (
                  weightsModal.variants.map((v, vi) => {
                    const vId = (v.id ?? (v["Id"] as string)) ?? "";
                    const vKey = (v.key ?? (v["Key"] as string)) ?? "—";
                    const vName = (v.name ?? (v["Name"] as string)) ?? "";
                    const weight = weightsModal.weights[vId] ?? 0;
                    const hue = VARIANT_HUES[vi % VARIANT_HUES.length];
                    return (
                      <div key={vId || vi} className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: `hsl(${hue},65%,55%)`,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-mono font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {vKey}
                            </p>
                            {vName && (
                              <p
                                className="text-[11px] truncate"
                                style={{ color: "var(--text-faint)" }}
                              >
                                {vName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={weight}
                              onChange={(e) =>
                                updateWeightInput(vId, e.target.value)
                              }
                              className="input-field w-16 text-center rounded-lg px-2 py-1 text-sm font-mono"
                            />
                            <span
                              className="text-xs font-semibold"
                              style={{ color: "var(--text-muted)" }}
                            >
                              %
                            </span>
                          </div>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{
                            background: "var(--input-bg)",
                            border: "1px solid var(--input-border)",
                          }}
                        >
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${weight}%`,
                              background: `hsl(${hue},65%,55%)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sum indicator */}
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-5"
                style={{
                  background: sumOk
                    ? "rgba(16,185,129,0.10)"
                    : "rgba(245,158,11,0.10)",
                  border: sumOk
                    ? "1px solid rgba(16,185,129,0.25)"
                    : "1px solid rgba(245,158,11,0.25)",
                  color: sumOk ? "#10b981" : "#f59e0b",
                }}
              >
                <span className="text-xs font-semibold">Toplam</span>
                <span className="text-sm font-mono font-bold">
                  {total} / 100
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWeightsModal(CLOSED_WEIGHTS_MODAL)}
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
                  type="button"
                  onClick={handleWeightsSave}
                  disabled={
                    weightsModal.saving ||
                    !sumOk ||
                    weightsModal.variants.length === 0
                  }
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {weightsModal.saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ Analytics Modal ══════ */}
      {analyticsModal.open && (() => {
        const exposureData = analyticsModal.exposureData;
        const exposureVariants = exposureData?.variants ?? [];
        const totalExposures = exposureData?.totalExposures ?? 0;
        const ranges: AnalyticsRange[] = ["1h", "24h", "7d", "30d"];

        const conversionData = analyticsModal.conversionData;
        const conversionVariants = conversionData?.variants ?? [];
        const baseline = pickBaseline(conversionVariants);
        const baselineRate = baseline ? conversionRate(baseline) : 0;
        const winner = conversionVariants.length > 0
          ? [...conversionVariants].sort(
              (a, b) => conversionRate(b) - conversionRate(a)
            )[0]
          : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setAnalyticsModal(CLOSED_ANALYTICS_MODAL)}
            />
            <div
              className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--input-border)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid var(--divider)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      color: "#60a5fa",
                    }}
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
                        d="M9 19V9m6 10V5m-12 14h18"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Exposure Analytics
                    </h3>
                    <p
                      className="text-xs font-mono"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {analyticsModal.flagKey}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsModal(CLOSED_ANALYTICS_MODAL)}
                  aria-label="Kapat"
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tab toggle */}
              <div
                className="flex gap-1 mx-6 mt-4 p-1 rounded-xl"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                }}
              >
                {(["exposure", "conversion"] as AnalyticsView[]).map((v) => {
                  const active = analyticsModal.view === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        fetchAnalytics(
                          analyticsModal.flagId,
                          v,
                          analyticsModal.rangeKey,
                          analyticsModal.eventName
                        )
                      }
                      disabled={analyticsModal.loading}
                      className="flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: active
                          ? "var(--bg-elevated)"
                          : "transparent",
                        color: active
                          ? "#60a5fa"
                          : "var(--text-muted)",
                        boxShadow: active
                          ? "0 1px 2px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                    >
                      {v === "exposure" ? "Exposure" : "Conversion"}
                    </button>
                  );
                })}
              </div>

              {/* Range selector + (conversion'da) event name input */}
              <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
                {ranges.map((r) => {
                  const active = analyticsModal.rangeKey === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        fetchAnalytics(
                          analyticsModal.flagId,
                          analyticsModal.view,
                          r,
                          analyticsModal.eventName
                        )
                      }
                      disabled={analyticsModal.loading}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                      style={{
                        background: active
                          ? "rgba(59,130,246,0.18)"
                          : "var(--input-bg)",
                        color: active ? "#60a5fa" : "var(--text-muted)",
                        border: `1px solid ${
                          active
                            ? "rgba(59,130,246,0.3)"
                            : "var(--input-border)"
                        }`,
                      }}
                    >
                      {rangeLabel(r)}
                    </button>
                  );
                })}

                {analyticsModal.view === "conversion" && (
                  <div className="flex items-center gap-2 ml-auto">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--text-faint)" }}
                    >
                      Event
                    </label>
                    <input
                      type="text"
                      value={analyticsModal.eventName}
                      onChange={(e) =>
                        setAnalyticsModal((p) => ({
                          ...p,
                          eventName: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          fetchAnalytics(
                            analyticsModal.flagId,
                            "conversion",
                            analyticsModal.rangeKey,
                            analyticsModal.eventName
                          );
                        }
                      }}
                      placeholder="checkout_completed"
                      className="text-xs px-2.5 py-1.5 rounded-lg font-mono"
                      style={{
                        background: "var(--input-bg)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--input-border)",
                        width: 180,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        fetchAnalytics(
                          analyticsModal.flagId,
                          "conversion",
                          analyticsModal.rangeKey,
                          analyticsModal.eventName
                        )
                      }
                      disabled={
                        analyticsModal.loading ||
                        !analyticsModal.eventName.trim()
                      }
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(59,130,246,0.18)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      Yükle
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                {analyticsModal.loading ? (
                  <p
                    className="text-sm py-8 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Yükleniyor…
                  </p>
                ) : analyticsModal.error ? (
                  <p
                    className="text-sm py-8 text-center"
                    style={{ color: "#ef4444" }}
                  >
                    {analyticsModal.error}
                  </p>
                ) : analyticsModal.view === "exposure" ? (
                  !exposureData || exposureVariants.length === 0 ? (
                    <p
                      className="text-sm py-8 text-center"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Bu aralıkta exposure event yok.
                    </p>
                  ) : (
                    <>
                      {/* Exposure Summary */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "var(--input-bg)",
                            border: "1px solid var(--input-border)",
                          }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "var(--text-faint)" }}
                          >
                            Toplam Exposure
                          </p>
                          <p
                            className="text-xl font-bold font-mono"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {exposureData.totalExposures.toLocaleString("tr-TR")}
                          </p>
                        </div>
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "var(--input-bg)",
                            border: "1px solid var(--input-border)",
                          }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "var(--text-faint)" }}
                          >
                            Unique User
                          </p>
                          <p
                            className="text-xl font-bold font-mono"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {exposureData.uniqueUsers.toLocaleString("tr-TR")}
                          </p>
                        </div>
                      </div>

                      {/* Variant breakdown */}
                      <p
                        className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Variant Dağılımı
                      </p>
                      <div className="space-y-2">
                        {exposureVariants.map((v, vi) => {
                          const label = outcomeLabel(v.variantKey, v.isOn);
                          const pct =
                            totalExposures > 0
                              ? (v.totalExposures / totalExposures) * 100
                              : 0;
                          const hue =
                            VARIANT_HUES[vi % VARIANT_HUES.length] ?? 200;
                          const isOff = !v.variantKey && !v.isOn;
                          return (
                            <div
                              key={`${v.variantId ?? "null"}-${v.isOn}`}
                              className="rounded-xl px-3 py-2.5"
                              style={{
                                background: "var(--input-bg)",
                                border: "1px solid var(--input-border)",
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{
                                      background: isOff
                                        ? "#64748b"
                                        : `hsl(${hue},65%,55%)`,
                                    }}
                                  />
                                  <span
                                    className="text-xs font-mono font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {label}
                                  </span>
                                  {isOff && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase"
                                      style={{
                                        background: "rgba(100,116,139,0.15)",
                                        color: "#94a3b8",
                                      }}
                                    >
                                      off
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                  <span style={{ color: "var(--text-muted)" }}>
                                    {v.uniqueUsers.toLocaleString("tr-TR")} user
                                  </span>
                                  <span
                                    className="font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: "var(--bg-page)" }}
                              >
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: isOff
                                      ? "#64748b"
                                      : `hsl(${hue},65%,55%)`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )
                ) : /* ─── CONVERSION VIEW ─── */
                !conversionData || conversionVariants.length === 0 ? (
                  <p
                    className="text-sm py-8 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Bu aralık + event için conversion bulunamadı.
                  </p>
                ) : (
                  <>
                    {/* Conversion Summary */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Toplam Exposed
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {conversionData.totalExposedUsers.toLocaleString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Converted
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {conversionData.totalConvertedUsers.toLocaleString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Toplam Gelir
                        </p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {Number(conversionData.totalValue).toLocaleString(
                            "tr-TR",
                            { maximumFractionDigits: 0 }
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Variant performance */}
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                      style={{ color: "var(--text-faint)" }}
                    >
                      Variant Performansı
                    </p>
                    <div className="space-y-2">
                      {[...conversionVariants]
                        .sort(
                          (a, b) =>
                            conversionRate(b) - conversionRate(a)
                        )
                        .map((v, vi) => {
                          const label = outcomeLabel(v.variantKey, v.isOn);
                          const rate = conversionRate(v);
                          const avg = avgValuePerConverter(v);
                          // Backend stats verilerini öncele; eski client-side fallback hâlâ duruyor.
                          const lift = v.liftPercent ?? null;
                          const isBaseline = v.isBaseline;
                          const isWinner =
                            winner &&
                            v.variantId === winner.variantId &&
                            v.isOn === winner.isOn &&
                            conversionVariants.length > 1 &&
                            !isBaseline;
                          const hue =
                            VARIANT_HUES[vi % VARIANT_HUES.length] ?? 200;

                          // Significance gösterimi: hesaplanmış (non-baseline) variant'larda.
                          const hasStats =
                            !isBaseline && v.pValue !== null && v.pValue !== undefined;

                          return (
                            <div
                              key={`${v.variantId ?? "null"}-${v.isOn}`}
                              className="rounded-xl px-4 py-3"
                              style={{
                                background: "var(--input-bg)",
                                border: isWinner
                                  ? "1px solid rgba(16,185,129,0.4)"
                                  : "1px solid var(--input-border)",
                                boxShadow: isWinner
                                  ? "0 0 0 1px rgba(16,185,129,0.2)"
                                  : "none",
                              }}
                            >
                              {/* Row 1: label + lift badge */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{
                                      background: `hsl(${hue},65%,55%)`,
                                    }}
                                  />
                                  <span
                                    className="text-sm font-mono font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {label}
                                  </span>
                                  {isWinner && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                                      style={{
                                        background: "rgba(16,185,129,0.15)",
                                        color: "#10b981",
                                      }}
                                    >
                                      🏆 Kazanan
                                    </span>
                                  )}
                                  {isBaseline && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase"
                                      style={{
                                        background: "rgba(100,116,139,0.15)",
                                        color: "#94a3b8",
                                      }}
                                    >
                                      baseline
                                    </span>
                                  )}
                                </div>
                                {lift !== null && !isBaseline && (
                                  <span
                                    className="text-sm font-mono font-bold"
                                    style={{
                                      color:
                                        lift > 0
                                          ? "#10b981"
                                          : lift < 0
                                          ? "#ef4444"
                                          : "var(--text-muted)",
                                    }}
                                  >
                                    {lift > 0 ? "+" : ""}
                                    {lift.toFixed(1)}%
                                  </span>
                                )}
                              </div>

                              {/* Row 2: numbers */}
                              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                                <div>
                                  <p
                                    className="text-[10px] uppercase tracking-wider mb-0.5"
                                    style={{ color: "var(--text-faint)" }}
                                  >
                                    Conv. Rate
                                  </p>
                                  <p
                                    className="font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {(rate * 100).toFixed(2)}%
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className="text-[10px] uppercase tracking-wider mb-0.5"
                                    style={{ color: "var(--text-faint)" }}
                                  >
                                    Exposed / Conv.
                                  </p>
                                  <p
                                    className="font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {v.exposedUsers.toLocaleString("tr-TR")} →{" "}
                                    {v.convertedUsers.toLocaleString("tr-TR")}
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className="text-[10px] uppercase tracking-wider mb-0.5"
                                    style={{ color: "var(--text-faint)" }}
                                  >
                                    Avg Value
                                  </p>
                                  <p
                                    className="font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {avg.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {/* Row 3: rate bar */}
                              <div
                                className="h-1.5 rounded-full overflow-hidden mt-2.5"
                                style={{ background: "var(--bg-page)" }}
                              >
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${Math.min(100, rate * 100 * 3)}%`,
                                    background: `hsl(${hue},65%,55%)`,
                                  }}
                                />
                              </div>

                              {/* Row 4: significance + confidence interval */}
                              {hasStats && (
                                <div
                                  className="mt-2.5 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                                  style={{
                                    background: v.isSignificant
                                      ? "rgba(16,185,129,0.08)"
                                      : "rgba(245,158,11,0.08)",
                                    border: v.isSignificant
                                      ? "1px solid rgba(16,185,129,0.2)"
                                      : "1px solid rgba(245,158,11,0.2)",
                                  }}
                                >
                                  <span
                                    className="font-semibold"
                                    style={{
                                      color: v.isSignificant
                                        ? "#10b981"
                                        : "#f59e0b",
                                    }}
                                  >
                                    {v.isSignificant
                                      ? "✓ %95 güvenle anlamlı"
                                      : "⚠ Yetersiz veri"}
                                  </span>
                                  {v.liftCiLowPercent !== null &&
                                    v.liftCiLowPercent !== undefined &&
                                    v.liftCiHighPercent !== null &&
                                    v.liftCiHighPercent !== undefined && (
                                      <span
                                        className="font-mono"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        gerçek lift:{" "}
                                        {v.liftCiLowPercent > 0 ? "+" : ""}
                                        {v.liftCiLowPercent.toFixed(1)}% ~{" "}
                                        {v.liftCiHighPercent > 0 ? "+" : ""}
                                        {v.liftCiHighPercent.toFixed(1)}%
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex justify-end"
                style={{ borderTop: "1px solid var(--divider)" }}
              >
                <button
                  type="button"
                  onClick={() =>
                    fetchAnalytics(
                      analyticsModal.flagId,
                      analyticsModal.view,
                      analyticsModal.rangeKey,
                      analyticsModal.eventName
                    )
                  }
                  disabled={analyticsModal.loading}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--input-border)",
                  }}
                >
                  {analyticsModal.loading ? "Yenileniyor…" : "Yenile"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
