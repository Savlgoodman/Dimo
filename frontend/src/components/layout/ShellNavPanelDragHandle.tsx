import { PanelLeft, PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePanelActionsContext } from '@/contexts/PanelActionsContext';
import type { ActivityRailItemId } from '@/lib/activityRailOrder';
import { cn } from '@/lib/utils';

export function ShellNavPanelDragHandle({
  panelId,
  className,
}: {
  panelId: ActivityRailItemId;
  className?: string;
}) {
  const { t } = useTranslation('panels');
  const { getWorkspaceSidebarSide, toggleWorkspaceSidebarSide } =
    usePanelActionsContext();
  const side = getWorkspaceSidebarSide();
  const SideIcon = side === 'left' ? PanelRight : PanelLeft;
  const label =
    side === 'left'
      ? t('ideLayout.moveSidebarRight')
      : t('ideLayout.moveSidebarLeft');

  return (
    <button
      type="button"
      data-testid={`shell-nav-side-toggle-${panelId}`}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        toggleWorkspaceSidebarSide();
      }}
      className={cn(
        'shell-nav-panel-side-toggle inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-low transition-colors hover:bg-secondary/60 hover:text-high',
        className
      )}
    >
      <SideIcon className="h-3.5 w-3.5" />
    </button>
  );
}
