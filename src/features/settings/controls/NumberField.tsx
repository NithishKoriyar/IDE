interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel?: string
}

export function NumberField({ value, onChange, min, max, step = 1, ariaLabel }: NumberFieldProps) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => {
        const next = Number(e.target.value)
        if (!Number.isNaN(next)) onChange(next)
      }}
      className="w-16 rounded-md border border-outline-variant bg-surface-container-high px-2 py-1 text-xs text-on-surface focus:border-primary focus:outline-none"
    />
  )
}
