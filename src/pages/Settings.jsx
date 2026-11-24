import { useRef, useState } from 'react'
import { Download, Play, RotateCcw, Upload } from 'lucide-react'
import { VALID_IDS } from '../utils/ids'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSpeech, useVoices } from '../hooks/useSpeech'
import { useToast } from '../hooks/useToast'
import { DAILY_GOALS, exportJson, parseImport } from '../utils/storage'
import { Button } from '../components/common/Button'
import { Card, SectionHeader } from '../components/common/Card'
import { Segmented, SelectField, TextInput, Toggle } from '../components/common/Field'
import { ConfirmDialog } from '../components/common/Modal'
import { PageHeader } from '../components/common/PageHeader'

export default function Settings() {
  usePageTitle('Settings')
  const { state, actions } = useProgress()
  const { settings } = state
  const update = actions.updateSettings
  const voices = useVoices()
  const { supported, speak } = useSpeech()
  const toast = useToast()
  const fileRef = useRef(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const accentVoices = voices.filter((voice) => voice.lang.replace('_', '-') === settings.accent)
  const voiceOptions = [
    { value: '', label: 'Automatic (best for the accent)' },
    ...(accentVoices.length ? accentVoices : voices).map((voice) => ({ value: voice.voiceURI, label: `${voice.name} (${voice.lang})` })),
  ]

  const download = () => {
    const blob = new Blob([exportJson(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spellingbee-progress-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast('Progress downloaded')
  }

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      actions.replaceState(parseImport(await file.text(), VALID_IDS))
      toast('Progress restored')
    } catch (error) {
      toast(error.message, 'error')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Saved in this browser only." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5">
          <SectionHeader title="Voice" />
          {!supported && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">This browser has no text-to-speech. Listening questions will show the meaning instead.</p>}
          <Segmented
            legend="Accent"
            options={[
              { value: 'en-US', label: 'American' },
              { value: 'en-GB', label: 'British' },
            ]}
            value={settings.accent}
            onChange={(accent) => update({ accent, voice: '' })}
            columns="grid-cols-2"
          />
          <SelectField label="Voice" value={settings.voice} onChange={(event) => update({ voice: event.target.value })} options={voiceOptions} />
          <div>
            <label htmlFor="rate" className="mb-1.5 flex justify-between text-sm font-semibold">
              Speaking speed <span className="text-muted tabular-nums">{settings.rate.toFixed(2)}×</span>
            </label>
            <input id="rate" type="range" min="0.5" max="1.3" step="0.05" value={settings.rate} onChange={(event) => update({ rate: Number(event.target.value) })} className="w-full accent-[var(--c-brand)]" />
          </div>
          <Button variant="secondary" icon={Play} onClick={() => speak('Accommodation. The hotel offers comfortable accommodation.')} disabled={!supported}>
            Test the voice
          </Button>
        </Card>

        <Card className="flex flex-col gap-5">
          <SectionHeader title="Practice" />
          <Toggle label="Say the word automatically" description="Play each word as soon as a listening question appears." checked={settings.autoPlay} onChange={(autoPlay) => update({ autoPlay })} />
          <Toggle label="Accept British and American spellings" description="For example realise / realize, neighbour / neighbor." checked={settings.acceptVariants} onChange={(acceptVariants) => update({ acceptVariants })} />
          <Toggle label="Retype mistakes" description="After a wrong answer, type the correct spelling once before moving on." checked={settings.retype} onChange={(retype) => update({ retype })} />
          <Toggle label="Sound effects" description="A short tone for right and wrong answers." checked={settings.sound} onChange={(sound) => update({ sound })} />
          <Segmented legend="Daily goal (words)" options={DAILY_GOALS.map((value) => ({ value, label: String(value) }))} value={settings.dailyGoal} onChange={(dailyGoal) => update({ dailyGoal })} />
        </Card>

        <Card className="flex flex-col gap-5">
          <SectionHeader title="Profile & look" />
          <TextInput label="Your name" value={settings.name} maxLength={30} placeholder="Shown in the greeting" onChange={(event) => update({ name: event.target.value })} />
          <Segmented
            legend="Theme"
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            columns="grid-cols-3"
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionHeader title="Your data" />
          <p className="text-sm text-muted">Progress lives in this browser. Download a backup to move it to another device.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Download} onClick={download}>
              Download backup
            </Button>
            <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
              Restore backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={upload} />
          </div>
          <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)} className="self-start">
            Reset all progress
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetProgress()
          setConfirmReset(false)
          toast('Progress reset')
        }}
        title="Reset all progress?"
        description="Every word's history, your streak and your best challenge score will be deleted. Settings are kept. This cannot be undone."
        confirmLabel="Reset progress"
        danger
      />
    </>
  )
}
