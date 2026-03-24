/**
 * DESIGN SPEC — SatisfactionPingToggle
 * =======================================
 * This file is a WIREFRAME SPEC for dev to implement.
 * NOT production code. Shows structure, copy, and placement
 * within the existing Settings page Notifications section.
 *
 * Placement: app/settings/page.tsx — appended inside <div id="notifications">
 * See full spec: docs/DESIGN-LEAD-SATISFACTION-FEEDBACK.md
 */

// ─────────────────────────────────────────────
// SPEC: How to integrate into the existing Notifications section
//
// In app/settings/page.tsx, the notifications <div> currently contains:
//   <NotificationToggle label="New Lead Alerts" ... />
//   <NotificationToggle label="SMS Responses" ... />
//   <NotificationToggle label="Weekly Reports" ... />
//   <NotificationToggle label="Integration Alerts" ... />
//
// ADD a visual separator + new sub-section below those four toggles:
// ─────────────────────────────────────────────

/**
 * SPEC: Drop this JSX block inside the existing
 * <div id="notifications"> → <div className="p-6 space-y-4">
 * as the last child:
 *
 * ```tsx
 * {/* ─── AI Feedback sub-section ─────────────────────── * /}
 * <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
 *   <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
 *     AI Feedback
 *   </p>
 *   <SatisfactionPingToggle
 *     enabled={agent.satisfaction_ping_enabled}   {/* loaded from agents table * /}
 *     onChange={handleSatisfactionPingToggle}
 *   />
 * </div>
 * ```
 */

interface SatisfactionPingToggleProps {
  // SPEC: Initial value comes from agents.satisfaction_ping_enabled (boolean, default true)
  enabled: boolean
  // SPEC: Dev should PATCH agents table: UPDATE agents SET satisfaction_ping_enabled = $1 WHERE id = $agentId
  onChange: (enabled: boolean) => void
}

/**
 * SPEC: SatisfactionPingToggle component
 *
 * Visually identical to the existing NotificationToggle component.
 * Dev can reuse NotificationToggle directly:
 *
 * ```tsx
 * <NotificationToggle
 *   label="Satisfaction Check-Ins"
 *   description="Send a brief YES/NO check-in SMS after AI conversations to collect lead feedback"
 *   defaultChecked={agent.satisfaction_ping_enabled}
 *   onChange={handleSatisfactionPingToggle}
 * />
 * ```
 *
 * The only new behavior: onChange must persist the value to
 * agents.satisfaction_ping_enabled in Supabase, not just local state.
 */
export function SatisfactionPingToggle({ enabled, onChange }: SatisfactionPingToggleProps) {
  // SPEC: Renders using the existing NotificationToggle pattern exactly
  // See settings/page.tsx NotificationToggle for the production component

  return (
    // SPEC: Container matches the flex row pattern of NotificationToggle
    <div className="flex items-center justify-between">
      {/* Left: label + description */}
      <div>
        <h4 className="font-medium text-slate-900 dark:text-white">
          Satisfaction Check-Ins
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Send a brief YES/NO check-in SMS after AI conversations to collect lead feedback
        </p>
      </div>

      {/* Right: toggle — same emerald toggle as other notification rows */}
      {/* SPEC: Exact same HTML/CSS as NotificationToggle — emerald-500 when checked */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          aria-label="Enable satisfaction check-in SMS after AI conversations"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500" />
      </label>
    </div>
  )
}

// ─────────────────────────────────────────────
// SPEC: Full section wireframe showing context within Notifications card
// This shows what the Notifications section looks like after the addition.
// ─────────────────────────────────────────────
export function NotificationsSectionWireframe() {
  return (
    // SPEC: This is the existing notifications card (already in settings/page.tsx)
    // showing where the new toggle fits
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Existing header — unchanged */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          {/* Bell icon */}
          <span aria-hidden="true">🔔</span>
          Notification Preferences
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Choose how you want to be notified about lead activities
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* SPEC: Existing toggles — no changes */}
        {/* <NotificationToggle label="New Lead Alerts" ... /> */}
        {/* <NotificationToggle label="SMS Responses" ... /> */}
        {/* <NotificationToggle label="Weekly Reports" ... /> */}
        {/* <NotificationToggle label="Integration Alerts" ... /> */}

        {/* SPEC: NEW — AI Feedback sub-section with visual separator */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
          {/* Sub-section label */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
            AI Feedback
          </p>

          {/* The new toggle */}
          <SatisfactionPingToggle
            enabled={true} // SPEC: replace with agent.satisfaction_ping_enabled from API
            onChange={(val) => {
              // SPEC: dev PATCHes Supabase: UPDATE agents SET satisfaction_ping_enabled = val WHERE id = agentId
              console.log('satisfaction_ping_enabled:', val)
            }}
          />
        </div>
      </div>
    </div>
  )
}
