import { useSettingsStore } from '../../../app/store/settingsStore'
import { THEME_NAMES } from '../../../app/types'
import type { ThemeName } from '../../../app/types'
import { SettingsRow } from '../controls/SettingsRow'
import { Toggle } from '../controls/Toggle'
import { SelectField } from '../controls/SelectField'
import { NumberField } from '../controls/NumberField'

const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  dracula: 'Dracula',
  nord: 'Nord',
  monokai: 'Monokai',
  'github-dark': 'GitHub Dark',
  cyberpunk: 'Cyberpunk',
}

export function GeneralSection() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const editor = useSettingsStore((s) => s.editor)
  const updateEditorSetting = useSettingsStore((s) => s.updateEditorSetting)

  return (
    <div className="divide-y divide-outline-variant/60">
      <SettingsRow label="Theme">
        <SelectField
          value={theme}
          onChange={(v) => setTheme(v as ThemeName)}
          options={THEME_NAMES.map((name) => ({ value: name, label: THEME_LABELS[name] }))}
          ariaLabel="Theme"
        />
      </SettingsRow>
      <SettingsRow label="Font size">
        <NumberField
          value={editor.fontSize}
          min={10}
          max={24}
          onChange={(v) => updateEditorSetting('fontSize', v)}
          ariaLabel="Font size"
        />
      </SettingsRow>
      <SettingsRow label="Font family">
        <SelectField
          value={editor.fontFamily}
          onChange={(v) => updateEditorSetting('fontFamily', v as 'mono' | 'sans')}
          options={[
            { value: 'mono', label: 'JetBrains Mono' },
            { value: 'sans', label: 'Geist Sans' },
          ]}
          ariaLabel="Font family"
        />
      </SettingsRow>
      <SettingsRow label="Word wrap">
        <Toggle checked={editor.wordWrap} onChange={(v) => updateEditorSetting('wordWrap', v)} label="Word wrap" />
      </SettingsRow>
      <SettingsRow label="Tab size">
        <NumberField
          value={editor.tabSize}
          min={1}
          max={8}
          onChange={(v) => updateEditorSetting('tabSize', v)}
          ariaLabel="Tab size"
        />
      </SettingsRow>
      <SettingsRow label="Line numbers">
        <Toggle
          checked={editor.lineNumbers}
          onChange={(v) => updateEditorSetting('lineNumbers', v)}
          label="Line numbers"
        />
      </SettingsRow>
    </div>
  )
}
