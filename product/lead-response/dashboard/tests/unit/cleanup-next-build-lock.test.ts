import { execSync } from 'child_process'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>

// Require the script once at module load time. jest.mock is already active (it is
// hoisted above imports), so the execSync inside the script and mockedExecSync are
// the same jest.fn() instance. No resetModules() needed — the script has a
// require.main guard so there are no module-level side effects to isolate.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const script = require('../../scripts/cleanup-next-build-lock.js')

describe('cleanup-next-build-lock', () => {
  beforeEach(() => {
    mockedExecSync.mockReset()
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
})
