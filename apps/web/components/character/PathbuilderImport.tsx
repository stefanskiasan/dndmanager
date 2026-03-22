'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PathbuilderPreview } from './PathbuilderPreview'
import { mapPathbuilderToCharacter, validateCharacterData, type PathbuilderExport } from '@dndmanager/pf2e-engine/pathbuilder'
import { pathbuilderExportSchema } from '@/lib/schemas/pathbuilder'
import type { CharacterData } from '@dndmanager/pf2e-engine/pathbuilder'

interface PathbuilderImportProps {
  campaignId: string
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done' | 'error'

export function PathbuilderImport({ campaignId }: PathbuilderImportProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedName, setParsedName] = useState('')
  const [parsedData, setParsedData] = useState<CharacterData | null>(null)
  const [rawData, setRawData] = useState<unknown>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)

        // Validate structure
        const parseResult = pathbuilderExportSchema.safeParse(json)
        if (!parseResult.success) {
          setError(
            'Ungueltige Pathbuilder-Datei: ' +
            parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
          )
          return
        }

        // Map to our format — Zod output is structurally compatible after validation
        const { name, data } = mapPathbuilderToCharacter(parseResult.data as unknown as PathbuilderExport)

        // Validate against rules
        const validation = validateCharacterData(data)
        if (!validation.valid) {
          setError(
            'Charakter-Validierung fehlgeschlagen: ' +
            validation.errors.map((e) => e.message).join(', ')
          )
          return
        }

        setWarnings(validation.warnings.map((w) => w.message))
        setParsedName(name)
        setParsedData(data)
        setRawData(json)
        setStep('preview')
      } catch {
        setError('Datei konnte nicht als JSON gelesen werden.')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!rawData) return
    setStep('importing')
    setError(null)

    try {
      const res = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, pathbuilderData: rawData }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Import fehlgeschlagen')
        setStep('error')
        return
      }

      setStep('done')
      setTimeout(() => {
        router.push(`/campaigns/${campaignId}`)
        router.refresh()
      }, 1500)
    } catch {
      setError('Netzwerkfehler beim Import')
      setStep('error')
    }
  }, [rawData, campaignId, router])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedName('')
    setParsedData(null)
    setRawData(null)
    setWarnings([])
    setError(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pathbuilder 2e Import</CardTitle>
            <CardDescription>
              Exportiere deinen Charakter in Pathbuilder 2e als JSON und lade die Datei hier hoch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="pb-file"
                className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-neutral-600 p-8 text-center transition-colors hover:border-neutral-400"
              >
                <p className="text-sm text-neutral-300">JSON-Datei hierher ziehen oder klicken</p>
                <p className="text-xs text-neutral-500 mt-1">.json Datei aus Pathbuilder 2e</p>
                <input
                  id="pb-file"
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {step === 'preview' && parsedData && (
        <>
          {warnings.length > 0 && (
            <Card className="border-yellow-600">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-yellow-500">Hinweise:</p>
                <ul className="text-sm text-yellow-400 list-disc pl-4 mt-1">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          <PathbuilderPreview name={parsedName} data={parsedData} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Charakter importieren
            </Button>
          </div>
        </>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-neutral-300">Charakter wird importiert...</p>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === 'done' && (
        <Card className="border-green-600">
          <CardContent className="py-8 text-center">
            <p className="text-green-400 font-medium">Charakter erfolgreich importiert!</p>
            <p className="text-sm text-neutral-400 mt-1">Weiterleitung...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-600">
          <CardContent className="pt-4">
            <p className="text-sm text-red-400">{error}</p>
            {step === 'error' && (
              <Button variant="outline" onClick={handleReset} className="mt-3">
                Erneut versuchen
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
