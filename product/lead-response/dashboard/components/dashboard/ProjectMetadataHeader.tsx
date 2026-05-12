'use client'

import { useEffect, useState } from 'react'

type ProjectMetadata = {
  projectName: string
  goal: string
  currentDay: number
  deadline: string
  overallStatus: string
  statusColor?: string
}

export function ProjectMetadataHeader() {
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchMetadata() {
      try {
        const response = await fetch('/api/dashboard/project-metadata', { credentials: 'include' })
        if (!response.ok) return

        const json = await response.json()
        if (mounted && json?.metadata) {
          setMetadata(json.metadata)
        }
      } catch {
        // Non-blocking dashboard enhancer.
      }
    }

    fetchMetadata()

    return () => {
      mounted = false
    }
  }, [])

  if (!metadata) return null

  return (
    <section
      data-testid="project-metadata-header"
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Project</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{metadata.projectName}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Goal</p>
            <p className="font-semibold text-slate-900 dark:text-white">{metadata.goal}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Current Day</p>
            <p className="font-semibold text-slate-900 dark:text-white">Day {metadata.currentDay}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Deadline</p>
            <p className="font-semibold text-slate-900 dark:text-white">{metadata.deadline}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Overall Status</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {metadata.statusColor ? `${metadata.statusColor} ` : ''}
              {metadata.overallStatus}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
