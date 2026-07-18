import { execSync } from 'child_process'
import fs from 'fs'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  rmSync: jest.fn(),
}))

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>
const mockedFs = fs as jest.Mocked<typeof fs>

// Load once — the script captures execSync at module load time; resetting modules
// per-test would create new jest.fn() instances that mockedExecSync no longer tracks.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const script = require('../../scripts/cleanup-next-build-lock.js')

describe('cleanup-next-build-lock', () => {
  beforeEach(() => {
    mockedExecSync.mockReset()
    mockedFs.existsSync.mockReset()
    mockedFs.statSync.mockReset()
    mockedFs.rmSync.mockReset()
  })

  it('returns no active builds when pgrep finds nothing', () => {
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) {
        const err = new Error('no match') as Error & { status?: number }
        err.status = 1
        throw err
      }
      return ''
    })

    expect(script.getActiveNextBuildPids()).toEqual([])
  })

  it('queries only next build processes', () => {
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) {
        const err = new Error('no match') as Error & { status?: number }
        err.status = 1
        throw err
      }
      return ''
    })

    script.getActiveNextBuildPids()

    expect(mockedExecSync).toHaveBeenCalledWith(
      'pgrep -f "node_modules/.bin/next build"',
      { encoding: 'utf8' }
    )
  })

  it('returns active pid when parent and grandparent are alive', () => {
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) return '100\n'
      if (command.includes('ps -o ppid= -p 100')) return '10'
      if (command.includes('ps -o ppid= -p 10')) return '1'
      if (command.includes('kill -0 10')) return ''
      if (command.includes('kill -0 1')) return ''
      return ''
    })

    expect(script.getActiveNextBuildPids()).toEqual([100])
  })

  it('drops orphaned pid when lineage is dead', () => {
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) return '200\n'
      if (command.includes('ps -o ppid= -p 200')) return '20'
      if (command.includes('ps -o ppid= -p 20')) return '2'
      if (command.includes('kill -0 20')) return ''
      if (command.includes('kill -0 2')) throw new Error('dead grandparent')
      return ''
    })

    expect(script.getActiveNextBuildPids()).toEqual([])
  })

  it('waits for active builds to finish', async () => {
    let calls = 0
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) {
        calls += 1
        return calls === 1 ? '100\n' : ''
      }
      if (command.includes('ps -o ppid= -p 100')) return '10'
      if (command.includes('ps -o ppid= -p 10')) return '1'
      if (command.includes('kill -0 10')) return ''
      if (command.includes('kill -0 1')) return ''
      return ''
    })

    const remaining = await script.waitForBuildsToFinish(20, 1)
    expect(remaining).toEqual([])
  })

  it('polls until build exits, then confirms no remaining pids', async () => {
    let pgrepCalls = 0
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) {
        pgrepCalls++
        // First call: build running. Second call onward: build finished.
        if (pgrepCalls === 1) return '100\n'
        const err = new Error('no match') as Error & { status?: number }
        err.status = 1
        throw err
      }
      if (command.includes('ps -o ppid= -p 100')) return '10'
      if (command.includes('ps -o ppid= -p 10')) return '1'
      if (command.includes('kill -0 10')) return ''
      if (command.includes('kill -0 1')) return ''
      return ''
    })

    const remaining = await script.waitForBuildsToFinish(100, 5)

    expect(remaining).toEqual([])
    expect(pgrepCalls).toBeGreaterThan(1)
  })

  it('getAllNextBuildPids returns orphaned pids without parent check', () => {
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) return '300\n'
      return ''
    })

    expect(script.getAllNextBuildPids()).toEqual([300])
  })

  it('waitForAllBuildsToFinish waits for orphaned builds to exit', async () => {
    let pgrepCalls = 0
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('pgrep -f')) {
        pgrepCalls++
        if (pgrepCalls === 1) return '300\n'
        const err = new Error('no match') as Error & { status?: number }
        err.status = 1
        throw err
      }
      return ''
    })

    const remaining = await script.waitForAllBuildsToFinish(100, 5)

    expect(remaining).toEqual([])
    expect(pgrepCalls).toBeGreaterThan(1)
  })

  it('removes stale build trace and cache artifacts', () => {
    mockedFs.existsSync.mockReturnValue(true)

    script.cleanupBuildArtifacts('/tmp/dashboard/.next')

    expect(mockedFs.rmSync).toHaveBeenCalledWith('/tmp/dashboard/.next/trace', { force: true })
    expect(mockedFs.rmSync).toHaveBeenCalledWith('/tmp/dashboard/.next/cache', {
      recursive: true,
      force: true,
    })
  })

  it('skips artifact cleanup when .next does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false)

    script.cleanupBuildArtifacts('/tmp/dashboard/.next')

    expect(mockedFs.rmSync).not.toHaveBeenCalled()
  })
})
