import { render, screen } from '@testing-library/react-native';
import { MARK, SEP } from '@/shared/lib/format';
import { Text } from '../Text';

describe('Text', () => {
  it('draws our plait between parts, and says a pause instead of it', () => {
    render(<Text>{`Ama Mensah${SEP}Knotless braids`}</Text>);
    expect(screen.getByLabelText('Ama Mensah, Knotless braids')).toBeTruthy();
    expect(JSON.stringify(screen.getByText(MARK).props.style)).toContain('YasanteMarks');
  });

  it('leaves text without marks alone', () => {
    render(<Text>Knotless braids</Text>);
    expect(screen.getByText('Knotless braids').props.accessibilityLabel).toBeUndefined();
  });
});
