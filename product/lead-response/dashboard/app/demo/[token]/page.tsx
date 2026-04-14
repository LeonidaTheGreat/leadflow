'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MessageSquare,
  User,
  Bot,
  TrendingUp,
  Zap,
  Calendar,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DemoTokenData {
  valid: boolean
  expired?: boolean
  agentContext?: { name?: string; email?: string }
}

interface ConversationMessage {
  role: 'lead' | 'ai'
  text: string
  delayMs: number
}

type PageState = 'loading' | 'invalid' | 'ready' | 'playing' | 'complete'

// ─── Scripted conversation for the demo ─────────────────────────────────────

const DEMO_CONVERSATION: ConversationMessage[] = [
  {
    role: 'lead',
    text: "Hi, I saw the listing on Zillow for 742 Evergreen Terrace. Is it still available?",
    delayMs: 0,
  },
  {
    role: 'ai',
    text: "Hi Sarah! Yes, 742 Evergreen Terrace is still available. It's a beautiful 4-bed/3-bath home listed at $485K. Would you like to schedule a showing this week?",
    delayMs: 1800,
  },
  {
    role: 'lead',
    text: "That sounds great! I'm free Thursday or Friday afternoon.",
    delayMs: 3200,
  },
  {
    role: 'ai',
    text: "Perfect! I have Thursday at 2 PM or Friday at 3 PM open. Which works better for you? I'll send a calendar invite right away.",
    delayMs: 2000,
  },
  {
    role: 'lead',
    text: 'Thursday at 2 PM works. Thanks!',
    delayMs: 2500,
  },
  {
    role: 'ai',
    text: "You're all set for Thursday at 2 PM! I just sent a calendar invite to your email. Looking forward to showing you the home, Sarah!",
    delayMs: 1500,
  },
]

// ─── Chat Bubble ────────────────────────────────────────────────────────────

