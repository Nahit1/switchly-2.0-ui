"use client";

import { useEffect, useState, useCallback } from "react";
import { organizationService } from "@/lib/services/organization.service";
import { segmentService } from "@/lib/services/segment.service";
import type { Organization } from "@/lib/types/organization";
import type {
  SegmentGroupDto,
  SegmentRuleDto,
  SegmentValueType,
} from "@/lib/types/segment";

/* ── Helpers ──────────────────────────────────────────────────── */

const OPERATORS = [
  { value: "Equals", label: "Eşittir (=)" },
  { value: "NotEquals", label: "Eşit Değildir (≠)" },
  { value: "Contains", label: "İçerir" },
  { value: "NotContains", label: "İçermez" },
  { value: "StartsWith", label: "İle Başlar" },
  { value: "EndsWith", label: "İle Biter" },
  { value: "GreaterThan", label: "Büyüktür (>)" },
  { value: "LessThan", label: "Küçüktür (<)" },
  { value: "GreaterThanOrEqual", label: "Büyük Eşittir (≥)" },
  { value: "LessThanOrEqual", label: "Küçük Eşittir (≤)" },
];

const VALUE_TYPES: { value: SegmentValueType; label: string }[] = [
  { value: 0, label: "Metin (String)" },
  { value: 1, label: "Mantıksal (Boolean)" },
  { value: 2, label: "Tam Sayı (Integer)" },
  { value: 3, label: "Ondalık (Double)" },
];

function operatorLabel(op?: string): string {
  if (!op) return "—";
  return OPERATORS.find((o) => o.value === op)?.label ?? op;
}

function valueTypeLabel(vt?: SegmentValueType): string {
  if (vt === undefined || vt === null) return "—";
  const n = typeof vt === "string" ? parseInt(vt, 10) : vt;
  return VALUE_TYPES.find((v) => v.value === n)?.label ?? String(vt);
}

