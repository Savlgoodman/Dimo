import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  DockviewIDisposable,
  DockviewWillShowOverlayLocationEvent,
  SerializedDockview,
} from 'dockview-core';
import type { DockviewApi } from 'dockview-react';
import {
  findCanvasBoundarySash,
  type CanvasStageInsets,
} from '@/components/layout/canvasStageInsets';
import {
  closeEmptyTabBarGroups,
  defaultSessionWidth,
  scheduleCloseEmptyTabBarGroups,
  dismissEditorColumnAfterLastTab,
  getEditorGroups,
  getLeftGroup,
  getRightGroup,
  IDE_LAYOUT_SIZING,
  normalizeGroupIds,
  recreateWelcomeEditorGroup,
  zoneOrderMatchesArrangement,
  type DockviewGroup,
} from '@/components/layout/ideLayoutGroupNormalization';
import {
  getLayoutArrangement,
  slotOfZone,
  type LayoutArrangement,
} from '@/lib/layoutArrangement';
import {
  EDITOR_GROUP_PREFIX,
  GROUP_IDS,
  MIN_RIGHT_PANEL_WIDTH,
  PANEL_IDS,
  useLayoutStore,
} from '@/stores/useLayoutStore';
import {
  captureZoneColumnWidths,
  installEditorColumnWidthRebalance,
  restoreFlexibleEditorColumn,
  setColumnVisible,
  setSessionDockVisible,
  shouldPersistSessionColumnWidth,
} from '@/utils/dockviewEditorGroup';
import {
  BOTTOM_PANEL_IDS,
  getNextEditorGroupId,
  getNextRightGroupId,
  isBottomGroup,
  isEditorGroup,
  isLeftGroup,
  isSessionGroup,
  isSessionPanelId,
  LEFT_GROUP_PREFIX,
  LEFT_PANEL_IDS,
  listLeftDockGroups,
  listSessionGroups,
  RIGHT_GROUP_PREFIX,
} from '@/utils/dockviewGroupPolicy';
import {
  assignDockviewGroupIdAndRole,
  setDockviewGroupRole,
} from '@/utils/dockviewGroupRole';
import { installDockviewSashResizeGuard } from '@/utils/dockviewSashResizeState';
import { installDockviewPointerTabDnd } from '@/utils/dockviewPointerTabDnd';
import { isDockviewApiDisposed } from '@/utils/dockviewSessionPanel';
import {
  layoutDockviewPreservingGroupWidths,
  settleDockviewGroupWidths,
} from '@/utils/dockviewStartupSizing';
import { applyWorkspaceZoneConstraints } from '@/utils/dockviewWorkspaceConstraints';
import { shouldDismissEditorColumnAfterPanelRemoval } from '@/utils/lastPreviewTabLayout';
import { closeRemovedDockviewBrowserPanel } from '@/features/host-browser/browserPanelLifetime';
import {
  isBoxAdjacentToWorkspaceEdge,
  isPointInBoxEdgeBand,
  isPointInWorkspaceEdgeTrapezoid,
  unionBoxes,
  type Box,
  type Point,
  type WorkspaceEdge,
} from '@/lib/leftPanelSplit';

export type DropTargetZone = 'editor' | 'session' | null;

const WORKSPACE_EDGE_FRACTION = 0.2;
const WORKSPACE_EDGE_ORDER: WorkspaceEdge[] = [
  'top',
  'bottom',
  'left',
  'right',
];

const WORKSPACE_GROUP_DROP_TARGET_MODEL = {
  activationSize: { type: 'percentage' as const, value: 30 },
  size: { type: 'percentage' as const, value: 20 },
};

type WorkspaceGroupDropTarget = {
  setOverlayModel: (model: typeof WORKSPACE_GROUP_DROP_TARGET_MODEL) => void;
};

