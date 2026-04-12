import { act } from 'react'
import { createRoot } from 'react-dom/client'
import SetupSimulator from '@/app/setup/steps/simulator'

describe('Setup simulator polling flow', () => {
  beforeEach(() => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockReset()
  })

  afterEach(() => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false
    jest.useRealTimers()
  })

  it('polls simulator status and marks complete only after success', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const setSetupData = jest.fn()
    const onNext = jest.fn()
    const onBack = jest.fn()

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: {
            session_id: 'session-123',
            conversation: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            status: 'running',
            conversation: [{ role: 'lead', message: "Hi, I'm interested in a condo." }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            status: 'success',
            conversation: [
              { role: 'lead', message: "Hi, I'm interested in a condo." },
              { role: 'ai', message: 'Great, I can help you with that.' },
            ],
          },
        }),
      })

    await act(async () => {
      root.render(
        <SetupSimulator
          onNext={onNext}
          onBack={onBack}
          setupData={{ simulatorCompleted: false }}
          setSetupData={setSetupData}
          agentId="agent-1"
        />
      )
    })

    const startButton = container.querySelector('[data-testid="simulator-start-button"]') as HTMLButtonElement
    expect(startButton).toBeTruthy()

    await act(async () => {
      startButton.click()
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(710)
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      jest.advanceTimersByTime(710)
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(container.textContent).toContain('Aha moment unlocked')
    expect(setSetupData).toHaveBeenCalledWith({ simulatorCompleted: true })

    const secondRequest = (global.fetch as jest.Mock).mock.calls[1]
    const secondBody = JSON.parse(secondRequest[1].body as string)
    expect(secondBody.action).toBe('status')
    expect(secondBody.sessionId).toBe('session-123')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
