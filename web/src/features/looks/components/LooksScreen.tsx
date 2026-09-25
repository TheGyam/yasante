import { useNavigate } from 'react-router';
import { Page } from '@/shared/ui/Page';
import { Chip } from '@/shared/ui/Chip';
import { Select } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { useAreas, useStyles } from '../hooks';
import { HAIR_TEXTURES } from '../format';
import type { LookFilters } from '../types';
import { LookGrid } from './LookGrid';
import * as styles from './LooksScreen.css';

/** The address for a set of filters, so every view of the feed can be shared. */
export function looksHref(filters: LookFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/looks?${query}` : '/looks';
}

/** Every public look, newest first, narrowed by style, hair or area. */
export function LooksScreen({ filters }: { filters: LookFilters }) {
  const navigate = useNavigate();
  const { data: styleList } = useStyles();
  const { data: areas } = useAreas();
  const styleName = styleList?.find(style => style.id === filters.style)?.name;
  const toggle = (change: LookFilters) => looksHref({ ...filters, ...change });

  return (
    <Page
      title={styleName ? `${styleName} looks` : 'Looks'}
      description="Real looks on real hair, from braiders near you."
    >
      <div className={styles.intro}>
        <Text variant="display">{styleName ?? 'Looks'}</Text>
        <Text variant="body" tone="secondary">
          Real work on real hair, posted by the people who wore it and the braiders who did it.
        </Text>
      </div>

      <div className={styles.filters}>
        {!!styleList?.length && (
          <nav className={styles.chips} aria-label="Styles">
            <Chip label="All styles" selected={!filters.style} to={toggle({ style: undefined })} />
            {styleList.map(style => (
              <Chip
                key={style.id}
                label={style.name}
                selected={filters.style === style.id}
                to={toggle({ style: filters.style === style.id ? undefined : style.id })}
              />
            ))}
          </nav>
        )}
        <nav className={styles.chips} aria-label="Hair">
          {HAIR_TEXTURES.map(texture => (
            <Chip
              key={texture.id}
              label={texture.name}
              selected={filters.hair === texture.id}
              to={toggle({ hair: filters.hair === texture.id ? undefined : texture.id })}
            />
          ))}
        </nav>
        {!!areas?.length && (
          <div className={styles.area}>
            <Select
              label="Area"
              value={filters.area ?? ''}
              onChange={event =>
                navigate(toggle({ area: event.target.value || undefined }), { replace: true })
              }
            >
              <option value="">Everywhere</option>
              {areas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <LookGrid
        filters={filters}
        empty={{
          title: 'Nothing here yet',
          body: 'No looks match all of these. Try taking a filter off.',
        }}
      />
    </Page>
  );
}