function configureWorkspaceGroupDropTarget(group: DockviewGroup): void {
  if (!isEditorGroup(group) && !isSessionGroup(group)) return;

  // shortcut: Dockview exposes root dndEdges but not group content settings, revisit on upgrade.
  const model = group.model as unknown as {
    contentContainer?: { dropTarget?: WorkspaceGroupDropTarget };
  };
  model.contentContainer?.dropTarget?.setOverlayModel(
    WORKSPACE_GROUP_DROP_TARGET_MODEL
  );
}

function configureWorkspaceGroupDropTargets(api: DockviewApi): void {
  api.groups.forEach(configureWorkspaceGroupDropTarget);
}

function isPageBlockSplitPosition(
  position: DockviewWillShowOverlayLocationEvent['position']
): position is 'top' | 'bottom' | 'left' | 'right' {
  return (
    position === 'top' ||
    position === 'bottom' ||
    position === 'left' ||
    position === 'right'
  );
}

function canSplitWorkspacePageBlock(
  group: DockviewGroup,
  position: DockviewWillShowOverlayLocationEvent['position']
): boolean {
  if (!isPageBlockSplitPosition(position)) return true;
  if (!isEditorGroup(group) && !isSessionGroup(group)) return true;

  const isVerticalSplit = position === 'top' || position === 'bottom';
  const currentSize = isVerticalSplit ? group.api.height : group.api.width;
  const minimumSize = isVerticalSplit
    ? group.minimumHeight
    : group.minimumWidth;

  return minimumSize <= 0 || currentSize + 1 >= minimumSize * 2;
}

function boxFromElement(element: HTMLElement | undefined | null): Box | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function workspaceGroupBoxes(api: DockviewApi): Box[] {
  return api.groups
    .filter(
      (group) =>
        group.api.isVisible && (isEditorGroup(group) || isSessionGroup(group))
    )
    .map((group) => boxFromElement(group.element))
    .filter((box): box is Box => box !== null);
}

function workspaceBox(groups: readonly Box[]): Box | null {
  const root =
    typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLElement>('.tab-bar-drop-zone');
  return boxFromElement(root) ?? unionBoxes(groups);
}

function edgeDepthRatio(point: Point, box: Box, edge: WorkspaceEdge): number {
  const depth =
    edge === 'top'
      ? point.y - box.y
      : edge === 'bottom'
        ? box.y + box.height - point.y
        : edge === 'left'
          ? point.x - box.x
          : box.x + box.width - point.x;
  const size = edge === 'top' || edge === 'bottom' ? box.height : box.width;
  return Math.min(1, Math.max(0, depth / Math.max(size, 1)));
}

function workspaceEdgeMatches(
  point: Point,
  workspace: Box,
  groups: readonly Box[],
  edge: WorkspaceEdge
): boolean {
  const edgeGroups = groups.filter((group) =>
    isBoxAdjacentToWorkspaceEdge(group, workspace, edge)
  );
  if (edgeGroups.length === 0) {
    return isPointInBoxEdgeBand(
      point,
      workspace,
      edge,
      0,
      WORKSPACE_EDGE_FRACTION
    );
  }
  return edgeGroups.some((group) =>
    isPointInWorkspaceEdgeTrapezoid(
      point,
      workspace,
      group,
      edge,
      WORKSPACE_EDGE_FRACTION
    )
  );
}

function isWorkspaceEdgeDrop(
  api: DockviewApi,
  point: Point,
  edge: WorkspaceEdge
): boolean {
  const groups = workspaceGroupBoxes(api);
  const workspace = workspaceBox(groups);
  if (!workspace) return false;

  const matchingEdges = WORKSPACE_EDGE_ORDER.filter((candidate) =>
    workspaceEdgeMatches(point, workspace, groups, candidate)
  );
  if (matchingEdges.length === 0) return false;

  const preferredEdge = matchingEdges.reduce((best, candidate) => {
    const bestDepth = edgeDepthRatio(point, workspace, best);
    const candidateDepth = edgeDepthRatio(point, workspace, candidate);
    if (candidateDepth < bestDepth) return candidate;
    return candidateDepth === bestDepth &&
        WORKSPACE_EDGE_ORDER.indexOf(candidate) <
          WORKSPACE_EDGE_ORDER.indexOf(best)
      ? candidate
      : best;
  });
  return preferredEdge === edge;
}

