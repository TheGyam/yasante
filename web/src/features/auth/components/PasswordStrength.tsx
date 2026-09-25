import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../rules';
import * as styles from './PasswordStrength.css';

/** Each rule ticks as it's met, as in the app. */
export function PasswordStrength({ password }: { password: string }) {
  return (
    <ul className={styles.rules} aria-label="Password rules">
      {PASSWORD_RULES.map(rule => {
        const met = rule.test(password);
        const Icon = met ? Check : Circle;
        return (
          <li key={rule.label} className={`${styles.rule} ${met ? styles.met : ''}`}>
            <Icon size={12} strokeWidth={2.6} aria-hidden />
            {rule.label}
            <span className="visually-hidden">{met ? ', done' : ', not yet'}</span>
          </li>
        );
      })}
    </ul>
  );
}
