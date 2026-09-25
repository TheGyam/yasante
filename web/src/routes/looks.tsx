import { useSearchParams } from 'react-router';
import { HAIR_TEXTURES, LooksScreen, type Look } from '@/features/looks';

export default function LooksRoute() {
  const [params] = useSearchParams();
  const hair = params.get('hair');
  return (
    <LooksScreen
      filters={{
        style: params.get('style') ?? undefined,
        area: params.get('area') ?? undefined,
        hair: HAIR_TEXTURES.some(t => t.id === hair) ? (hair as Look['hairTexture']) : undefined,
      }}
    />
  );
}