export function registerDockviewOverlayDropGuard(
  api: DockviewApi,
  lastDropTargetZoneRef: { current: DropTargetZone }
): DockviewIDisposable {
  const clearDropTargetZone = () => {
    lastDropTargetZoneRef.current = null;
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      lastDropTargetZoneRef.current = null;
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('dragend', clearDropTargetZone, true);
    window.addEventListener('pointercancel', clearDropTargetZone, true);
    window.addEventListener('keydown', handleKeyDown, true);
  }

  const overlayDisposable = api.onWillShowOverlay((event) => {
    const ev: DockviewWillShowOverlayLocationEvent = event;
    const panelData = ev.getData?.();
    if (ev.kind === 'edge') {
      const nativeEvent = ev.nativeEvent;
      if (!nativeEvent) {
        const sourceGroup = panelData?.groupId
          ? api.getGroup(panelData.groupId)
          : undefined;
        lastDropTargetZoneRef.current =
          sourceGroup && isSessionGroup(sourceGroup) ? 'session' : 'editor';
        return;
      }
      const point: Point = {
        x: nativeEvent.clientX,
        y: nativeEvent.clientY,
      };
      const edge =
        ev.position === 'top' ||
        ev.position === 'bottom' ||
        ev.position === 'left' ||
        ev.position === 'right'
          ? ev.position
          : null;
      const isWorkspaceEdge =
        edge !== null && isWorkspaceEdgeDrop(api, point, edge);

      if (!ev.group) {
        if (!isWorkspaceEdge) {
          lastDropTargetZoneRef.current = null;
          event.preventDefault();
          return;
        }
        const sourceGroup = panelData?.groupId
          ? api.getGroup(panelData.groupId)
          : undefined;
        lastDropTargetZoneRef.current =
          sourceGroup && isSessionGroup(sourceGroup) ? 'session' : 'editor';
        return;
      }

      if (isWorkspaceEdge) {
        event.preventDefault();
        return;
      }

      const sourceGroup = panelData?.groupId
        ? api.getGroup(panelData.groupId)
        : undefined;
      lastDropTargetZoneRef.current =
        sourceGroup && isSessionGroup(sourceGroup) ? 'session' : 'editor';
      return;
    }

    const targetGroup = ev.group;
    const draggedPanelId = panelData?.panelId ?? ev.panel?.id;

    if (!targetGroup || !draggedPanelId) {
      return;
    }

    if (!canSplitWorkspacePageBlock(targetGroup, ev.position)) {
      event.preventDefault();
      return;
    }

    const sourceGroup = panelData?.groupId
      ? api.getGroup(panelData.groupId)
      : undefined;
    const isSourceLeftPanel = sourceGroup
      ? isLeftGroup(sourceGroup)
      : LEFT_PANEL_IDS.has(draggedPanelId);
    const isSourceBottomPanel = sourceGroup
      ? isBottomGroup(sourceGroup)
      : BOTTOM_PANEL_IDS.has(draggedPanelId);
    const isTargetLeftGroup = isLeftGroup(targetGroup);
    const isTargetBottomGroup = isBottomGroup(targetGroup);
    const isTargetEditorGroup = isEditorGroup(targetGroup);
    const isTargetSessionGroup = isSessionGroup(targetGroup);

    if (isSourceBottomPanel || isTargetBottomGroup) {
      event.preventDefault();
      return;
    }

    if (isTargetLeftGroup && !isSourceLeftPanel) {
      event.preventDefault();
      return;
    }

    if (isSourceLeftPanel && !isTargetLeftGroup) {
      event.preventDefault();
      return;
    }

    lastDropTargetZoneRef.current = isTargetSessionGroup
      ? 'session'
      : isTargetEditorGroup
        ? 'editor'
        : null;
  });

  return {
    dispose() {
      overlayDisposable.dispose();
      lastDropTargetZoneRef.current = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('dragend', clearDropTargetZone, true);
        window.removeEventListener('pointercancel', clearDropTargetZone, true);
        window.removeEventListener('keydown', handleKeyDown, true);
      }
    },
  };
}

