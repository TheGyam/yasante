import { forwardRef, type ComponentProps } from 'react';
import { Link as RouterLink, NavLink as RouterNavLink } from 'react-router';

export interface LinkProps extends ComponentProps<typeof RouterLink> {
  /**
   * Start loading what the page needs. Runs when a pointer rests on the link, it gets
   * focus, or a finger touches it, so the page is usually ready by the click.
   */
  preload?: () => void;
}

/** Every link inside the site. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { preload, onPointerEnter, onFocus, onTouchStart, ...rest },
  ref
) {
  return (
    <RouterLink
      ref={ref}
      {...rest}
      onPointerEnter={event => {
        preload?.();
        onPointerEnter?.(event);
      }}
      onFocus={event => {
        preload?.();
        onFocus?.(event);
      }}
      onTouchStart={event => {
        preload?.();
        onTouchStart?.(event);
      }}
    />
  );
});

export interface NavLinkProps extends ComponentProps<typeof RouterNavLink> {
  preload?: () => void;
}

/** A link that marks itself as the current page (aria-current) when it is. */
export function NavLink({ preload, ...rest }: NavLinkProps) {
  return (
    <RouterNavLink {...rest} onPointerEnter={preload} onFocus={preload} onTouchStart={preload} />
  );
}
