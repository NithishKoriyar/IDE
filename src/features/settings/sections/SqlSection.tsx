import { useSettingsStore } from '../../../app/store/settingsStore'
import { SettingsRow } from '../controls/SettingsRow'
import { Toggle } from '../controls/Toggle'

export function SqlSection() {
  const sql = useSettingsStore((s) => s.sql)
  const update = useSettingsStore((s) => s.updateSqlSetting)

  return (
    <div className="divide-y divide-outline-variant/60">
      <SettingsRow label="SQL suggestions" description="Live table/column name completions from the current schema.">
        <Toggle checked={sql.sqlSuggestions} onChange={(v) => update('sqlSuggestions', v)} />
      </SettingsRow>
    </div>
  )
}
