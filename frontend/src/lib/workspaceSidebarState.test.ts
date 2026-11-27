import { describe, expect, it } from 'vitest';
import { Orientation, type SerializedDockview } from 'dockview-core';
import {
  extractSidebarLayout,
  removeSidebarPanels,
} from './workspaceSidebarState';

const layout: SerializedDockview = {
  grid: {
    orientation: Orientation.HORIZONTAL,
    width: 1000,
    height: 700,
    root: {
      type: 'branch',
      data: [
        {
          type: 'leaf',
          data: {
            id: 'group-left',
            views: ['file-tree'],
            activeView: 'file-tree',
          },
          size: 220,
        },
        {
          type: 'leaf',
          data: {
            id: 'group-editor-1',
            views: ['welcome'],
            activeView: 'welcome',
          },
          size: 780,
        },
      ],
    },
  },
  panels: {
    'file-tree': {
      id: 'file-tree',
      contentComponent: 'file-tree',
      title: 'Files',
    },
    welcome: { id: 'welcome', contentComponent: 'welcome', title: 'Welcome' },
  },
  activeGroup: 'group-editor-1',
};

describe('workspace sidebar layout state', () => {
  it('keeps sidebar and workspace serialized layouts independent', () => {
    expect(extractSidebarLayout(layout)?.panels).toEqual({
      'file-tree': layout.panels['file-tree'],
    });
    expect(removeSidebarPanels(layout)?.panels).toEqual({
      welcome: layout.panels.welcome,
    });
  });
});