export interface AttachDockviewWorkspaceListenersOptions {
  apiRef: { current: DockviewApi | null };
  dockviewRootEl: HTMLDivElement | null;
  isResettingRef: { current: boolean };
  isCollapsedRef: { current: boolean };
  lastDropTargetZoneRef: { current: DropTargetZone };
  layoutChangeTimerRef: { current: ReturnType<typeof setTimeout> | null };
  lastSelfHealAtRef: { current: number };
  registerDndGuard: (api: DockviewApi) => DockviewIDisposable;
  applyArrangement: (
    api: DockviewApi,
    nextArrangement: LayoutArrangement
  ) => void;
  setSerializedLayout: (layout: SerializedDockview | null) => void;
  setRightPanelWidth: (width: number) => void;
}

export function attachDockviewWorkspaceListeners(
  api: DockviewApi,
  options: AttachDockviewWorkspaceListenersOptions
): () => void {
  const {
    apiRef,
    dockviewRootEl,
    isResettingRef,
    isCollapsedRef,
    lastDropTargetZoneRef,
    layoutChangeTimerRef,
    lastSelfHealAtRef,
    registerDndGuard,
    applyArrangement,
    setSerializedLayout,
    setRightPanelWidth,
  } = options;

  let resizeFrame: number | null = null;
  const dockviewResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    const { width, height } = entry.contentRect;
    if (width <= 0 || height <= 0) return;

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (apiRef.current !== api || isDockviewApiDisposed(api)) return;

      const arrangement = getLayoutArrangement();
      const dockGroups =
        slotOfZone(arrangement, 'dock') !== 'center' &&
        slotOfZone(arrangement, 'dock') !== 'bottom'
          ? listLeftDockGroups(api.groups)
          : [];
      const sideGroups = [
        ...(dockGroups.length > 0
          ? dockGroups
          : slotOfZone(arrangement, 'dock') !== 'center' &&
              slotOfZone(arrangement, 'dock') !== 'bottom'
            ? [getLeftGroup(api)]
            : []),
        slotOfZone(arrangement, 'session') !== 'center' &&
        slotOfZone(arrangement, 'session') !== 'bottom'
          ? getRightGroup(api)
          : null,
      ].filter((group): group is DockviewGroup => Boolean(group));

      applyWorkspaceZoneConstraints(api, width);
      layoutDockviewPreservingGroupWidths(api, sideGroups, width, height);
    });
  });
  if (dockviewRootEl) {
    dockviewResizeObserver.observe(dockviewRootEl);
  }
  configureWorkspaceGroupDropTargets(api);

  const pointerTabDndDisposable = dockviewRootEl
    ? installDockviewPointerTabDnd(dockviewRootEl)
    : null;
  const preventGroupDrag = (event: PointerEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest('.dv-void-container')
    ) {
      event.preventDefault();
    }
  };
  dockviewRootEl?.addEventListener('pointerdown', preventGroupDrag, true);
  const disposeSashResizeGuard = dockviewRootEl
    ? installDockviewSashResizeGuard(dockviewRootEl)
    : null;
  const dndGuardDisposable = registerDndGuard(api);
  let isInternalAnchorSync = false;

  const removePanelDisposable = api.onDidRemovePanel((panel) => {
    if (isResettingRef.current) return;
    closeRemovedDockviewBrowserPanel(
      useLayoutStore.getState().currentProjectKey,
      panel.id
    );

    const sessionGroupsHavePanels = listSessionGroups(api.groups).some(
      (group) => group.panels.length > 0
    );
    if (
      !sessionGroupsHavePanels &&
      (isSessionPanelId(panel.id) ||
        useLayoutStore.getState().isRightPanelVisible)
    ) {
      const leftGroup = getLeftGroup(api);
      const dockWidthBefore = leftGroup?.api.isVisible
        ? leftGroup.api.width
        : undefined;
      useLayoutStore.getState().setRightPanelVisible(false);
      setSessionDockVisible(api, getLayoutArrangement(), false);
      const hasVisibleEditorPanels = getEditorGroups(api).some(
        (group) => group.api.isVisible && group.panels.length > 0
      );
      if (!hasVisibleEditorPanels) {
        const welcomeGroup = recreateWelcomeEditorGroup(api);
        if (welcomeGroup) {
          setColumnVisible(api, getLayoutArrangement(), welcomeGroup, true);
          restoreFlexibleEditorColumn(
            api,
            getLayoutArrangement(),
            useLayoutStore.getState().rightPanelWidth,
            dockWidthBefore
          );
          api.getPanel(PANEL_IDS.WELCOME)?.api.setActive();
        }
      }
      normalizeGroupIds(api);
      scheduleCloseEmptyTabBarGroups(api);
      return;
    }

    normalizeGroupIds(api);
    const editorGroups = getEditorGroups(api);
    const hasEditorPanels = editorGroups.some(
      (group) => group.panels.length > 0
    );
    const hasVisibleSessionPanels = listSessionGroups(api.groups).some(
      (group) => group.api.isVisible && group.panels.length > 0
    );

    if (
      shouldDismissEditorColumnAfterPanelRemoval(panel, editorGroups) ||
      (!hasEditorPanels && !LEFT_PANEL_IDS.has(panel.id))
    ) {
      if (hasVisibleSessionPanels) {
        dismissEditorColumnAfterLastTab(api);
      } else {
        const leftGroup = getLeftGroup(api);
        const dockWidthBefore = leftGroup?.api.isVisible
          ? leftGroup.api.width
          : undefined;
        const welcomeGroup = recreateWelcomeEditorGroup(api);
        if (welcomeGroup) {
          setColumnVisible(api, getLayoutArrangement(), welcomeGroup, true);
          restoreFlexibleEditorColumn(
            api,
            getLayoutArrangement(),
            useLayoutStore.getState().rightPanelWidth,
            dockWidthBefore
          );
          api.getPanel(PANEL_IDS.WELCOME)?.api.setActive();
        }
      }
    }
    scheduleCloseEmptyTabBarGroups(api);
  });

  const normalizeGroupsDisposable = api.onDidAddGroup((group) => {
    if (!isResettingRef.current) {
      const isUnassignedGroupId =
        group.id !== GROUP_IDS.LEFT &&
        !group.id.startsWith(LEFT_GROUP_PREFIX) &&
        !group.id.startsWith(EDITOR_GROUP_PREFIX) &&
        group.id !== GROUP_IDS.RIGHT &&
        !group.id.startsWith(RIGHT_GROUP_PREFIX) &&
        group.id !== GROUP_IDS.BOTTOM;
      if (lastDropTargetZoneRef.current === 'session' && isUnassignedGroupId) {
        assignDockviewGroupIdAndRole(
          api,
          group,
          getNextRightGroupId(api),
          'session'
        );
        group.element?.setAttribute('data-session-dock', 'true');
      } else if (
        lastDropTargetZoneRef.current === 'editor' &&
        isUnassignedGroupId
      ) {
        assignDockviewGroupIdAndRole(
          api,
          group,
          getNextEditorGroupId(api),
          'editor'
        );
        group.element?.removeAttribute('data-session-dock');
      }
      lastDropTargetZoneRef.current = null;
      normalizeGroupIds(api);
    }
    configureWorkspaceGroupDropTargets(api);
  });

  const movePanelDisposable = api.onDidMovePanel(({ panel, from }) => {
    if (isResettingRef.current) return;

    if (panel.group === from) {
      if (lastDropTargetZoneRef.current === 'editor' && isSessionGroup(from)) {
        from.element?.removeAttribute('data-session-dock');
        assignDockviewGroupIdAndRole(
          api,
          from,
          getNextEditorGroupId(api),
          'editor'
        );
      } else if (
        lastDropTargetZoneRef.current === 'session' &&
        isEditorGroup(from)
      ) {
        from.element?.setAttribute('data-session-dock', 'true');
        assignDockviewGroupIdAndRole(
          api,
          from,
          getNextRightGroupId(api),
          'session'
        );
      }
    }
    lastDropTargetZoneRef.current = null;

    if (getEditorGroups(api).length === 0 && !isCollapsedRef.current) {
      recreateWelcomeEditorGroup(api);
    }

    if (listSessionGroups(api.groups).length === 0) {
      if (useLayoutStore.getState().isRightPanelVisible) {
        useLayoutStore.getState().setRightPanelVisible(false);
      }
      const editorGroups = getEditorGroups(api);
      const referenceGroup =
        editorGroups[editorGroups.length - 1] ?? getLeftGroup(api);
      const referencePanel = referenceGroup?.panels[0];
      if (referencePanel) {
        const preVisibleTargets = captureZoneColumnWidths(api).map((col) => ({
          group: col.group,
          width: col.width,
        }));
        isInternalAnchorSync = true;
        try {
          const rightGroup = api.addGroup({
            id: GROUP_IDS.RIGHT,
            referencePanel,
            direction: 'right',
            constraints: { minimumWidth: MIN_RIGHT_PANEL_WIDTH },
            initialWidth:
              useLayoutStore.getState().rightPanelWidth ||
              defaultSessionWidth(api.width),
          });
          setDockviewGroupRole(rightGroup, 'session');
          rightGroup.element?.setAttribute('data-session-dock', 'true');
          rightGroup.api.setVisible(false);
          if (preVisibleTargets.length > 0) {
            settleDockviewGroupWidths(preVisibleTargets);
          }
        } finally {
          isInternalAnchorSync = false;
        }
      }
    }

    normalizeGroupIds(api);
    scheduleCloseEmptyTabBarGroups(api);
  });

  const removeGroupDisposable = api.onDidRemoveGroup(() => {
    if (!isResettingRef.current) {
      normalizeGroupIds(api);
    }
  });

  const columnWidthRebalance = installEditorColumnWidthRebalance(api, {
    shouldRebalance: () => !isResettingRef.current && !isInternalAnchorSync,
  });

  let layoutPersistIdleHandle: number | null = null;
  const cancelPendingIdlePersist = () => {
    if (
      layoutPersistIdleHandle !== null &&
      typeof cancelIdleCallback === 'function'
    ) {
      cancelIdleCallback(layoutPersistIdleHandle);
    }
    layoutPersistIdleHandle = null;
  };

  const layoutDisposable = api.onDidLayoutChange(() => {
    if (isResettingRef.current) return;

    if (layoutChangeTimerRef.current) {
      clearTimeout(layoutChangeTimerRef.current);
    }
    cancelPendingIdlePersist();

    layoutChangeTimerRef.current = setTimeout(() => {
      layoutChangeTimerRef.current = null;
      if (
        isResettingRef.current ||
        apiRef.current !== api ||
        isDockviewApiDisposed(api)
      ) {
        return;
      }

      normalizeGroupIds(api);
      closeEmptyTabBarGroups(api);

      // Self-heal: if some code path re-created a zone group in the
      // wrong column, snap the grid back to the configured arrangement.
      // Cooldown guards against churn if a mismatch were ever persistent.
      const currentArrangement = getLayoutArrangement();
      if (
        !zoneOrderMatchesArrangement(api, currentArrangement) &&
        Date.now() - lastSelfHealAtRef.current > 5000
      ) {
        lastSelfHealAtRef.current = Date.now();
        applyArrangement(api, currentArrangement);
        return;
      }

      const persistLayout = () => {
        layoutPersistIdleHandle = null;
        if (
          isResettingRef.current ||
          apiRef.current !== api ||
          isDockviewApiDisposed(api)
        ) {
          return;
        }

        try {
          setSerializedLayout(api.toJSON());
        } catch {
          // Ignore serialization failures during transient layout states.
        }

        // Keep the stored session width in sync so default rebuilds and
        // cross-slot moves reuse the user's last column width. Center and
        // bottom slots are skipped: there the group width is the flexible
        // remainder / plain column width, not a meaningful column memory.
        // A crushed editor column is also skipped: the session has absorbed
        // leftover space, and that expanded width is not user intent.
        try {
          const rightGroup = getRightGroup(api);
          const sessionSlot = slotOfZone(getLayoutArrangement(), 'session');
          if (
            rightGroup?.api.isVisible &&
            sessionSlot !== 'center' &&
            sessionSlot !== 'bottom' &&
            rightGroup.api.width > 0 &&
            shouldPersistSessionColumnWidth(api) &&
            rightGroup.api.width !== useLayoutStore.getState().rightPanelWidth
          ) {
            setRightPanelWidth(rightGroup.api.width);
          }
        } catch {
          // Ignore width sync failures during transient layout states.
        }
      };

      if (typeof requestIdleCallback === 'function') {
        layoutPersistIdleHandle = requestIdleCallback(persistLayout, {
          timeout: IDE_LAYOUT_SIZING.IDLE_PERSIST_TIMEOUT_MS,
        });
      } else {
        persistLayout();
      }
    }, IDE_LAYOUT_SIZING.LAYOUT_CHANGE_DEBOUNCE_MS);
  });

  return () => {
    dockviewResizeObserver.disconnect();
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }
    pointerTabDndDisposable?.dispose();
    dockviewRootEl?.removeEventListener('pointerdown', preventGroupDrag, true);
    disposeSashResizeGuard?.();
    dndGuardDisposable.dispose();
    removePanelDisposable.dispose();
    normalizeGroupsDisposable.dispose();
    movePanelDisposable.dispose();
    removeGroupDisposable.dispose();
    columnWidthRebalance.dispose();
    layoutDisposable.dispose();

    if (layoutChangeTimerRef.current) {
      clearTimeout(layoutChangeTimerRef.current);
      layoutChangeTimerRef.current = null;
    }
    cancelPendingIdlePersist();
  };
}

