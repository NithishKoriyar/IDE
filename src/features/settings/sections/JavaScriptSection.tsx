import { useSettingsStore } from '../../../app/store/settingsStore'
import { SettingsRow } from '../controls/SettingsRow'
import { Toggle } from '../controls/Toggle'

export function JavaScriptSection() {
  const javascriptSettings = useSettingsStore((s) => s.javascript)
  const update = useSettingsStore((s) => s.updateJavaScriptSetting)

  return (
    <div className="divide-y divide-outline-variant/60">
      <SettingsRow label="Enable linting" description="Flags syntax errors inline as you type.">
        <Toggle checked={javascriptSettings.enableLinting} onChange={(v) => update('enableLinting', v)} />
      </SettingsRow>
    </div>
  )
}