function ChatBubble({ role, text, animate }: { role: 'lead' | 'ai'; text: string; animate: boolean }) {
  const isAI = role === 'ai'
  return (
    <div
      className={`flex gap-3 ${isAI ? 'flex-row-reverse' : 'flex-row'} ${
        animate ? 'animate-fade-in-up' : ''
      }`}
    >
      <div
        className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          isAI
            ? 'bg-emerald-500/20 border border-emerald-500/30'
            : 'bg-slate-700 border border-slate-600'
        }`}
      >
        {isAI ? (
          <Bot className="h-4 w-4 text-emerald-400" />
        ) : (
          <User className="h-4 w-4 text-slate-300" />
        )}
      </div>
      <div className={`max-w-[75%] flex flex-col ${isAI ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-white rounded-tr-sm'
              : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
          }`}
        >
          {text}
        </div>
        <span className="text-[11px] text-slate-500 mt-1">
          {isAI ? 'LeadFlow AI' : 'Lead'}
        </span>
      </div>
    </div>
  )
}

// ─── Typing Indicator ───────────────────────────────────────────────────────

function TypingIndicator({ isAI }: { isAI: boolean }) {
  return (
    <div className={`flex gap-3 ${isAI ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}>
      <div
        className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          isAI
            ? 'bg-emerald-500/20 border border-emerald-500/30'
            : 'bg-slate-700 border border-slate-600'
        }`}
      >
        {isAI ? (
          <Bot className="h-4 w-4 text-emerald-400" />
        ) : (
          <User className="h-4 w-4 text-slate-300" />
        )}
      </div>
      <div
        className={`px-4 py-3 rounded-2xl ${
          isAI
            ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm'
            : 'bg-slate-800 border border-slate-700 rounded-tl-sm'
        }`}
      >
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ─── ROI Card ───────────────────────────────────────────────────────────────

function ROICard() {
  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Your ROI at a Glance</h3>
          <p className="text-xs text-slate-400">Based on industry benchmarks</p>
        </div>
      </div>

      {/* Response time comparison */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">LeadFlow AI response</span>
          <span className="text-sm font-bold text-emerald-400">28 seconds</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-[3%] bg-emerald-500 rounded-full" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Industry average</span>
          <span className="text-sm font-bold text-red-400">4 hours</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-full bg-red-500/60 rounded-full" />
        </div>
      </div>

      {/* Key stat */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
        <p className="text-slate-300 text-sm">
          <span className="text-emerald-400 font-semibold">3 leads like this</span> = 1 appointment per week
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Agents who respond in under 5 minutes are 100x more likely to connect
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">28s</div>
          <div className="text-[11px] text-slate-500">Avg Response</div>
        </div>
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">24/7</div>
          <div className="text-[11px] text-slate-500">Availability</div>
        </div>
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">100%</div>
          <div className="text-[11px] text-slate-500">Personalized</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function ShareableDemoPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [visibleMessages, setVisibleMessages] = useState<number>(0)
  const [showTyping, setShowTyping] = useState(false)
  const [typingIsAI, setTypingIsAI] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setPageState('invalid')
      return
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/admin/demo-link?token=${encodeURIComponent(token)}`)
        const data: DemoTokenData = await res.json()

        if (!data.valid) {
          setPageState('invalid')
          return
        }

        // Increment view count (fire-and-forget)
        fetch('/api/admin/demo-links', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {})

        setPageState('ready')
      } catch {
        setPageState('invalid')
      }
    }

    validateToken()
  }, [token])

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages, showTyping])

  // Conversation playback
  useEffect(() => {
    if (pageState !== 'playing') return

    let cancelled = false
    let elapsed = 0

    // Start timer
    timerRef.current = setInterval(() => {
      elapsed++
      setElapsedSeconds(elapsed)
    }, 1000)

    async function playConversation() {
      for (let i = 0; i < DEMO_CONVERSATION.length; i++) {
        if (cancelled) return
        const msg = DEMO_CONVERSATION[i]

        // Show typing indicator
        if (msg.delayMs > 0) {
          setTypingIsAI(msg.role === 'ai')
          setShowTyping(true)
          await sleep(Math.min(msg.delayMs, 1500))
          if (cancelled) return
        }

        setShowTyping(false)
        setVisibleMessages(i + 1)

        // Pause between messages
        if (i < DEMO_CONVERSATION.length - 1) {
          const nextDelay = DEMO_CONVERSATION[i + 1].delayMs
          if (nextDelay > 0) {
            await sleep(nextDelay - Math.min(nextDelay, 1500))
          }
        }
      }

      if (!cancelled) {
        if (timerRef.current) clearInterval(timerRef.current)
        setPageState('complete')
      }
    }

    playConversation()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pageState])

  function handleStartDemo() {
    setVisibleMessages(0)
    setElapsedSeconds(0)
    setPageState('playing')
  }

  const signupUrl = `/signup/trial?utm_source=demo_link&utm_content=${encodeURIComponent(token)}`

  // ─── Loading state ──────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  // ─── Invalid token ──────────────────────────────────────────────────────

  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Link Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            This demo link is invalid or has expired.
          </p>
          <Link
            href="/signup/trial"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // ─── Ready / Playing / Complete ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-lg font-semibold text-white">LeadFlow AI</span>
          </div>
          <Link
            href={signupUrl}
            className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Live AI Demo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Watch AI Respond to a Lead in Real Time
          </h1>
          <p className="text-base text-slate-400 max-w-xl mx-auto">
            See how LeadFlow AI qualifies and responds to leads in under 30 seconds — while your competitors take hours.
          </p>
        </div>

        {/* Two-column layout: chat + ROI */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Chat panel — 3 cols */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">SMS Conversation</span>
                </div>
                {(pageState === 'playing' || pageState === 'complete') && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono text-emerald-400">{elapsedSeconds}s</span>
                  </div>
                )}
              </div>

              {/* Chat body */}
              <div className="p-5 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4">
                {pageState === 'ready' && (
                  <div className="flex flex-col items-center justify-center h-[340px] text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Ready to See AI in Action?
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-xs">
                      Watch a real AI-powered conversation unfold in real time — just like your leads would experience.
                    </p>
                    <button
                      onClick={handleStartDemo}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Start Demo
                    </button>
                  </div>
                )}

                {(pageState === 'playing' || pageState === 'complete') && (
                  <>
                    {DEMO_CONVERSATION.slice(0, visibleMessages).map((msg, i) => (
                      <ChatBubble
                        key={i}
                        role={msg.role}
                        text={msg.text}
                        animate={i === visibleMessages - 1}
                      />
                    ))}
                    {showTyping && <TypingIndicator isAI={typingIsAI} />}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat footer — completion badge */}
              {pageState === 'complete' && (
                <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-slate-400">
                    Conversation complete — {DEMO_CONVERSATION.length} messages in {elapsedSeconds}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ROI panel — 2 cols */}
          <div className="lg:col-span-2">
            <ROICard />

            {/* CTA card */}
            {pageState === 'complete' && (
              <div className="mt-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-fade-in-up">
                <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">
                  Ready to Never Miss a Lead?
                </h4>
                <p className="text-sm text-slate-400 mb-5">
                  Start your free trial today. No credit card required.
                </p>
                <Link
                  href={signupUrl}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors w-full justify-center"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="mt-3 text-xs text-slate-500">
                  30 days free -- Cancel anytime
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} LeadFlow AI</span>
          <Link
            href={signupUrl}
            className="hover:text-white transition-colors"
          >
            Start Trial
          </Link>
        </div>
      </footer>

      {/* Inline animation styles */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
