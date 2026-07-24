"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type {
  WorkflowActionNode,
  WorkflowConditionNode,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowTriggerNode,
} from "@/features/workflows/types/workflow-definition";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 720;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 126;

type WorkflowSummary = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  currentVersion: number;
  currentVersionStatus: string;
  updatedAt: string;
};

type WorkflowDetail = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  currentVersion: number;
  version: {
    id: string;
    version: number;
    status: string;
    definition: WorkflowDefinition;
  };
};

type EditorOptions = {
  users: Array<{ id: string; name: string; email: string; role: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
};

type ApiResponse<T> = {
  data?: T;
  message?: string;
  issues?: string[];
};

type DragState = {
  nodeId: string;
  pointerX: number;
  pointerY: number;
  nodeX: number;
  nodeY: number;
};

const statuses = ["open", "pending", "resolved", "closed"];
const priorities = ["low", "normal", "high", "urgent"];

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function newWorkflowDefinition(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: makeId("trigger"),
        type: "trigger",
        position: { x: 56, y: 80 },
        data: { label: "Start", triggerType: "manual" },
      },
    ],
    edges: [],
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || !payload.data) {
    const issueText = payload.issues?.length
      ? ` ${payload.issues.join(" ")}`
      : "";
    throw new Error(`${payload.message || "Request failed"}${issueText}`);
  }

  return payload.data;
}

async function fetchWorkflowList() {
  return fetchJson<WorkflowSummary[]>("/api/workflow-definitions");
}

async function fetchEditorOptions() {
  return fetchJson<EditorOptions>("/api/workflow-definitions/options");
}

function defaultActionValue(
  actionType: WorkflowActionNode["data"]["actionType"],
  options: EditorOptions,
) {
  if (actionType === "change-status") return "pending";
  if (actionType === "change-priority") return "normal";
  if (actionType === "assign-ticket") return options.users[0]?.email ?? "";
  if (actionType === "add-tag") return options.tags[0]?.id ?? "";
  return "";
}

function nodeTone(type: WorkflowNode["type"]) {
  if (type === "trigger") return "border-emerald-200 dark:border-emerald-900";
  if (type === "condition") return "border-amber-200 dark:border-amber-900";
  return "border-sky-200 dark:border-sky-900";
}

