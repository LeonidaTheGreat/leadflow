import Link from 'next/link'

type LegalFooterProps = {
  className?: string
}

export function LegalFooter({ className = '' }: LegalFooterProps) {
  return (
    <footer className={className}>
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="text-center sm:text-left">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <p className="mt-1">Operated by Imagine Squared · landyourleads.com</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
