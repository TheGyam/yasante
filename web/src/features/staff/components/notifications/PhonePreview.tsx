import icon from '@/shared/ui/app-icon.png';
import * as s from './PhonePreview.css';

/** Roughly how it lands on a locked phone: the app, the title, the first lines. */
export function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <figure className={s.phone} aria-label="Preview on a phone">
      <div className={s.time}>9:41</div>
      <div className={s.notice}>
        <div className={s.head}>
          <img className={s.icon} src={icon} alt="" />
          <span className={s.app}>YASANTE</span>
          <span className={s.now}>now</span>
        </div>
        <div className={s.title}>{title || 'Your title'}</div>
        <div className={s.body}>{body || 'Your message shows here.'}</div>
      </div>
    </figure>
  );
}
