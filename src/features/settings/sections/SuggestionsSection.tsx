import { useSettingsStore } from '../../../app/store/settingsStore'
import { SettingsRow } from '../controls/SettingsRow'
import { Toggle } from '../controls/Toggle'

export function SuggestionsSection() {
  const suggestions = useSettingsStore((s) => s.suggestions)
  const update = useSettingsStore((s) => s.updateSuggestionSetting)

  return (
    <div className="divide-y divide-outline-variant/60">
      <SettingsRow label="Enable autocomplete" description="Show the completion popup while typing.">
        <Toggle checked={suggestions.autocomplete} onChange={(v) => update('autocomplete', v)} />
      </SettingsRow>
      <SettingsRow label="Enable snippets" description="Include template snippets (for, if, function, ...) in completions.">
        <Toggle checked={suggestions.snippets} onChange={(v) => update('snippets', v)} />
      </SettingsRow>
      <SettingsRow label="Enable parameter hints" description="Show a parameter signature alongside function completions.">
        <Toggle checked={suggestions.parameterHints} onChange={(v) => update('parameterHints', v)} />
      </SettingsRow>
    </div>
  )
}