export interface TabBarDropPanelActions {
  openFilePreview: (
    target: string,
    options?: { title?: string; activate?: boolean; mode?: 'diff' }
  ) => void;
  openOrFocusPanel: (
    panelId: string,
    title: string,
    params?: Record<string, unknown>
  ) => void;
}

export function routeWorkspaceTabBarDrop(
  rawData: string,
  panelActions: TabBarDropPanelActions
): void {
  try {
    const payload = JSON.parse(rawData) as {
      id?: string;
      title?: string;
      component?: string;
      params?: {
        filePath?: string;
        commitSha?: string;
        [key: string]: unknown;
      };
    };

    if (payload.component === 'preview' && payload.params?.filePath) {
      panelActions.openFilePreview(payload.params.filePath, {
        title: payload.title,
        activate: true,
      });
    } else if (payload.component === 'preview' && payload.params?.commitSha) {
      panelActions.openFilePreview(payload.params.commitSha, {
        title: payload.title,
        activate: true,
        mode: 'diff',
      });
    } else if (payload.component && payload.id) {
      panelActions.openOrFocusPanel(
        payload.id,
        payload.title ?? payload.id,
        payload.params
      );
    }
  } catch (error) {
    console.warn('[TabBarDrop] Failed to parse drop payload:', error);
  }
}

export function forwardPointerDownToCanvasBoundarySash(
  host: HTMLDivElement | null,
  insets: CanvasStageInsets,
  side: 'left' | 'right',
  event: ReactPointerEvent<HTMLDivElement>
): void {
  if (!host || event.button !== 0) return;
  const bestSash = findCanvasBoundarySash(host, insets, side);
  if (!bestSash) return;
  event.preventDefault();
  event.stopPropagation();
  bestSash.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons || 1,
    })
  );
}
