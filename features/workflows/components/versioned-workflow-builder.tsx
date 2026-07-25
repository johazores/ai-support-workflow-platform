"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  workflowActionRegistry,
  workflowConditionFieldRegistry,
  workflowConditionOperatorRegistry,
  workflowTriggerRegistry,
  supportedTicketPriorities,
  supportedTicketStatuses,
  getWorkflowActionDefinition,
} from "@/features/workflows/services/workflow-node-registry";
import {
  archiveVersionedWorkflowClient,
  createVersionedWorkflowClient,
  fetchVersionedWorkflow,
  fetchVersionedWorkflows,
  fetchWorkflowEditorOptions,
  fetchWorkflowVersions,
  publishVersionedWorkflowClient,
  runVersionedWorkflow,
  saveVersionedWorkflowClient,
  workflowApiErrorMessage,
  type WorkflowDetail,
  type WorkflowEditorOptions,
  type WorkflowExecutionResult,
  type WorkflowSummary,
  type WorkflowVersionSummary,
} from "@/features/workflows/services/workflow-definition-client-service";
import type {
  WorkflowActionNode,
  WorkflowConditionNode,
  WorkflowDefinition,
  WorkflowEdgeBranch,
  WorkflowNode,
  WorkflowTriggerNode,
} from "@/features/workflows/types/workflow-definition";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 760;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 132;
const MAX_HISTORY = 30;

const emptyOptions: WorkflowEditorOptions = { users: [], tags: [] };

type DragState = {
  nodeId: string;
  pointerX: number;
  pointerY: number;
  nodeX: number;
  nodeY: number;
};

type ConnectionDraft = {
  sourceId: string;
  branch?: WorkflowEdgeBranch;
};

function makeId(prefix: string) {
  return `${prefix}-${window.crypto.randomUUID()}`;
}

function newWorkflowDefinition(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: makeId("trigger"),
        type: "trigger",
        position: { x: 56, y: 88 },
        data: { label: "Manual run", triggerType: "manual" },
      },
    ],
    edges: [],
  };
}

function defaultActionValue(
  actionType: WorkflowActionNode["data"]["actionType"],
  options: WorkflowEditorOptions,
) {
  const definition = getWorkflowActionDefinition(actionType);
  if (definition?.valueKind === "status") return "pending";
  if (definition?.valueKind === "priority") return "normal";
  if (definition?.valueKind === "member") return options.users[0]?.email ?? "";
  if (definition?.valueKind === "tag") return options.tags[0]?.id ?? "";
  return "";
}

function nodeTone(type: WorkflowNode["type"]) {
  if (type === "trigger") {
    return "border-emerald-200 dark:border-emerald-900";
  }
  if (type === "condition") {
    return "border-amber-200 dark:border-amber-900";
  }
  return "border-sky-200 dark:border-sky-900";
}

function cloneDefinition(definition: WorkflowDefinition): WorkflowDefinition {
  return structuredClone(definition);
}

function formatVersionDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VersionedWorkflowBuilder() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [options, setOptions] = useState<WorkflowEditorOptions>(emptyOptions);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled workflow");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<WorkflowDefinition>({
    nodes: [],
    edges: [],
  });
  const [version, setVersion] = useState(0);
  const [versionStatus, setVersionStatus] = useState("draft");
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<WorkflowVersionSummary[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionDraft | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [history, setHistory] = useState<WorkflowDefinition[]>([]);
  const [future, setFuture] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [testTicketId, setTestTicketId] = useState("");
  const [running, setRunning] = useState(false);
  const [lastExecution, setLastExecution] =
    useState<WorkflowExecutionResult | null>(null);
  const revisionRef = useRef(0);

  const selectedNode = useMemo(
    () => definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [definition.nodes, selectedNodeId],
  );
  const activeWorkflows = useMemo(
    () => workflows.filter((workflow) => workflow.status !== "archived"),
    [workflows],
  );

  useEffect(() => {
    Promise.all([fetchVersionedWorkflows(), fetchWorkflowEditorOptions()])
      .then(async ([nextWorkflows, nextOptions]) => {
        setWorkflows(nextWorkflows);
        setOptions(nextOptions);

        const first = nextWorkflows.find(
          (workflow) => workflow.status !== "archived",
        );
        if (first) {
          const detail = await fetchVersionedWorkflow(first.id);
          await loadDetail(detail);
        } else {
          resetNewWorkflow();
        }
      })
      .catch((error) => {
        toast(workflowApiErrorMessage(error), "error");
        resetNewWorkflow();
      })
      .finally(() => setLoading(false));
    // Initial product data load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workflowId || !dirty || saving || publishing || loading) return;

    const timer = window.setTimeout(() => {
      const capturedRevision = revisionRef.current;
      void persistWorkflow({
        silent: true,
        capturedRevision,
      }).catch((error) => {
        toast(`Autosave failed: ${workflowApiErrorMessage(error)}`, "error");
      });
    }, 1800);

    return () => window.clearTimeout(timer);
    // persistWorkflow intentionally uses current editor state captured by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, dirty, name, description, definition, saving, publishing, loading]);

  async function refreshList() {
    setWorkflows(await fetchVersionedWorkflows());
  }

  async function refreshVersions(id: string) {
    setVersions(await fetchWorkflowVersions(id));
  }

  async function loadDetail(detail: WorkflowDetail) {
    setWorkflowId(detail.id);
    setName(detail.name);
    setDescription(detail.description ?? "");
    setDefinition(cloneDefinition(detail.version.definition));
    setVersion(detail.version.version);
    setVersionStatus(detail.version.status);
    setPublishedVersion(detail.publishedVersion);
    setSelectedNodeId(detail.version.definition.nodes[0]?.id ?? null);
    setConnection(null);
    setHistory([]);
    setFuture([]);
    setDirty(false);
    setLastExecution(null);
    revisionRef.current = 0;
    await refreshVersions(detail.id);
  }

  function resetNewWorkflow() {
    const nextDefinition = newWorkflowDefinition();
    setWorkflowId(null);
    setName("Untitled workflow");
    setDescription("");
    setDefinition(nextDefinition);
    setVersion(0);
    setVersionStatus("draft");
    setPublishedVersion(null);
    setVersions([]);
    setSelectedNodeId(nextDefinition.nodes[0]?.id ?? null);
    setConnection(null);
    setHistory([]);
    setFuture([]);
    setDirty(false);
    setLastExecution(null);
    revisionRef.current = 0;
  }

  function markDirty() {
    revisionRef.current += 1;
    setDirty(true);
  }

  function pushHistory(snapshot: WorkflowDefinition) {
    setHistory((current) => [
      ...current.slice(-(MAX_HISTORY - 1)),
      cloneDefinition(snapshot),
    ]);
    setFuture([]);
  }

  function updateDefinition(
    updater: (current: WorkflowDefinition) => WorkflowDefinition,
    recordHistory = true,
  ) {
    setDefinition((current) => {
      if (recordHistory) pushHistory(current);
      return updater(current);
    });
    markDirty();
  }

  function updateNode(
    nodeId: string,
    updater: (node: WorkflowNode) => WorkflowNode,
  ) {
    updateDefinition((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? updater(node) : node,
      ),
    }));
  }

  function undo() {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      setFuture((next) => [cloneDefinition(definition), ...next].slice(0, MAX_HISTORY));
      setDefinition(cloneDefinition(previous));
      markDirty();
      return current.slice(0, -1);
    });
  }

  function redo() {
    setFuture((current) => {
      const next = current[0];
      if (!next) return current;
      setHistory((previous) => [
        ...previous.slice(-(MAX_HISTORY - 1)),
        cloneDefinition(definition),
      ]);
      setDefinition(cloneDefinition(next));
      markDirty();
      return current.slice(1);
    });
  }

  function addNode(type: WorkflowNode["type"]) {
    if (
      type === "trigger" &&
      definition.nodes.some((node) => node.type === "trigger")
    ) {
      toast("A workflow can have only one trigger", "error");
      return;
    }

    const offset = Math.min(definition.nodes.length * 26, 240);
    let node: WorkflowNode;

    if (type === "trigger") {
      node = {
        id: makeId("trigger"),
        type: "trigger",
        position: { x: 56 + offset, y: 88 + offset },
        data: { label: "Manual run", triggerType: "manual" },
      };
    } else if (type === "condition") {
      node = {
        id: makeId("condition"),
        type: "condition",
        position: { x: 360 + offset, y: 180 + offset },
        data: {
          label: "Condition",
          field: "subject",
          operator: "contains",
          value: "",
        },
      };
    } else {
      node = {
        id: makeId("action"),
        type: "action",
        position: { x: 690 + offset, y: 180 + offset },
        data: {
          label: "Change status",
          actionType: "change-status",
          value: "pending",
        },
      };
    }

    updateDefinition((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }));
    setSelectedNodeId(node.id);
  }

  function removeNode(nodeId: string) {
    updateDefinition((current) => ({
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connection?.sourceId === nodeId) setConnection(null);
  }

  function disconnectNode(nodeId: string) {
    updateDefinition((current) => ({
      ...current,
      edges: current.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    }));
  }

  function beginConnection(node: WorkflowNode, branch?: WorkflowEdgeBranch) {
    if (node.type === "condition") {
      if (!branch) return;
      const branchExists = definition.edges.some(
        (edge) => edge.source === node.id && edge.branch === branch,
      );
      if (branchExists) {
        toast(`${branch === "true" ? "True" : "False"} branch already connected`, "error");
        return;
      }
    }

    setConnection({ sourceId: node.id, branch });
    toast("Choose a destination node", "success");
  }

  function completeConnection(target: WorkflowNode) {
    if (!connection) return;
    if (connection.sourceId === target.id) {
      setConnection(null);
      return;
    }
    if (target.type === "trigger") {
      toast("The trigger cannot receive incoming connections", "error");
      return;
    }

    const exists = definition.edges.some(
      (edge) =>
        edge.source === connection.sourceId &&
        edge.target === target.id &&
        edge.branch === connection.branch,
    );
    if (exists) {
      setConnection(null);
      toast("Those nodes are already connected", "error");
      return;
    }

    updateDefinition((current) => ({
      ...current,
      edges: [
        ...current.edges,
        {
          id: makeId("edge"),
          source: connection.sourceId,
          target: target.id,
          ...(connection.branch ? { branch: connection.branch } : {}),
        },
      ],
    }));
    setConnection(null);
  }

  function handleDragStart(
    event: ReactPointerEvent<HTMLDivElement>,
    node: WorkflowNode,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistory(definition);
    setDragState({
      nodeId: node.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      nodeX: node.position.x,
      nodeY: node.position.y,
    });
  }

  function handleDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState) return;

    const x = Math.min(
      CANVAS_WIDTH - NODE_WIDTH - 16,
      Math.max(16, dragState.nodeX + event.clientX - dragState.pointerX),
    );
    const y = Math.min(
      CANVAS_HEIGHT - NODE_HEIGHT - 16,
      Math.max(16, dragState.nodeY + event.clientY - dragState.pointerY),
    );

    setDefinition((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === dragState.nodeId
          ? { ...node, position: { x, y } }
          : node,
      ),
    }));
    markDirty();
  }

  function handleDragEnd() {
    setDragState(null);
  }

  function applySavedMetadata(detail: WorkflowDetail, capturedRevision: number) {
    setWorkflowId(detail.id);
    setVersion(detail.version.version);
    setVersionStatus(detail.version.status);
    setPublishedVersion(detail.publishedVersion);
    if (revisionRef.current === capturedRevision) setDirty(false);
  }

  async function persistWorkflow(input?: {
    silent?: boolean;
    capturedRevision?: number;
  }) {
    const capturedRevision = input?.capturedRevision ?? revisionRef.current;
    setSaving(true);
    try {
      const payload = { name, description, definition };
      const detail = workflowId
        ? await saveVersionedWorkflowClient(workflowId, payload)
        : await createVersionedWorkflowClient(payload);
      applySavedMetadata(detail, capturedRevision);
      await Promise.all([refreshList(), refreshVersions(detail.id)]);
      if (!input?.silent) toast("Workflow draft saved", "success");
      return detail;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    try {
      await persistWorkflow();
    } catch (error) {
      toast(workflowApiErrorMessage(error), "error");
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      let id = workflowId;
      if (dirty || !id) {
        const saved = await persistWorkflow({ silent: true });
        id = saved.id;
      }
      if (!id) throw new Error("Save the workflow before publishing");

      const detail = await publishVersionedWorkflowClient(id);
      await loadDetail(detail);
      await refreshList();
      toast(`Workflow version ${detail.version.version} published`, "success");
    } catch (error) {
      toast(workflowApiErrorMessage(error), "error");
    } finally {
      setPublishing(false);
    }
  }

  async function discardChanges() {
    if (!workflowId) {
      resetNewWorkflow();
      return;
    }

    try {
      const detail = await fetchVersionedWorkflow(workflowId);
      await loadDetail(detail);
    } catch (error) {
      toast(workflowApiErrorMessage(error), "error");
    }
  }

  async function archiveWorkflow() {
    if (!workflowId) return;
    setArchiving(true);
    try {
      await archiveVersionedWorkflowClient(workflowId);
      await refreshList();
      resetNewWorkflow();
      toast("Workflow archived", "success");
    } catch (error) {
      toast(workflowApiErrorMessage(error), "error");
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
    }
  }

  async function selectWorkflow(id: string) {
    if (dirty) {
      toast("Save or discard your current changes before switching", "error");
      return;
    }

    try {
      const detail = await fetchVersionedWorkflow(id);
      await loadDetail(detail);
    } catch (error) {
      toast(workflowApiErrorMessage(error), "error");
    }
  }

  async function handleRun() {
    if (!workflowId || !testTicketId.trim()) return;
    setRunning(true);
    try {
      const execution = await runVersionedWorkflow(
        workflowId,
        testTicketId.trim(),
      );
      setLastExecution(execution);
      toast("Published workflow execution completed", "success");
    } catch (error) {
      setLastExecution(null);
      toast(workflowApiErrorMessage(error), "error");
    } finally {
      setRunning(false);
    }
  }

  function beginNewWorkflow() {
    if (dirty) {
      toast("Save or discard current changes before creating another workflow", "error");
      return;
    }
    resetNewWorkflow();
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="animate-pulse text-sm text-slate-500">
          Loading workflow builder...
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Button fullWidth onClick={beginNewWorkflow}>
          New Workflow
        </Button>

        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workflows
          </p>
          <div className="space-y-1">
            {activeWorkflows.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                No saved workflows yet.
              </p>
            ) : (
              activeWorkflows.map((workflow) => (
                <button
                  key={workflow.id}
                  type="button"
                  onClick={() => selectWorkflow(workflow.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                    workflow.id === workflowId
                      ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="block truncate text-sm font-medium">
                    {workflow.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Latest v{workflow.latestVersion ?? "—"} · {workflow.latestVersionStatus ?? "draft"}
                  </span>
                  {workflow.publishedVersion && (
                    <span className="mt-0.5 block text-[11px] text-emerald-600 dark:text-emerald-400">
                      Live v{workflow.publishedVersion}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <Input
                label="Workflow name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  markDirty();
                }}
                maxLength={120}
                fullWidth
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    markDirty();
                  }}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {workflowId ? `Editing version ${version}` : "New draft"}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {publishedVersion
                  ? `Published version ${publishedVersion} remains live while you edit.`
                  : "Nothing runs until this workflow is published."}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {versionStatus === "published"
                  ? "Published versions are immutable. The next edit creates a draft."
                  : dirty && workflowId
                    ? "Autosaves after a short pause."
                    : "Draft is ready for changes."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={handleSave} isLoading={saving}>
              Save Draft
            </Button>
            <Button
              variant="secondary"
              onClick={handlePublish}
              isLoading={publishing}
            >
              Publish
            </Button>
            <Button variant="tertiary" onClick={undo} disabled={history.length === 0}>
              Undo
            </Button>
            <Button variant="tertiary" onClick={redo} disabled={future.length === 0}>
              Redo
            </Button>
            {dirty && (
              <Button variant="tertiary" onClick={discardChanges}>
                Discard
              </Button>
            )}
            {workflowId && (
              <Button
                variant="tertiary"
                onClick={() => setArchiveOpen(true)}
                className="text-red-600 dark:text-red-400"
              >
                Archive
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Add node
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addNode("trigger")}
                disabled={definition.nodes.some((node) => node.type === "trigger")}
              >
                Trigger
              </Button>
              <Button size="sm" variant="secondary" onClick={() => addNode("condition")}>
                Condition
              </Button>
              <Button size="sm" variant="secondary" onClick={() => addNode("action")}>
                Action
              </Button>
              {connection && (
                <Button size="sm" variant="tertiary" onClick={() => setConnection(null)}>
                  Cancel Connection
                </Button>
              )}
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-950">
              <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                  aria-hidden="true"
                >
                  <defs>
                    <marker id="workflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {definition.edges.map((edge) => {
                    const source = definition.nodes.find((node) => node.id === edge.source);
                    const target = definition.nodes.find((node) => node.id === edge.target);
                    if (!source || !target) return null;
                    const x1 = source.position.x + NODE_WIDTH;
                    const y1 = source.position.y + NODE_HEIGHT / 2;
                    const x2 = target.position.x;
                    const y2 = target.position.y + NODE_HEIGHT / 2;

                    return (
                      <g key={edge.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-slate-300 dark:text-slate-600"
                          markerEnd="url(#workflow-arrow)"
                        />
                        {edge.branch && (
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 - 6}
                            textAnchor="middle"
                            className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400"
                          >
                            {edge.branch === "true" ? "TRUE" : "FALSE"}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {definition.nodes.map((node) => {
                  const connected = definition.edges.some(
                    (edge) => edge.source === node.id || edge.target === node.id,
                  );
                  const isSource = connection?.sourceId === node.id;
                  const canComplete = !!connection && !isSource && node.type !== "trigger";

                  return (
                    <div
                      key={node.id}
                      className={`absolute overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${nodeTone(node.type)} ${
                        selectedNodeId === node.id
                          ? "ring-2 ring-slate-900 dark:ring-white"
                          : ""
                      }`}
                      style={{
                        width: NODE_WIDTH,
                        minHeight: NODE_HEIGHT,
                        left: node.position.x,
                        top: node.position.y,
                      }}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      <div
                        className="touch-none cursor-grab border-b border-slate-100 px-3 py-2 active:cursor-grabbing dark:border-slate-800"
                        onPointerDown={(event) => handleDragStart(event, node)}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {node.type}
                          </span>
                          <span className="text-slate-300">⋮⋮</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {node.data.label}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
                        {canComplete ? (
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              completeConnection(node);
                            }}
                          >
                            Connect here
                          </Button>
                        ) : node.type === "condition" ? (
                          <>
                            <Button
                              size="sm"
                              variant="tertiary"
                              onClick={(event) => {
                                event.stopPropagation();
                                beginConnection(node, "true");
                              }}
                            >
                              True
                            </Button>
                            <Button
                              size="sm"
                              variant="tertiary"
                              onClick={(event) => {
                                event.stopPropagation();
                                beginConnection(node, "false");
                              }}
                            >
                              False
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant={isSource ? "primary" : "tertiary"}
                            onClick={(event) => {
                              event.stopPropagation();
                              beginConnection(node);
                            }}
                          >
                            {isSource ? "Source" : "Connect"}
                          </Button>
                        )}
                        {connected && (
                          <Button
                            size="sm"
                            variant="tertiary"
                            onClick={(event) => {
                              event.stopPropagation();
                              disconnectNode(node.id);
                            }}
                          >
                            Unlink
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <NodeConfigurationPanel
              node={selectedNode}
              options={options}
              onUpdate={(updater) => {
                if (selectedNodeId) updateNode(selectedNodeId, updater);
              }}
              onRemove={() => {
                if (selectedNodeId) removeNode(selectedNodeId);
              }}
            />

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Run published workflow
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Runs the currently published version. Unpublished draft changes are not executed.
              </p>
              <div className="mt-3 space-y-3">
                <Input
                  label="Ticket ID"
                  value={testTicketId}
                  onChange={(event) => setTestTicketId(event.target.value)}
                  placeholder="Paste a tenant ticket ID"
                  fullWidth
                />
                <Button
                  size="sm"
                  onClick={handleRun}
                  isLoading={running}
                  disabled={!workflowId || !publishedVersion || !testTicketId.trim()}
                >
                  Run published version
                </Button>
                {lastExecution && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      Execution {lastExecution.status}
                    </p>
                    <Link
                      href={`/admin/executions/${lastExecution.id}`}
                      className="mt-1 inline-block text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300"
                    >
                      View execution details
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {versions.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Version history
                </h3>
                <div className="mt-3 space-y-2">
                  {versions.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          Version {item.version}
                        </span>
                        <span className="capitalize text-slate-500">{item.status}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.status === "published"
                          ? formatVersionDate(item.publishedAt)
                          : "Draft version"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive workflow"
        variant="destructive"
        confirmLabel="Archive"
        isLoading={archiving}
        onConfirm={archiveWorkflow}
        onCancel={() => setArchiveOpen(false)}
      >
        Archiving stops this workflow from running. Its versions and execution history are retained.
      </ConfirmDialog>
    </div>
  );
}

function NodeConfigurationPanel({
  node,
  options,
  onUpdate,
  onRemove,
}: {
  node: WorkflowNode | null;
  options: WorkflowEditorOptions;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
  onRemove: () => void;
}) {
  if (!node) {
    return (
      <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
        Select a node to configure it.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {node.type} settings
        </p>
        <Input
          label="Label"
          value={node.data.label}
          onChange={(event) =>
            onUpdate((current) => ({
              ...current,
              data: { ...current.data, label: event.target.value },
            }) as WorkflowNode)
          }
          maxLength={100}
          fullWidth
          className="mt-3"
        />
      </div>

      {node.type === "trigger" && (
        <TriggerConfiguration node={node} onUpdate={onUpdate} />
      )}
      {node.type === "condition" && (
        <ConditionConfiguration node={node} onUpdate={onUpdate} />
      )}
      {node.type === "action" && (
        <ActionConfiguration node={node} options={options} onUpdate={onUpdate} />
      )}

      <Button
        variant="tertiary"
        size="sm"
        onClick={onRemove}
        className="text-red-600 dark:text-red-400"
      >
        Remove node
      </Button>
    </div>
  );
}

function TriggerConfiguration({
  node,
  onUpdate,
}: {
  node: WorkflowTriggerNode;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
}) {
  return (
    <Select
      label="Trigger"
      value={node.data.triggerType}
      onChange={(event) =>
        onUpdate((current) => {
          const typed = current as WorkflowTriggerNode;
          const triggerType = event.target.value as WorkflowTriggerNode["data"]["triggerType"];
          const registry = workflowTriggerRegistry.find((item) => item.type === triggerType);
          return {
            ...typed,
            data: {
              ...typed.data,
              triggerType,
              label: registry?.label ?? typed.data.label,
            },
          };
        })
      }
      options={workflowTriggerRegistry.map((item) => ({
        value: item.type,
        label: item.label,
      }))}
      fullWidth
    />
  );
}

function ConditionConfiguration({
  node,
  onUpdate,
}: {
  node: WorkflowConditionNode;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
}) {
  const valueOptions =
    node.data.field === "status"
      ? supportedTicketStatuses
      : node.data.field === "priority"
        ? supportedTicketPriorities
        : null;

  return (
    <>
      <Select
        label="Ticket field"
        value={node.data.field}
        onChange={(event) =>
          onUpdate((current) => {
            const typed = current as WorkflowConditionNode;
            const field = event.target.value as WorkflowConditionNode["data"]["field"];
            return {
              ...typed,
              data: {
                ...typed.data,
                field,
                value: field === "status" ? "open" : field === "priority" ? "normal" : "",
              },
            };
          })
        }
        options={workflowConditionFieldRegistry.map((item) => ({
          value: item.type,
          label: item.label,
        }))}
        fullWidth
      />
      <Select
        label="Operator"
        value={node.data.operator}
        onChange={(event) =>
          onUpdate((current) => {
            const typed = current as WorkflowConditionNode;
            return {
              ...typed,
              data: {
                ...typed.data,
                operator: event.target.value as WorkflowConditionNode["data"]["operator"],
              },
            };
          })
        }
        options={workflowConditionOperatorRegistry.map((item) => ({
          value: item.type,
          label: item.label,
        }))}
        fullWidth
      />
      {valueOptions ? (
        <Select
          label="Value"
          value={node.data.value}
          onChange={(event) =>
            onUpdate((current) => {
              const typed = current as WorkflowConditionNode;
              return { ...typed, data: { ...typed.data, value: event.target.value } };
            })
          }
          options={[...valueOptions].map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
          fullWidth
        />
      ) : (
        <Input
          label="Value"
          value={node.data.value}
          onChange={(event) =>
            onUpdate((current) => {
              const typed = current as WorkflowConditionNode;
              return { ...typed, data: { ...typed.data, value: event.target.value } };
            })
          }
          maxLength={500}
          fullWidth
        />
      )}
    </>
  );
}

function ActionConfiguration({
  node,
  options,
  onUpdate,
}: {
  node: WorkflowActionNode;
  options: WorkflowEditorOptions;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
}) {
  function updateActionType(actionType: WorkflowActionNode["data"]["actionType"]) {
    onUpdate((current) => {
      const typed = current as WorkflowActionNode;
      const registry = workflowActionRegistry.find((item) => item.type === actionType);
      return {
        ...typed,
        data: {
          ...typed.data,
          label: registry?.label ?? typed.data.label,
          actionType,
          value: defaultActionValue(actionType, options),
        },
      };
    });
  }

  function updateValue(value: string) {
    onUpdate((current) => {
      const typed = current as WorkflowActionNode;
      return { ...typed, data: { ...typed.data, value } };
    });
  }

  return (
    <>
      <Select
        label="Action"
        value={node.data.actionType}
        onChange={(event) =>
          updateActionType(event.target.value as WorkflowActionNode["data"]["actionType"])
        }
        options={workflowActionRegistry.map((item) => ({
          value: item.type,
          label: item.label,
        }))}
        fullWidth
      />

      {node.data.actionType === "change-status" && (
        <Select
          label="Status"
          value={node.data.value}
          onChange={(event) => updateValue(event.target.value)}
          options={[...supportedTicketStatuses].map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
          fullWidth
        />
      )}
      {node.data.actionType === "change-priority" && (
        <Select
          label="Priority"
          value={node.data.value}
          onChange={(event) => updateValue(event.target.value)}
          options={[...supportedTicketPriorities].map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
          fullWidth
        />
      )}
      {node.data.actionType === "assign-ticket" && (
        <Select
          label="Assignee"
          value={node.data.value}
          onChange={(event) => updateValue(event.target.value)}
          options={options.users.map((user) => ({
            value: user.email,
            label: `${user.name} (${user.role})`,
          }))}
          fullWidth
        />
      )}
      {node.data.actionType === "add-tag" && (
        <Select
          label="Tag"
          value={node.data.value}
          onChange={(event) => updateValue(event.target.value)}
          options={options.tags.map((tag) => ({
            value: tag.id,
            label: tag.name,
          }))}
          fullWidth
        />
      )}
      {node.data.actionType === "generate-draft" && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Uses the configured AI provider to prepare a reviewable ticket draft. It never sends automatically.
        </p>
      )}
    </>
  );
}
