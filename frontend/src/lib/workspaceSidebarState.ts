import type { SerializedDockview } from 'dockview-core';
import { LEFT_PANEL_IDS } from '@/utils/dockviewGroupPolicy';

export type WorkspaceSidebarSide = 'left' | 'right';

export interface WorkspaceSidebarState {
  side: WorkspaceSidebarSide;
  visible: boolean;
  leftWidth: number;
  rightWidth: number;
  layout: SerializedDockview | null;
}

type SerializedNode = {
  type: 'leaf' | 'branch';
  data: unknown;
  size?: number;
  visible?: boolean;
};

type SerializedLeaf = SerializedNode & {
  type: 'leaf';
  data: {
    id: string;
    views: string[];
    activeView?: string;
    [key: string]: unknown;
  };
};

type SerializedBranch = SerializedNode & {
  type: 'branch';
  data: SerializedNode[];
};

const STORAGE_PREFIX = 'dimo:workspace-sidebar:';
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 560;

export const DEFAULT_WORKSPACE_SIDEBAR_STATE: WorkspaceSidebarState = {
  side: 'left',
  visible: true,
  leftWidth: 240,
  rightWidth: 240,
  layout: null,
};

function isLeaf(node: SerializedNode): node is SerializedLeaf {
  return node.type === 'leaf';
}

function isBranch(node: SerializedNode): node is SerializedBranch {
  return node.type === 'branch';
}

function isSidebarPanelId(panelId: string): boolean {
  return LEFT_PANEL_IDS.has(panelId);
}

function copyNode(node: SerializedNode, views: string[]): SerializedLeaf {
  const leaf = node as SerializedLeaf;
  const activeView = isSidebarPanelId(leaf.data.activeView ?? '')
    ? leaf.data.activeView
    : views[0];
  return {
    ...leaf,
    data: {
      ...leaf.data,
      views,
      ...(activeView ? { activeView } : {}),
    },
  };
}

function filterNode(
  node: SerializedNode,
  includeSidebarPanels: boolean
): SerializedNode | null {
  if (isLeaf(node)) {
    const views = node.data.views.filter((panelId) =>
      includeSidebarPanels
        ? isSidebarPanelId(panelId)
        : !isSidebarPanelId(panelId)
    );
    return views.length > 0 ? copyNode(node, views) : null;
  }

  if (!isBranch(node)) return null;
  const children = node.data
    .map((child) => filterNode(child, includeSidebarPanels))
    .filter((child): child is SerializedNode => child !== null);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, data: children };
}

function filterLayout(
  layout: SerializedDockview | null,
  includeSidebarPanels: boolean
): SerializedDockview | null {
  if (!layout?.grid?.root) return null;
  const root = filterNode(
    layout.grid.root as unknown as SerializedNode,
    includeSidebarPanels
  );
  if (!root) return null;

  const panels = Object.fromEntries(
    Object.entries(layout.panels).filter(([panelId]) =>
      includeSidebarPanels
        ? isSidebarPanelId(panelId)
        : !isSidebarPanelId(panelId)
    )
  );
  const rootGroupIds = new Set<string>();
  const collectGroupIds = (node: SerializedNode) => {
    if (isLeaf(node)) {
      rootGroupIds.add(node.data.id);
      return;
    }
    if (isBranch(node)) node.data.forEach(collectGroupIds);
  };
  collectGroupIds(root);

  const activeGroup =
    layout.activeGroup && rootGroupIds.has(layout.activeGroup)
      ? layout.activeGroup
      : undefined;
  const { activeGroup: _ignoredActiveGroup, ...layoutWithoutActiveGroup } =
    layout;

  return {
    ...layoutWithoutActiveGroup,
    grid: {
      ...layout.grid,
      root: root as SerializedDockview['grid']['root'],
    },
    panels,
    ...(activeGroup ? { activeGroup } : {}),
  };
}

export function extractSidebarLayout(
  layout: SerializedDockview | null
): SerializedDockview | null {
  return filterLayout(layout, true);
}

export function removeSidebarPanels(
  layout: SerializedDockview | null
): SerializedDockview | null {
  return filterLayout(layout, false);
}

export function clampWorkspaceSidebarWidth(width: number): number {
  return Math.min(
    MAX_SIDEBAR_WIDTH,
    Math.max(MIN_SIDEBAR_WIDTH, Math.round(width))
  );
}

function clampWidth(width: unknown, fallback: number): number {
  return typeof width === 'number' && Number.isFinite(width)
    ? clampWorkspaceSidebarWidth(width)
    : fallback;
}

function storageKey(projectKey: string): string {
  return `${STORAGE_PREFIX}${projectKey}`;
}

export function readWorkspaceSidebarState(
  projectKey: string,
  fallbackVisible = DEFAULT_WORKSPACE_SIDEBAR_STATE.visible
): WorkspaceSidebarState {
  const fallback = {
    ...DEFAULT_WORKSPACE_SIDEBAR_STATE,
    visible: fallbackVisible,
  };
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSidebarState>;
    return {
      side: parsed.side === 'right' ? 'right' : 'left',
      visible: parsed.visible !== false,
      leftWidth: clampWidth(parsed.leftWidth, fallback.leftWidth),
      rightWidth: clampWidth(parsed.rightWidth, fallback.rightWidth),
      layout: parsed.layout ?? null,
    };
  } catch {
    return fallback;
  }
}

export function writeWorkspaceSidebarState(
  projectKey: string,
  state: WorkspaceSidebarState
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(projectKey), JSON.stringify(state));
  } catch {
    // Keep the live layout when browser storage is unavailable.
  }
}
