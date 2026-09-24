import { routeForLink } from '../links';

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
    expect(routeForLink('https://yasante.com/terms')).toBe('/terms');
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
