import { NOT_HANDLES, routeForLink } from '../links';

describe('incoming links', () => {
  it('opens her page from the link in her bio', () => {
    expect(routeForLink('https://yasante.com/braidsbyama')).toBe('/stylist/braidsbyama');
    expect(routeForLink('https://www.yasante.com/BraidsByAma')).toBe('/stylist/braidsbyama');
    expect(routeForLink('/braidsbyama')).toBe('/stylist/braidsbyama');
  });

  it('maps the site’s pages onto the same screens', () => {
    expect(routeForLink('https://yasante.com/looks/look_1')).toBe('/looks/look_1');
    expect(routeForLink('https://yasante.com/invite/FOUNDING50')).toBe('/invite/FOUNDING50');
    expect(routeForLink('yasante://looks/look_1')).toBe('/looks/look_1');
  });

  it('never mistakes a site page for a handle', () => {
    expect(routeForLink('https://yasante.com/looks')).toBe('/looks');
    expect(routeForLink('https://yasante.com/links')).toBe('/links');
    expect(routeForLink('https://yasante.com/terms')).toBe('/policy/terms');
  });

  it('opens a stylist’s private link and Finish your page, never as handles', () => {
    expect(routeForLink('https://yasante.com/claim/AbC-123_x')).toBe('/claim/AbC-123_x');
    expect(routeForLink('https://yasante.com/finish')).toBe('/finish');
    expect(NOT_HANDLES.has('claim')).toBe(true);
    expect(NOT_HANDLES.has('finish')).toBe(true);
  });

  it('keeps the query', () => {
    expect(routeForLink('https://yasante.com/braidsbyama?ref=ig')).toBe(
      '/stylist/braidsbyama?ref=ig'
    );
  });

  it('leaves other sites alone', () => {
    expect(routeForLink('https://example.com/x')).toBe('https://example.com/x');
  });
});

describe('app screens are never read as handles', () => {
  it.each(['bookings', 'requests', 'numbers', 'planner', 'shelf', 'hair-profile'])('%s', path => {
    expect(routeForLink(`yasante://${path}`)).toBe(`/${path}`);
    expect(routeForLink(`https://yasante.com/${path}`)).toBe(`/${path}`);
  });

  it('still reads a real handle', () => {
    expect(routeForLink('https://yasante.com/braidsbyama')).toBe('/stylist/braidsbyama');
  });
});

describe('policy pages open their screen', () => {
  it.each(['terms', 'privacy'])('%s', page => {
    expect(routeForLink(`https://yasante.com/${page}`)).toBe(`/policy/${page}`);
  });
});

describe('every screen is reserved', () => {
  // A screen opened by path that isn't on the list reads as a stylist's handle:
  // yasante://saved once opened a stylist called "saved".
  it('lists each top-level screen in NOT_HANDLES', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.join(__dirname, '../../../../app');
    const names = new Set<string>();
    const add = (dir: string) =>
      fs.readdirSync(dir).forEach(entry => {
        const name = entry.replace(/\.tsx$/, '');
        if (/^\(.*\)$/.test(name)) return add(path.join(dir, entry));
        if (
          name.startsWith('_') ||
          name.startsWith('+') ||
          name === 'index' ||
          name.startsWith('[')
        )
          return;
        names.add(name);
      });
    add(root);
    const missing = [...names].filter(n => !NOT_HANDLES.has(n));
    expect(missing).toEqual([]);
  });
});