export function VersionedWorkflowBuilder() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [options, setOptions] = useState<EditorOptions>({ users: [], tags: [] });
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled workflow");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<WorkflowDefinition>(() => ({
    nodes: [],
    edges: [],
  }));
  const [version, setVersion] = useState(0);
  const [versionStatus, setVersionStatus] = useState("draft");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const selectedNode = useMemo(
    () => definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [definition.nodes, selectedNodeId],
  );

  useEffect(() => {
    Promise.all([fetchWorkflowList(), fetchEditorOptions()])
      .then(async ([nextWorkflows, nextOptions]) => {
        setWorkflows(nextWorkflows);
        setOptions(nextOptions);

        const first = nextWorkflows.find((item) => item.status !== "archived");
        if (first) {
          const detail = await fetchJson<WorkflowDetail>(
            `/api/workflow-definitions/${encodeURIComponent(first.id)}`,
          );
          loadDetail(detail);
        } else {
          resetNewWorkflow();
        }
      })
      .catch((error) => {
        toast(
          error instanceof Error ? error.message : "Failed to load workflows",
          "error",
        );
        resetNewWorkflow();
      })
      .finally(() => setLoading(false));
    // Initial product data load only. The toast function is stable in the app provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadDetail(detail: WorkflowDetail) {
    setWorkflowId(detail.id);
    setName(detail.name);
    setDescription(detail.description ?? "");
    setDefinition(detail.version.definition);
    setVersion(detail.version.version);
    setVersionStatus(detail.version.status);
    setSelectedNodeId(detail.version.definition.nodes[0]?.id ?? null);
    setConnectSourceId(null);
    setDirty(false);
  }

  function resetNewWorkflow() {
    const nextDefinition = newWorkflowDefinition();
    setWorkflowId(null);
    setName("Untitled workflow");
    setDescription("");
    setDefinition(nextDefinition);
    setVersion(0);
    setVersionStatus("draft");
    setSelectedNodeId(nextDefinition.nodes[0]?.id ?? null);
    setConnectSourceId(null);
    setDirty(false);
  }

  function markDirty() {
    setDirty(true);
  }

  function updateDefinition(updater: (current: WorkflowDefinition) => WorkflowDefinition) {
    setDefinition((current) => updater(current));
    markDirty();
  }

  function updateNode(nodeId: string, updater: (node: WorkflowNode) => WorkflowNode) {
    updateDefinition((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? updater(node) : node,
      ),
    }));
  }

  function addNode(type: WorkflowNode["type"]) {
    if (type === "trigger" && definition.nodes.some((node) => node.type === "trigger")) {
      toast("A workflow can have only one trigger", "error");
      return;
    }

    const offset = definition.nodes.length * 28;
    let node: WorkflowNode;

    if (type === "trigger") {
      node = {
        id: makeId("trigger"),
        type: "trigger",
        position: { x: 56 + offset, y: 80 + offset },
        data: { label: "Start", triggerType: "manual" },
      };
    } else if (type === "condition") {
      node = {
        id: makeId("condition"),
        type: "condition",
        position: { x: 340 + offset, y: 180 + offset },
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
        position: { x: 650 + offset, y: 180 + offset },
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
    if (connectSourceId === nodeId) setConnectSourceId(null);
  }

  function disconnectNode(nodeId: string) {
    updateDefinition((current) => ({
      ...current,
      edges: current.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    }));
  }

  function handleConnect(nodeId: string) {
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      toast("Choose the destination node", "success");
      return;
    }

    if (connectSourceId === nodeId) {
      setConnectSourceId(null);
      return;
    }

    const exists = definition.edges.some(
      (edge) => edge.source === connectSourceId && edge.target === nodeId,
    );
    if (exists) {
      setConnectSourceId(null);
      toast("Those nodes are already connected", "error");
      return;
    }

    updateDefinition((current) => ({
      ...current,
      edges: [
        ...current.edges,
        {
          id: makeId("edge"),
          source: connectSourceId,
          target: nodeId,
        },
      ],
    }));
    setConnectSourceId(null);
  }

  function handleDragStart(
    event: React.PointerEvent<HTMLDivElement>,
    node: WorkflowNode,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      nodeId: node.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      nodeX: node.position.x,
      nodeY: node.position.y,
    });
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
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
    setDirty(true);
  }

  function handleDragEnd() {
    setDragState(null);
  }

  async function refreshList() {
    setWorkflows(await fetchWorkflowList());
  }

  async function selectWorkflow(id: string) {
    if (dirty) {
      toast("Save or discard your current changes before switching", "error");
      return;
    }

    try {
      const detail = await fetchJson<WorkflowDetail>(
        `/api/workflow-definitions/${encodeURIComponent(id)}`,
      );
      loadDetail(detail);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to load workflow",
        "error",
      );
    }
  }

  async function saveWorkflow() {
    setSaving(true);
    try {
      const payload = JSON.stringify({ name, description, definition });
      const detail = workflowId
        ? await fetchJson<WorkflowDetail>(
            `/api/workflow-definitions/${encodeURIComponent(workflowId)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: payload,
            },
          )
        : await fetchJson<WorkflowDetail>("/api/workflow-definitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });

      loadDetail(detail);
      await refreshList();
      toast("Workflow draft saved", "success");
      return detail;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save workflow",
        "error",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishWorkflow() {
    setPublishing(true);
    try {
      const saved = dirty || !workflowId ? await saveWorkflow() : null;
      const id = saved?.id ?? workflowId;
      if (!id) return;

      const detail = await fetchJson<WorkflowDetail>(
        `/api/workflow-definitions/${encodeURIComponent(id)}/publish`,
        { method: "POST" },
      );
      loadDetail(detail);
      await refreshList();
      toast(`Workflow version ${detail.version.version} published`, "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to publish workflow",
        "error",
      );
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
      const detail = await fetchJson<WorkflowDetail>(
        `/api/workflow-definitions/${encodeURIComponent(workflowId)}`,
      );
      loadDetail(detail);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to reload workflow",
        "error",
      );
    }
  }

  async function archiveWorkflow() {
    if (!workflowId) return;
    setArchiving(true);
    try {
      const response = await fetch(
        `/api/workflow-definitions/${encodeURIComponent(workflowId)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json().catch(() => ({}))) as ApiResponse<never>;
        throw new Error(payload.message || "Failed to archive workflow");
      }

      await refreshList();
      resetNewWorkflow();
      toast("Workflow archived", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to archive workflow",
        "error",
      );
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
    }
  }

  function beginNewWorkflow() {
    if (dirty) {
      toast("Save or discard your current changes before creating another workflow", "error");
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
            {workflows.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                No saved workflows yet.
              </p>
            ) : (
              workflows.map((workflow) => (
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
                    v{workflow.currentVersion} · {workflow.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {workflowId ? `Version ${version}` : "New draft"}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {versionStatus === "published"
                  ? "Published versions are immutable. Your next edit will create a new draft version."
                  : "Draft changes are not active until published."}
              </p>
              {dirty && (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Unsaved changes
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={saveWorkflow} isLoading={saving}>
              Save Draft
            </Button>
            <Button
              variant="secondary"
              onClick={publishWorkflow}
              isLoading={publishing}
            >
              Publish
            </Button>
            {dirty && (
              <Button variant="tertiary" onClick={discardChanges}>
                Discard Changes
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

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addNode("condition")}
              >
                Condition
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addNode("action")}
              >
                Action
              </Button>
              {connectSourceId && (
                <Button
                  size="sm"
                  variant="tertiary"
                  onClick={() => setConnectSourceId(null)}
                >
                  Cancel Connection
                </Button>
              )}
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-950">
              <div
                className="relative"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              >
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="workflow-arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {definition.edges.map((edge) => {
                    const source = definition.nodes.find(
                      (node) => node.id === edge.source,
                    );
                    const target = definition.nodes.find(
                      (node) => node.id === edge.target,
                    );
                    if (!source || !target) return null;

                    return (
                      <line
                        key={edge.id}
                        x1={source.position.x + NODE_WIDTH}
                        y1={source.position.y + NODE_HEIGHT / 2}
                        x2={target.position.x}
                        y2={target.position.y + NODE_HEIGHT / 2}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-slate-300 dark:text-slate-600"
                        markerEnd="url(#workflow-arrow)"
                      />
                    );
                  })}
                </svg>

                {definition.nodes.map((node) => {
                  const connected = definition.edges.some(
                    (edge) => edge.source === node.id || edge.target === node.id,
                  );
                  const isConnectSource = connectSourceId === node.id;

                  return (
                    <div
                      key={node.id}
                      className={`absolute overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow dark:bg-slate-900 ${nodeTone(
                        node.type,
                      )} ${
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
                      <div className="flex items-center gap-1 px-2 py-2">
                        <Button
                          size="sm"
                          variant={isConnectSource ? "primary" : "tertiary"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleConnect(node.id);
                          }}
                        >
                          {isConnectSource ? "Source" : "Connect"}
                        </Button>
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

          <NodeConfigurationPanel
            node={selectedNode}
            options={options}
            onUpdate={(updater) => {
              if (!selectedNodeId) return;
              updateNode(selectedNodeId, updater);
            }}
            onRemove={() => {
              if (selectedNodeId) removeNode(selectedNodeId);
            }}
          />
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
        Archive <strong>{name}</strong>? Published history is retained, but the
        workflow will no longer be active.
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
  options: EditorOptions;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
  onRemove: () => void;
}) {
  if (!node) {
    return (
      <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Node settings
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Select a node on the canvas to configure it.
        </p>
      </aside>
    );
  }

  function updateLabel(label: string) {
    onUpdate((current) => ({
      ...current,
      data: { ...current.data, label },
    }) as WorkflowNode);
  }

  return (
    <aside className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {node.type}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Node settings
        </h3>
      </div>

      <Input
        label="Label"
        value={node.data.label}
        onChange={(event) => updateLabel(event.target.value)}
        maxLength={100}
        fullWidth
      />

      {node.type === "trigger" && (
        <TriggerConfiguration node={node} onUpdate={onUpdate} />
      )}
      {node.type === "condition" && (
        <ConditionConfiguration node={node} onUpdate={onUpdate} />
      )}
      {node.type === "action" && (
        <ActionConfiguration
          node={node}
          options={options}
          onUpdate={onUpdate}
        />
      )}

      <Button
        variant="tertiary"
        onClick={onRemove}
        className="text-red-600 dark:text-red-400"
        fullWidth
      >
        Remove Node
      </Button>
    </aside>
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
        onUpdate((current) => ({
          ...(current as WorkflowTriggerNode),
          data: {
            ...(current as WorkflowTriggerNode).data,
            triggerType: event.target.value as WorkflowTriggerNode["data"]["triggerType"],
          },
        }))
      }
      options={[
        { value: "manual", label: "Manual run" },
        { value: "ticket-created", label: "Ticket created" },
        { value: "ticket-updated", label: "Ticket updated" },
        { value: "message-received", label: "Customer message received" },
      ]}
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
      ? statuses
      : node.data.field === "priority"
        ? priorities
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
                value:
                  field === "status"
                    ? "open"
                    : field === "priority"
                      ? "normal"
                      : "",
              },
            };
          })
        }
        options={[
          { value: "subject", label: "Subject" },
          { value: "priority", label: "Priority" },
          { value: "status", label: "Status" },
        ]}
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
        options={[
          { value: "equals", label: "Equals" },
          { value: "not-equals", label: "Does not equal" },
          { value: "contains", label: "Contains" },
        ]}
        fullWidth
      />
      {valueOptions ? (
        <Select
          label="Value"
          value={node.data.value}
          onChange={(event) =>
            onUpdate((current) => {
              const typed = current as WorkflowConditionNode;
              return {
                ...typed,
                data: { ...typed.data, value: event.target.value },
              };
            })
          }
          options={valueOptions.map((value) => ({
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
              return {
                ...typed,
                data: { ...typed.data, value: event.target.value },
              };
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
  options: EditorOptions;
  onUpdate: (updater: (node: WorkflowNode) => WorkflowNode) => void;
}) {
  function updateActionType(actionType: WorkflowActionNode["data"]["actionType"]) {
    onUpdate((current) => {
      const typed = current as WorkflowActionNode;
      const labels: Record<WorkflowActionNode["data"]["actionType"], string> = {
        "change-status": "Change status",
        "change-priority": "Change priority",
        "assign-ticket": "Assign ticket",
        "add-tag": "Add tag",
        "generate-draft": "Generate AI draft",
      };

      return {
        ...typed,
        data: {
          ...typed.data,
          label: labels[actionType],
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
          updateActionType(
            event.target.value as WorkflowActionNode["data"]["actionType"],
          )
        }
        options={[
          { value: "change-status", label: "Change status" },
          { value: "change-priority", label: "Change priority" },
          { value: "assign-ticket", label: "Assign ticket" },
          { value: "add-tag", label: "Add tag" },
          { value: "generate-draft", label: "Generate AI draft" },
        ]}
        fullWidth
      />

      {node.data.actionType === "change-status" && (
        <Select
          label="Status"
          value={node.data.value}
          onChange={(event) => updateValue(event.target.value)}
          options={statuses.map((value) => ({
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
          options={priorities.map((value) => ({
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
          placeholder={options.users.length === 0 ? "No active members" : undefined}
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
          placeholder={options.tags.length === 0 ? "No tags available" : undefined}
          fullWidth
        />
      )}
      {node.data.actionType === "generate-draft" && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Uses the configured AI provider and the ticket conversation to prepare a
          reviewable draft. It does not send automatically.
        </p>
      )}
    </>
  );
}
