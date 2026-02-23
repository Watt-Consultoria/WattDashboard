'use client';

import styles from './vc-toggle-switch.module.css';

type VcToggleSwitchProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
};

export function VcToggleSwitch({
  id,
  checked,
  onCheckedChange,
  onLabel,
  offLabel,
  disabled = false
}: VcToggleSwitchProps) {
  return (
    <div className={styles.vcToggleContainer}>
      <label className={styles.vcSwitch} htmlFor={id}>
        <input
          id={id}
          type='checkbox'
          className={styles.vcSwitchInput}
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          disabled={disabled}
          aria-label='Tipo do formulario'
        />
        <span
          className={styles.vcSwitchLabel}
          data-on={onLabel}
          data-off={offLabel}
        />
        <span className={styles.vcHandle} />
      </label>
    </div>
  );
}
