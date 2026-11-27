import { fireEvent, render, screen } from '@testing-library/react';
import { kanbanViewRegistry } from '@dimoai/plugin-sdk';
import { useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PANEL_IDS } from '@/stores/useLayoutStore';
import {
  getDefaultActivityRailPanelId,
  resetActivityRailOrder,
} from '@/lib/activityRailOrder';
import { ShellNavPanelDragHandle } from './ShellNavPanelDragHandle';
import { WorkspaceActivityRail } from './WorkspaceActivityRail';

const mocks = vi.hoisted(() => {
  let activeKanbanViewId = 'builtin:pulse';
  const listeners = new Set<() => void>();
  const setActiveKanbanViewIdSpy = vi.fn((nextId: string) => {
    activeKanbanViewId = nextId;
    for (const listener of listeners) {
      listener();
    }
  });
  return {
    toggleFileTree: vi.fn(),
    toggleGitPanel: vi.fn(),
    toggleSearchPanel: vi.fn(),
    toggleSessionList: vi.fn(),
    toggleBotsPanel: vi.fn(),
    toggleWorkspaceSidebarSide: vi.fn(),
    getWorkspaceSidebarSide: vi.fn(() => 'left'),
    placeLeftDockPanel: vi.fn(),
    swapLeftDockPanels: vi.fn(),
    resolveShellNavDropTarget: vi.fn(),
    measureShellNavPanels: vi.fn(),
    persistFrontendPreference: vi.fn(),
    setActiveKanbanViewId: setActiveKanbanViewIdSpy,
    getActiveKanbanViewId: () => activeKanbanViewId,
    resetActiveKanbanViewId: (nextId = 'builtin:pulse') => {
      activeKanbanViewId = nextId;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribeKanbanViewId: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
});

vi.mock('@/lib/frontendPreferences', () => ({
  persistFrontendPreference: mocks.persistFrontendPreference,
}));

vi.mock('@/contexts/KanbanSessionContext', () => ({
  useOptionalKanbanSessionContext: () => {
    const activeViewId = useSyncExternalStore(
      mocks.subscribeKanbanViewId,
      mocks.getActiveKanbanViewId
    );
    return {
      activeViewId,
      setActiveViewId: mocks.setActiveKanbanViewId,
    };
  },
}));

vi.mock('@/contexts/PanelActionsContext', () => ({
  usePanelActionsContext: () => ({
    toggleFileTree: mocks.toggleFileTree,
    toggleGitPanel: mocks.toggleGitPanel,
    toggleSearchPanel: mocks.toggleSearchPanel,
    toggleSessionList: mocks.toggleSessionList,
    toggleBotsPanel: mocks.toggleBotsPanel,
    toggleWorkspaceSidebarSide: mocks.toggleWorkspaceSidebarSide,
    getWorkspaceSidebarSide: mocks.getWorkspaceSidebarSide,
    placeLeftDockPanel: mocks.placeLeftDockPanel,
    swapLeftDockPanels: mocks.swapLeftDockPanels,
    resolveShellNavDropTarget: mocks.resolveShellNavDropTarget,
    measureShellNavPanels: mocks.measureShellNavPanels,
    measureLeftDock: () => null,
    isLeftDockSplit: () => false,
    unsplitLeftDock: vi.fn(),
    isPanelOpen: (panelId: string) => panelId === PANEL_IDS.FILE_TREE,
  }),
}));

describe('WorkspaceActivityRail', () => {
  beforeEach(() => {
    resetActivityRailOrder();
    mocks.toggleFileTree.mockReset();
    mocks.toggleGitPanel.mockReset();
    mocks.toggleSearchPanel.mockReset();
    mocks.toggleSessionList.mockReset();
    mocks.toggleBotsPanel.mockReset();
    mocks.toggleWorkspaceSidebarSide.mockReset();
    mocks.getWorkspaceSidebarSide.mockReturnValue('left');
    mocks.placeLeftDockPanel.mockReset();
    mocks.swapLeftDockPanels.mockReset();
    mocks.resolveShellNavDropTarget.mockReset();
    mocks.measureShellNavPanels.mockReset();
    mocks.measureShellNavPanels.mockReturnValue([]);
    mocks.resolveShellNavDropTarget.mockReturnValue(null);
    mocks.persistFrontendPreference.mockReset();
    mocks.resetActiveKanbanViewId('builtin:pulse');
    mocks.setActiveKanbanViewId.mockClear();
  });

  it('renders the workspace panels in default order', () => {
    render(
      <WorkspaceActivityRail isEditorAreaVisible onToggleEditorArea={vi.fn()} />
    );

    expect(screen.getByRole('navigation')).toHaveClass('workspace-chrome');
    expect(
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-label'))
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['会话列表', 'Bot 助手', '文件', 'Git']);
    expect(screen.getByRole('button', { name: '会话列表' })).toHaveAttribute(
      'data-basic-guide',
      'rail-session-list'
    );
    expect(screen.getByRole('button', { name: 'Bot 助手' })).toHaveAttribute(
      'data-basic-guide',
      'rail-bots'
    );
    expect(screen.getByRole('button', { name: '文件' })).toHaveAttribute(
      'data-basic-guide',
      'rail-file-tree'
    );
    expect(screen.getByRole('button', { name: 'Git' })).toHaveAttribute(
      'data-basic-guide',
      'rail-git'
    );
    expect(
      screen.queryByRole('button', { name: '取消分割' })
    ).not.toBeInTheDocument();
  });

  it('opens a panel on click without requiring a drag', () => {
    render(
      <WorkspaceActivityRail isEditorAreaVisible onToggleEditorArea={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: '会话列表' }));
    expect(mocks.toggleSessionList).toHaveBeenCalledOnce();
  });

  it('nudges an icon with Alt+Arrow and makes it the default panel', () => {
    render(
      <WorkspaceActivityRail isEditorAreaVisible onToggleEditorArea={vi.fn()} />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: '文件' }), {
      key: 'ArrowUp',
      altKey: true,
    });
    fireEvent.keyDown(screen.getByRole('button', { name: '文件' }), {
      key: 'ArrowUp',
      altKey: true,
    });

    expect(
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-label'))
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['文件', '会话列表', 'Bot 助手', 'Git']);
    expect(getDefaultActivityRailPanelId()).toBe(PANEL_IDS.FILE_TREE);
  });

  it('renders only usage and automation tasks views when mode is kanban (no workflow studio rail entry) and switches zh-CN <-> en cleanly', async () => {
    const i18n = (await import('@/i18n')).default;
    const { act } = await import('@testing-library/react');
    try {
      await act(async () => {
        await i18n.changeLanguage('zh-CN');
      });
      const { rerender } = render(
        <WorkspaceActivityRail
          isEditorAreaVisible={false}
          onToggleEditorArea={vi.fn()}
          mode="kanban"
        />
      );

      expect(
        screen
          .getAllByRole('button')
          .filter((button) => button.getAttribute('aria-label'))
          .map((button) => button.getAttribute('aria-label'))
      ).toEqual(['计量统计', '自动化任务']);
      expect(
        screen.queryByTestId('kanban-rail-builtin:workflows')
      ).not.toBeInTheDocument();

      await act(async () => {
        await i18n.changeLanguage('en');
      });
      rerender(
        <WorkspaceActivityRail
          isEditorAreaVisible={false}
          onToggleEditorArea={vi.fn()}
          mode="kanban"
        />
      );

      expect(
        screen
          .getAllByRole('button')
          .filter((button) => button.getAttribute('aria-label'))
          .map((button) => button.getAttribute('aria-label'))
      ).toEqual(['Usage', 'Automation Tasks']);
    } finally {
      await act(async () => {
        await i18n.changeLanguage('zh-CN');
      });
    }
  });

  it('switches independent kanban pages and plugin kanban views via left sidebar buttons', () => {
    const disposePluginView = kanbanViewRegistry.register(
      {
        pluginId: 'acme.demo',
        id: 'roadmap',
        title: 'Roadmap',
        icon: 'flag',
        hidesBottomDock: true,
      },
      'acme.demo'
    );

    try {
      render(
        <WorkspaceActivityRail
          isEditorAreaVisible={false}
          onToggleEditorArea={vi.fn()}
          mode="kanban"
        />
      );

      const usageButton = screen.getByTestId('kanban-rail-builtin:usage');
      const pulseButton = screen.getByTestId('kanban-rail-builtin:pulse');
      const pluginButton = screen.getByTestId(
        'kanban-rail-plugin:acme.demo/roadmap'
      );

      expect(pulseButton).toHaveAttribute('aria-pressed', 'true');
      expect(pulseButton).toHaveClass('is-active');
      expect(usageButton).toHaveAttribute('aria-pressed', 'false');
      expect(usageButton).toHaveAttribute(
        'data-basic-guide',
        'kanban-next-page'
      );

      fireEvent.click(usageButton);
      expect(mocks.setActiveKanbanViewId).toHaveBeenCalledWith('builtin:usage');
      expect(usageButton).toHaveAttribute('aria-pressed', 'true');
      expect(usageButton).toHaveClass('is-active');
      expect(pulseButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(pluginButton);
      expect(mocks.setActiveKanbanViewId).toHaveBeenCalledWith(
        'plugin:acme.demo/roadmap'
      );
      expect(pluginButton).toHaveAttribute('aria-pressed', 'true');
      expect(pluginButton).toHaveClass('is-active');
      expect(usageButton).toHaveAttribute('aria-pressed', 'false');
      expect(pulseButton).toHaveAttribute('aria-pressed', 'false');
    } finally {
      disposePluginView();
    }
  });

  it('renders the sidebar placement button at the panel toolbar size', () => {
    render(<ShellNavPanelDragHandle panelId={PANEL_IDS.BOTS} />);

    const button = screen.getByTestId(
      `shell-nav-side-toggle-${PANEL_IDS.BOTS}`
    );
    expect(button).toHaveAttribute('aria-label', '将侧边栏移到右侧');
    expect(button).toHaveClass('h-5', 'w-5');

    fireEvent.click(button);
    expect(mocks.toggleWorkspaceSidebarSide).toHaveBeenCalledOnce();
  });
});
