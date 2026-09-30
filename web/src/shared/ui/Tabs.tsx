import * as s from './Tabs.css';
export function Tabs({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {items.map((item, index) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          className={s.tab}
          key={item.value}
          onClick={() => onChange(item.value)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
            onChange(items[next].value);
            (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