function getInitials(name?: string): string {
  if (!name) return "S";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ── Create Group Modal State ─────────────────────────────────── */
interface CreateGroupModal {
  open: boolean;
  saving: boolean;
  error: string;
  key: string;
  name: string;
  description: string;
}

const CLOSED_GROUP_MODAL: CreateGroupModal = {
  open: false,
  saving: false,
  error: "",
  key: "",
  name: "",
  description: "",
};

/* ── Create Rule Modal State ──────────────────────────────────── */
interface CreateRuleModal {
  open: boolean;
  saving: boolean;
  error: string;
  traitKey: string;
  operator: string;
  value: string;
  valueType: SegmentValueType;
  sortOrder: number;
}

const CLOSED_CREATE_MODAL: CreateRuleModal = {
  open: false,
  saving: false,
  error: "",
  traitKey: "",
  operator: "Equals",
  value: "",
  valueType: 0,
  sortOrder: 0,
};

/* ── Page ─────────────────────────────────────────────────────── */
export default function SegmentsPage() {
  /* organisations */
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  /* segments */
  const [segments, setSegments] = useState<SegmentGroupDto[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");

  /* tabs */
  const [activeTab, setActiveTab] = useState<"groups" | "rules">("groups");

  /* groups tab */
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [groupRulesCache, setGroupRulesCache] = useState<
    Record<string, SegmentRuleDto[]>
  >({});
  const [groupRulesLoading, setGroupRulesLoading] = useState<Set<string>>(
    new Set()
  );

  /* rules tab */
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [rules, setRules] = useState<SegmentRuleDto[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState("");

  /* create group modal */
  const [groupModal, setGroupModal] =
    useState<CreateGroupModal>(CLOSED_GROUP_MODAL);

  /* create rule modal */
  const [createModal, setCreateModal] =
    useState<CreateRuleModal>(CLOSED_CREATE_MODAL);

  /* ── Load orgs ─────────────────────────────────────────────── */
  useEffect(() => {
    organizationService
      .getAll()
      .then((res) => {
        const list = res.data ?? [];
        setOrgs(list);
        if (list.length > 0)
          setSelectedOrgId((list[0].id ?? list[0]["Id"] ?? "") as string);
      })
      .catch(() => {});
  }, []);

  /* ── Load segments ─────────────────────────────────────────── */
  const loadSegments = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingSegments(true);
    setSegmentsError("");
    setSegments([]);
    setSelectedGroupId("");
    setRules([]);
    setRulesError("");
    setExpandedGroupIds(new Set());
    setGroupRulesCache({});
    setGroupRulesLoading(new Set());
    try {
      const res = await segmentService.getAllGroups(orgId);
      const list =
        res.data ?? (res as { Data?: SegmentGroupDto[] })["Data"] ?? [];
      setSegments(list);
    } catch (e: unknown) {
      setSegmentsError(e instanceof Error ? e.message : "Yüklenemedi.");
    } finally {
      setLoadingSegments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) loadSegments(selectedOrgId);
  }, [selectedOrgId, loadSegments]);

  /* ── Load rules for selected group ─────────────────────────── */
  const loadRules = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setLoadingRules(true);
    setRulesError("");
    setRules([]);
    try {
      const res = await segmentService.getRules(groupId);
      const list =
        res.data ?? (res as { Data?: SegmentRuleDto[] })["Data"] ?? [];
      setRules(list);
    } catch (e: unknown) {
      setRulesError(e instanceof Error ? e.message : "Kurallar yüklenemedi.");
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) loadRules(selectedGroupId);
    else setRules([]);
  }, [selectedGroupId, loadRules]);

  /* ── Toggle group expand + fetch rules ─────────────────────── */
  async function toggleExpand(groupId: string) {
    const isCurrentlyExpanded = expandedGroupIds.has(groupId);

    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });

    // Sadece açılırken fetch et, kapanırken değil
    if (isCurrentlyExpanded) return;

    // Zaten yükleniyor ise tekrar istek atma
    if (groupRulesLoading.has(groupId)) return;

    setGroupRulesLoading((prev) => new Set(prev).add(groupId));
    try {
      const res = await segmentService.getRules(groupId);
      const list =
        res.data ?? (res as { Data?: SegmentRuleDto[] })["Data"] ?? [];
      setGroupRulesCache((prev) => ({ ...prev, [groupId]: list }));
    } catch {
      setGroupRulesCache((prev) => ({ ...prev, [groupId]: [] }));
    } finally {
      setGroupRulesLoading((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }

  /* ── Create group submit ───────────────────────────────────── */
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setGroupModal((m) => ({ ...m, saving: true, error: "" }));
    try {
      await segmentService.createGroup(
        selectedOrgId,
        groupModal.key.trim(),
        groupModal.name.trim(),
        groupModal.description.trim() || null
      );
      /* append to local segments state */
      const newGroup: SegmentGroupDto = {
        id: crypto.randomUUID(),
        key: groupModal.key.trim(),
        name: groupModal.name.trim(),
        description: groupModal.description.trim() || undefined,
        organizationId: selectedOrgId,
        segmentRules: [],
      };
      setSegments((prev) => [...prev, newGroup]);
      setGroupModal(CLOSED_GROUP_MODAL);
    } catch (e: unknown) {
      setGroupModal((m) => ({
        ...m,
        saving: false,
        error: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    }
  }

  /* ── Create rule submit ────────────────────────────────────── */
  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId) return;
    setCreateModal((m) => ({ ...m, saving: true, error: "" }));
    try {
      await segmentService.createRule(selectedGroupId, {
        traitKey: createModal.traitKey.trim(),
        operator: createModal.operator,
        value: createModal.value.trim() || null,
        valueType: createModal.valueType,
        sortOrder: createModal.sortOrder,
      });
      /* append to local rules state */
      const newRule: SegmentRuleDto = {
        traitKey: createModal.traitKey.trim(),
        operator: createModal.operator,
        value: createModal.value.trim() || null,
        valueType: createModal.valueType,
        sortOrder: createModal.sortOrder,
      };
      setRules((prev) => [...prev, newRule]);
      setCreateModal(CLOSED_CREATE_MODAL);
    } catch (e: unknown) {
      setCreateModal((m) => ({
        ...m,
        saving: false,
        error: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    }
  }

  /* ── Derived ───────────────────────────────────────────────── */
  const selectedGroup = segments.find(
    (g) => (g.id ?? g["Id"]) === selectedGroupId
  );

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Segmentasyon
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Segment gruplarını ve kurallarını yönetin.
        </p>
      </div>

      {/* Tab navigation */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: "var(--sidebar-item-bg)" }}
      >
        {(["groups", "rules"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "var(--card-bg)" : "transparent",
              color:
                activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow:
                activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab === "groups" ? (
              <span className="flex items-center justify-center gap-2">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Segment Grupları
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Segment Kuralları
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Segment Grupları ───────────────────────────────── */}
      {activeTab === "groups" && (
        <>
          {/* Org filter bar */}
          <div
            className="flex items-center gap-3 flex-wrap pb-5"
            style={{ borderBottom: "1px solid var(--divider)" }}
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <svg
                className="w-4 h-4 flex-shrink-0"
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
                className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                style={{ color: "var(--text-faint)" }}
              >
                Organizasyon
              </span>
              <div
                className="w-px h-4 flex-shrink-0"
                style={{ background: "var(--divider)" }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {orgs.map((o) => {
                const oId = (o.id ?? o["Id"] ?? "") as string;
                const oName = (o.name ?? o["Name"] ?? "") as string;
                const active = selectedOrgId === oId;
                return (
                  <button
                    key={oId}
                    onClick={() => setSelectedOrgId(oId)}
                    className="px-3 py-1 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: active
                        ? "rgba(124,58,237,0.15)"
                        : "var(--sidebar-item-bg)",
                      color: active ? "#a78bfa" : "var(--text-muted)",
                      border: active
                        ? "1px solid rgba(124,58,237,0.3)"
                        : "1px solid transparent",
                    }}
                  >
                    {oName}
                  </button>
                );
              })}
            </div>

            {/* New group button */}
            {selectedOrgId && (
              <button
                onClick={() =>
                  setGroupModal({ ...CLOSED_GROUP_MODAL, open: true })
                }
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.3)",
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Yeni Grup Ekle
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {loadingSegments && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl animate-pulse"
                  style={{ background: "var(--card-bg)" }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {segmentsError && !loadingSegments && (
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {segmentsError}
            </div>
          )}

          {/* Empty state */}
          {!loadingSegments &&
            !segmentsError &&
            segments.length === 0 &&
            selectedOrgId && (
              <div
                className="rounded-2xl p-12 text-center"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(124,58,237,0.1)" }}
                >
                  <svg
                    className="w-7 h-7"
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
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Segment grubu bulunamadı
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Bu organizasyona ait henüz segment grubu yok.
                </p>
              </div>
            )}

          {/* Group list */}
          <div className="flex flex-col gap-3">
            {segments.map((group) => {
              const gId = group.id ?? (group as { Id?: string })["Id"] ?? "";
              const gName =
                group.name ?? (group as { Name?: string })["Name"] ?? "—";
              const gKey =
                group.key ?? (group as { Key?: string })["Key"] ?? "";
              const gDesc =
                group.description ??
                (group as { Description?: string })["Description"] ??
                "";
              const isExpanded = expandedGroupIds.has(gId);
              const isGroupRulesLoading = groupRulesLoading.has(gId);
              const cachedRules = groupRulesCache[gId];

              return (
                <div
                  key={gId}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  {/* Group header row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
                      }}
                    >
                      {getInitials(gName)}
                    </div>

                    {/* Name + key + desc */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {gName}
                        </span>
                        {gKey && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-mono"
                            style={{
                              background: "rgba(124,58,237,0.1)",
                              color: "#a78bfa",
                            }}
                          >
                            {gKey}
                          </span>
                        )}
                      </div>
                      {gDesc && (
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {gDesc}
                        </p>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(gId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: isExpanded
                            ? "rgba(124,58,237,0.15)"
                            : "var(--sidebar-item-bg)",
                          color: isExpanded ? "#a78bfa" : "var(--text-muted)",
                        }}
                      >
                        <span>{isExpanded ? "Gizle" : "Kurallar"}</span>
                        <svg
                          className="w-3.5 h-3.5 transition-transform"
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
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded rules */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-4"
                      style={{ borderTop: "1px solid var(--divider)" }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-widest pt-3 pb-2"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Kurallar
                      </p>
                      {/* Loading */}
                      {isGroupRulesLoading && (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-10 rounded-xl animate-pulse"
                              style={{ background: "var(--sidebar-item-bg)" }}
                            />
                          ))}
                        </div>
                      )}
                      {/* No rules */}
                      {!isGroupRulesLoading &&
                        cachedRules &&
                        cachedRules.length === 0 && (
                          <p
                            className="text-sm"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Bu gruba ait kural bulunmuyor.
                          </p>
                        )}
                      {/* Not yet fetched */}
                      {!isGroupRulesLoading && !cachedRules && (
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Yükleniyor…
                        </p>
                      )}
                      {/* Rules list */}
                      {!isGroupRulesLoading &&
                        cachedRules &&
                        cachedRules.length > 0 && (
                          <div className="space-y-2">
                            {cachedRules.map((rule, idx) => {
                              const rTraitKey =
                                rule.traitKey ??
                                (rule as { TraitKey?: string })["TraitKey"] ??
                                "—";
                              const rOperator =
                                rule.operator ??
                                (rule as { Operator?: string })["Operator"];
                              const rValue =
                                rule.value ??
                                (rule as { Value?: string })["Value"];
                              const rValueType =
                                rule.valueType ??
                                (rule as { ValueType?: SegmentValueType })[
                                  "ValueType"
                                ];
                              const rSortOrder =
                                rule.sortOrder ??
                                (rule as { SortOrder?: number })["SortOrder"] ??
                                idx;
                              return (
                                <div
                                  key={rule.id ?? idx}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                  style={{
                                    background: "var(--sidebar-item-bg)",
                                  }}
                                >
                                  {/* Sort order */}
                                  <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{
                                      background: "rgba(124,58,237,0.15)",
                                      color: "#a78bfa",
                                    }}
                                  >
                                    {rSortOrder}
                                  </span>
                                  {/* Trait key */}
                                  <span
                                    className="font-mono text-sm font-medium"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {rTraitKey}
                                  </span>
                                  {/* Operator */}
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      background: "rgba(59,130,246,0.1)",
                                      color: "#60a5fa",
                                    }}
                                  >
                                    {operatorLabel(rOperator)}
                                  </span>
                                  {/* Value */}
                                  {rValue !== undefined &&
                                    rValue !== null &&
                                    rValue !== "" && (
                                      <span
                                        className="font-mono text-xs px-2 py-0.5 rounded"
                                        style={{
                                          background: "rgba(16,185,129,0.1)",
                                          color: "#34d399",
                                        }}
                                      >
                                        {String(rValue)}
                                      </span>
                                    )}
                                  {/* Value type */}
                                  <span
                                    className="ml-auto text-xs"
                                    style={{ color: "var(--text-faint)" }}
                                  >
                                    {valueTypeLabel(rValueType)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── TAB: Segment Kuralları ──────────────────────────────── */}
      {activeTab === "rules" && (
        <>
          {/* Group filter bar */}
          {segments.length > 0 && (
            <div
              className="flex items-center gap-3 flex-wrap pb-5"
              style={{ borderBottom: "1px solid var(--divider)" }}
            >
              <div className="flex items-center gap-3 flex-shrink-0">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--text-faint)" }}
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
                <span
                  className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                  style={{ color: "var(--text-faint)" }}
                >
                  Segment Grubu
                </span>
                <div
                  className="w-px h-4 flex-shrink-0"
                  style={{ background: "var(--divider)" }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {segments.map((g) => {
                  const gId = g.id ?? (g as { Id?: string })["Id"] ?? "";
                  const gName =
                    g.name ?? (g as { Name?: string })["Name"] ?? "—";
                  const active = selectedGroupId === gId;
                  return (
                    <button
                      key={gId}
                      onClick={() => setSelectedGroupId(gId)}
                      className="px-3 py-1 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: active
                          ? "rgba(124,58,237,0.15)"
                          : "var(--sidebar-item-bg)",
                        color: active ? "#a78bfa" : "var(--text-muted)",
                        border: active
                          ? "1px solid rgba(124,58,237,0.3)"
                          : "1px solid transparent",
                      }}
                    >
                      {gName}
                    </button>
                  );
                })}
              </div>

              {/* Create rule button */}
              {selectedGroupId && (
                <button
                  onClick={() =>
                    setCreateModal({ ...CLOSED_CREATE_MODAL, open: true })
                  }
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "rgba(124,58,237,0.15)",
                    color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.3)",
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Yeni Kural Ekle
                </button>
              )}
            </div>
          )}

          {/* No org selected */}
          {!selectedOrgId && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Kuralları görmek için önce bir organizasyon seçin.
              </p>
            </div>
          )}

          {/* No groups */}
          {selectedOrgId && segments.length === 0 && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Bu organizasyona ait segment grubu bulunmuyor.
              </p>
            </div>
          )}

          {/* No group selected */}
          {segments.length > 0 && !selectedGroupId && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(124,58,237,0.1)" }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: "#a78bfa" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <p
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Segment grubu seçin
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Kuralları listelemek için yukarıdan bir segment grubu seçin.
              </p>
            </div>
          )}

          {/* Rules loading */}
          {selectedGroupId && loadingRules && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl animate-pulse"
                  style={{ background: "var(--card-bg)" }}
                />
              ))}
            </div>
          )}

          {/* Rules error */}
          {selectedGroupId && rulesError && !loadingRules && (
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {rulesError}
            </div>
          )}

          {/* Rules list */}
          {selectedGroupId && !loadingRules && !rulesError && (
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <p
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Kural bulunamadı
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Bu gruba ait kural yok. Yeni kural eklemek için butonu
                    kullanın.
                  </p>
                  <button
                    onClick={() =>
                      setCreateModal({ ...CLOSED_CREATE_MODAL, open: true })
                    }
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium mx-auto transition-all"
                    style={{
                      background: "rgba(124,58,237,0.15)",
                      color: "#a78bfa",
                      border: "1px solid rgba(124,58,237,0.3)",
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Yeni Kural Ekle
                  </button>
                </div>
              ) : (
                rules.map((rule, idx) => {
                  const rId = rule.id ?? (rule as { Id?: string })["Id"];
                  const rTraitKey =
                    rule.traitKey ??
                    (rule as { TraitKey?: string })["TraitKey"] ??
                    "—";
                  const rOperator =
                    rule.operator ??
                    (rule as { Operator?: string })["Operator"];
                  const rValue =
                    rule.value ?? (rule as { Value?: string })["Value"];
                  const rValueType =
                    rule.valueType ??
                    (rule as { ValueType?: SegmentValueType })["ValueType"];
                  const rSortOrder =
                    rule.sortOrder ??
                    (rule as { SortOrder?: number })["SortOrder"] ??
                    idx;
                  return (
                    <div
                      key={rId ?? idx}
                      className="rounded-2xl px-5 py-4 flex items-center gap-4"
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                      }}
                    >
                      {/* Sort order bubble */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: "rgba(124,58,237,0.15)",
                          color: "#a78bfa",
                        }}
                      >
                        {rSortOrder}
                      </div>

                      {/* Trait key */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-mono text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {rTraitKey}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-faint)" }}
                        >
                          {valueTypeLabel(rValueType)}
                        </p>
                      </div>

                      {/* Operator pill */}
                      <span
                        className="text-xs px-3 py-1 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: "rgba(59,130,246,0.1)",
                          color: "#60a5fa",
                        }}
                      >
                        {operatorLabel(rOperator)}
                      </span>

                      {/* Value */}
                      {rValue !== undefined &&
                      rValue !== null &&
                      String(rValue).trim() !== "" ? (
                        <span
                          className="font-mono text-sm px-3 py-1 rounded-xl flex-shrink-0"
                          style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "#34d399",
                          }}
                        >
                          {String(rValue)}
                        </span>
                      ) : (
                        <span
                          className="text-xs italic flex-shrink-0"
                          style={{ color: "var(--text-faint)" }}
                        >
                          —
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create Group Modal ──────────────────────────────────── */}
      {groupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() =>
              !groupModal.saving && setGroupModal(CLOSED_GROUP_MODAL)
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Yeni Segment Grubu
                </h3>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Seçili organizasyona yeni bir segment grubu ekle
                </p>
              </div>
              <button
                onClick={() =>
                  !groupModal.saving && setGroupModal(CLOSED_GROUP_MODAL)
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

            <form onSubmit={handleCreateGroup} className="space-y-4">
              {/* Name */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Ad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn. Premium Kullanıcılar"
                  value={groupModal.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoKey = name
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-_]/g, "");
                    setGroupModal((m) => ({
                      ...m,
                      name,
                      key:
                        m.key === "" ||
                        m.key ===
                          m.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-_]/g, "")
                          ? autoKey
                          : m.key,
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Key */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Anahtar (Key) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn. premium-users"
                  value={groupModal.key}
                  onChange={(e) =>
                    setGroupModal((m) => ({
                      ...m,
                      key: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-_]/g, ""),
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono transition-all outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  placeholder="Bu segment grubunun amacını açıklayın (opsiyonel)"
                  value={groupModal.description}
                  onChange={(e) =>
                    setGroupModal((m) => ({
                      ...m,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all outline-none resize-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Error */}
              {groupModal.error && (
                <div
                  className="rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {groupModal.error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    !groupModal.saving && setGroupModal(CLOSED_GROUP_MODAL)
                  }
                  disabled={groupModal.saving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={
                    groupModal.saving ||
                    !groupModal.name.trim() ||
                    !groupModal.key.trim()
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background:
                      groupModal.saving ||
                      !groupModal.name.trim() ||
                      !groupModal.key.trim()
                        ? "rgba(124,58,237,0.3)"
                        : "rgba(124,58,237,0.8)",
                    color: "white",
                    cursor:
                      groupModal.saving ||
                      !groupModal.name.trim() ||
                      !groupModal.key.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {groupModal.saving ? (
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
                      Kaydediliyor…
                    </>
                  ) : (
                    "Grup Ekle"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Rule Modal ───────────────────────────────────── */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() =>
              !createModal.saving && setCreateModal(CLOSED_CREATE_MODAL)
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Yeni Kural Ekle
                </h3>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {selectedGroup?.name ?? "Seçili grup"} için yeni segment
                  kuralı
                </p>
              </div>
              <button
                onClick={() =>
                  !createModal.saving && setCreateModal(CLOSED_CREATE_MODAL)
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

            <form onSubmit={handleCreateRule} className="space-y-4">
              {/* Trait Key */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Özellik Anahtarı (Trait Key) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn. user_country, plan_type"
                  value={createModal.traitKey}
                  onChange={(e) =>
                    setCreateModal((m) => ({ ...m, traitKey: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono transition-all outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Operator + Value Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Operatör *
                  </label>
                  <select
                    required
                    value={String(createModal.operator)}
                    onChange={(e) =>
                      setCreateModal((m) => ({
                        ...m,
                        operator: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm transition-all outline-none"
                    style={{
                      background: "var(--sidebar-item-bg)",
                      border: "1px solid var(--divider)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Değer Tipi *
                  </label>
                  <select
                    required
                    value={String(createModal.valueType)}
                    onChange={(e) =>
                      setCreateModal((m) => ({
                        ...m,
                        valueType: Number(e.target.value) as SegmentValueType,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm transition-all outline-none"
                    style={{
                      background: "var(--sidebar-item-bg)",
                      border: "1px solid var(--divider)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {VALUE_TYPES.map((vt) => (
                      <option key={String(vt.value)} value={String(vt.value)}>
                        {vt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Value */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Değer
                </label>
                <input
                  type="text"
                  placeholder="Karşılaştırılacak değer (opsiyonel)"
                  value={createModal.value}
                  onChange={(e) =>
                    setCreateModal((m) => ({ ...m, value: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono transition-all outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Sort Order */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--text-faint)" }}
                >
                  Sıralama
                </label>
                <input
                  type="number"
                  min={0}
                  value={createModal.sortOrder}
                  onChange={(e) =>
                    setCreateModal((m) => ({
                      ...m,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    border: "1px solid var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Error */}
              {createModal.error && (
                <div
                  className="rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {createModal.error}
                </div>
              )}

              {/* Preview */}
              {createModal.traitKey && (
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  <span
                    className="font-mono font-semibold"
                    style={{ color: "#a78bfa" }}
                  >
                    {createModal.traitKey}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(59,130,246,0.1)",
                      color: "#60a5fa",
                    }}
                  >
                    {operatorLabel(createModal.operator)}
                  </span>
                  {createModal.value && (
                    <span
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "#34d399",
                      }}
                    >
                      {createModal.value}
                    </span>
                  )}
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {
                      VALUE_TYPES.find((v) => v.value === createModal.valueType)
                        ?.label
                    }
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    !createModal.saving && setCreateModal(CLOSED_CREATE_MODAL)
                  }
                  disabled={createModal.saving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "var(--sidebar-item-bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createModal.saving || !createModal.traitKey.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background:
                      createModal.saving || !createModal.traitKey.trim()
                        ? "rgba(124,58,237,0.3)"
                        : "rgba(124,58,237,0.8)",
                    color: "white",
                    cursor:
                      createModal.saving || !createModal.traitKey.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {createModal.saving ? (
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
                      Kaydediliyor…
                    </>
                  ) : (
                    "Kural Ekle"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
