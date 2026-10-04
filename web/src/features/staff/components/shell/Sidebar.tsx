import type { ReactNode } from 'react';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Link } from '@/shared/ui/Link';
import { useLocalSetting } from '../../hooks';
import { locate, type NavSection } from '../../nav';
import * as ui from '../ui.css';
import * as s from './Sidebar.css';

/**
 * The workspace's navigation, by job: Today, then Review with its live counts, then
 * the areas. Collapses to a rail of icons; System stays folded until opened.
 */
export function Sidebar({
  sections,
  pathname,
  rail = false,
  onRail,
  onNavigate,
  footer,
}: {
  sections: NavSection[];
  pathname: string;
  rail?: boolean;
  onRail?: (rail: boolean) => void;
  onNavigate?: () => void;
  footer: ReactNode;
}) {
  const [system, setSystem] = useLocalSetting<'open' | 'closed'>('system', 'closed');
  const active = locate(sections, pathname)?.item.key;
  return (
    <nav className={s.sidebar} data-rail={rail} aria-label="Workspace">
      <div className={s.brand}>
        <Link to="/" className={s.brandLink} aria-label="Today" onClick={onNavigate}>
          <BrandMark />
        </Link>
        {onRail && (
          <button
            type="button"
            className={s.railToggle}
            onClick={() => onRail(!rail)}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            title={rail ? 'Expand sidebar ( [ )' : 'Collapse sidebar ( [ )'}
          >
            {rail ? (
              <PanelLeftOpen size={18} aria-hidden />
            ) : (
              <PanelLeftClose size={18} aria-hidden />
            )}
          </button>
        )}
      </div>
      <div className={s.sections}>
        {sections.map(section => {
          const folded = section.collapsible && system === 'closed' && !rail;
          return (
            <div key={section.name} className={s.section}>
              {section.name !== 'Today' &&
                (section.collapsible ? (
                  <button
                    type="button"
                    className={`${s.label} ${s.labelButton}`}
                    aria-expanded={!folded}
                    onClick={() => setSystem(folded ? 'open' : 'closed')}
                  >
                    {section.name}
                    <ChevronRight size={12} className={s.chevron} aria-hidden />
                  </button>
                ) : (
                  <span className={s.label}>{section.name}</span>
                ))}
              {!folded &&
                section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      to={item.url}
                      className={s.item}
                      aria-current={item.key === active ? 'page' : undefined}
                      title={rail ? item.name : item.description}
                      onClick={onNavigate}
                    >
                      <Icon size={18} strokeWidth={2} aria-hidden className={s.icon} />
                      <span className={`${s.name} ${ui.truncate}`}>{item.name}</span>
                      {item.count !== undefined && (
                        <span
                          className={`${ui.count} ${item.urgent ? ui.urgent : ''} ${s.badge}`}
                          aria-label={`${item.count} waiting`}
                        >
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </div>
      <div className={s.footer}>{footer}</div>
    </nav>
  );
}
