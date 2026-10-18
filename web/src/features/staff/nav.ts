import { BarChart3, Bug, LayoutDashboard, TrendingUp, type LucideIcon } from 'lucide-react';
import { iconFor } from './icons';
import type { Overview } from './types';

export interface NavItem {
  key: string;
  name: string;
  url: string;
  icon: LucideIcon;
  description?: string;
  count?: number;
  /** A count that needs someone, not just information. */
  urgent?: boolean;
}

export interface NavSection {
  name: string;
  items: NavItem[];
  collapsible?: boolean;
}

/** Sections by job, in the order the team works: what needs me, then who, then what. */
const ORDER = ['People', 'Messages', 'Bookings', 'Content', 'Insights', 'System'];
// Tools with a page of their own rather than a list of records.
const PAGES: Record<string, string> = {
  'staff.broadcast': '/notifications',
  'stylists.featuredpage': '/featured',
};

export function navigation(data: Overview): NavSection[] {
  const today: NavSection = {
    name: 'Today',
    items: [
      {
        key: 'today',
        name: 'Today',
        url: '/',
        icon: LayoutDashboard,
        count: data.totalOpen || undefined,
        urgent: data.totalOpen > 0,
      },
    ],
  };
  const review: NavSection = {
    name: 'Review',
    items: data.queues.map(queue => ({
      key: `review-${queue.key}`,
      name: queue.label,
      url: queue.url,
      icon: iconFor(data.models.find(model => model.key === queue.model)?.icon),
      description: queue.hint,
      count: queue.count || undefined,
      urgent: queue.count > 0,
    })),
  };
  const sections: NavSection[] = ORDER.map(group => ({
    name: group,
    collapsible: group === 'System',
    items: data.models
      .filter(model => model.group === group && !model.parent && model.canView)
      .sort((a, b) => a.order - b.order)
      .map(model => ({
        key: model.key,
        name: model.name,
        url: PAGES[model.key] ?? model.url,
        icon: iconFor(model.icon),
        description: model.description,
      })),
  }));
  const insights = sections.find(section => section.name === 'Insights')!;
  insights.items = [
    { key: 'insights', name: 'Insights', url: '/insights', icon: TrendingUp },
    ...(data.errors.open || data.models.some(model => model.key === 'common.errorissue')
      ? [
          {
            key: 'errors',
            name: 'Errors',
            url: '/errors',
            icon: Bug,
            count: data.errors.open || undefined,
            urgent: data.errors.new > 0,
          },
        ]
      : []),
    ...(data.user.superuser
      ? [{ key: 'metrics', name: 'Business metrics', url: '/metrics', icon: BarChart3 }]
      : []),
    ...insights.items.filter(item => item.key !== 'common.errorissue'),
  ];
  return [today, review, ...sections].filter(section => section.items.length);
}

/** Every page the palette can open, flattened. */
export function pages(data: Overview): NavItem[] {
  return navigation(data).flatMap(section => section.items);
}

/** The item a path belongs to, for breadcrumbs and the active state. */
export function locate(sections: NavSection[], pathname: string) {
  for (const section of sections)
    for (const item of section.items) {
      const path = item.url.split('?')[0];
      if (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`))
        return { section, item };
    }
  return undefined;
}
