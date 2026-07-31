interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

// From Uiverse.io by Javierrocadev
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <div className="peer h-4 w-10 rounded-full bg-linear-to-r from-rose-400 to-red-900 shadow-inner shadow-gray-900 ring-1 ring-gray-500 outline-none duration-500 after:absolute after:-top-1 after:-left-1 after:flex after:h-6 after:w-6 after:items-center after:justify-center after:rounded-full after:border-2 after:border-gray-500 after:bg-gray-900 after:outline-none after:duration-300 after:content-[''] peer-checked:bg-linear-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-900 peer-checked:after:translate-x-6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-500" />
    </label>
  )
}
