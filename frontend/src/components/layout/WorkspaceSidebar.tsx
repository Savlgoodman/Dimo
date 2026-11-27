import { useEffect, useRef } from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
} from 'dockview-react';
import { useTranslation } from 'react-i18next';
import {
  WorkspaceDockviewTab,
  panelComponents,
} from '@/components/layout/panels/PanelRegistry';
import { WorkspaceActivityRail } from '@/components/layout/WorkspaceActivityRail';
import { setDockviewGroupRole } from '@/utils/dockviewGroupRole';
import { installDockviewPointerTabDnd } from '@/utils/dockviewPointerTabDnd';
import type { WorkspaceSidebarSide } from '@/lib/workspaceSidebarState';
import type { SerializedDockview } from 'dockview-core';
import '@/styles/dockview-ayu.css';

interface WorkspaceSidebarProps {
  side: WorkspaceSidebarSide;
  width: number;
  visible: boolean;
  mode: 'workspace' | 'kanban';
  isEditorAreaVisible: boolean;
  initialLayout: SerializedDockview | null;
  onToggleEditorArea: () => void;
  onReady: (api: DockviewApi) => void;
  onDispose: () => void;
  onLayoutChange: (layout: SerializedDockview) => void;
}

export function WorkspaceSidebar({
  side,
  width,
  visible,
  mode,
  isEditorAreaVisible,
  initialLayout,
  onToggleEditorArea,
  onReady,
  onDispose,
  onLayoutChange,
}: WorkspaceSidebarProps) {
  const { t } = useTranslation('panels');
  const layoutDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const dockviewRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = dockviewRootRef.current;
    if (!root) return;
    const disposable = installDockviewPointerTabDnd(root);
    const preventGroupDrag = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.dv-void-container')
      ) {
        event.preventDefault();
      }
    };
    root.addEventListener('pointerdown', preventGroupDrag, true);
    return () => {
      disposable.dispose();
      root.removeEventListener('pointerdown', preventGroupDrag, true);
    };
  }, []);

  useEffect(
    () => () => {
      layoutDisposableRef.current?.dispose();
      layoutDisposableRef.current = null;
      onDispose();
    },
    [onDispose]
  );

  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api;
    if (initialLayout) {
      try {
        api.fromJSON(initialLayout);
      } catch {
        // Fall back to the default file-tree panel.
      }
    }
    if (api.panels.length === 0) {
      const group = api.addGroup({
        id: 'group-sidebar',
        direction: 'right',
        hideHeader: true,
      });
      setDockviewGroupRole(group, 'left');
      api.addPanel({
        id: 'file-tree',
        component: 'file-tree',
        title: t('panelRegistry.fileTree', { defaultValue: 'Files' }),
        renderer: 'onlyWhenVisible',
        position: { referenceGroup: group.id, direction: 'within' },
      });
    }
    layoutDisposableRef.current = api.onDidLayoutChange(() => {
      onLayoutChange(api.toJSON());
    });
    onReady(api);
    onLayoutChange(api.toJSON());
  };

  return (
    <aside
      data-testid="workspace-sidebar"
      data-workspace-sidebar-side={side}
      className={`workspace-sidebar ${visible ? '' : 'is-hidden'}`}
      style={{ width: visible ? width : 0 }}
      aria-hidden={!visible}
    >
      <div
        className={`workspace-sidebar-body ${
          side === 'right' ? 'workspace-sidebar-body-right' : ''
        }`}
      >
        <WorkspaceActivityRail
          mode={mode}
          isEditorAreaVisible={isEditorAreaVisible}
          onToggleEditorArea={onToggleEditorArea}
        />
        <div
          ref={dockviewRootRef}
          className="workspace-sidebar-dockview min-h-0 min-w-0 flex-1"
        >
          <DockviewReact
            components={panelComponents}
            defaultTabComponent={WorkspaceDockviewTab}
            onReady={handleReady}
            className="dockview-theme-light dockview-theme-ayu"
            disableFloatingGroups={true}
            dndEdges={{
              activationSize: { type: 'percentage', value: 20 },
              size: { type: 'percentage', value: 20 },
            }}
          />
        </div>
      </div>
    </aside>
  );
}

interface WorkspaceSidebarSashProps {
  side: WorkspaceSidebarSide;
  width: number;
  visible: boolean;
  onWidthChange: (width: number) => void;
}

export function WorkspaceSidebarSash({
  side,
  width,
  visible,
  onWidthChange,
}: WorkspaceSidebarSashProps) {
  const startRef = useRef<{ x: number; width: number } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    []
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!visible) return;
    event.preventDefault();
    startRef.current = { x: event.clientX, width };
    cleanupRef.current?.();

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta =
        side === 'left'
          ? moveEvent.clientX - start.x
          : start.x - moveEvent.clientX;
      onWidthChange(start.width + delta);
    };
    const stopDragging = () => {
      startRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    window.addEventListener('pointermove', handleWindowPointerMove, true);
    window.addEventListener('pointerup', stopDragging, true);
    window.addEventListener('pointercancel', stopDragging, true);
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove, true);
      window.removeEventListener('pointerup', stopDragging, true);
      window.removeEventListener('pointercancel', stopDragging, true);
    };
  };

  return (
    <div
      className={`workspace-sidebar-sash workspace-sidebar-sash-${side}`}
      data-testid="workspace-sidebar-sash"
      data-workspace-sidebar-visible={visible ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      style={{ cursor: visible ? 'ew-resize' : 'default' }}
    />
  );
}
