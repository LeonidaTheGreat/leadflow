# Design Spec: UC-7 — Dashboard Manual SMS

**Document ID:** DESIGN-UC-7-DASHBOARD-MANUAL-SMS  
**Version:** 1.0  
**Date:** March 25, 2026  
**Status:** Complete — Implementation Reference  
**Use Case:** UC-7 — Dashboard Manual SMS

---

## Overview

The Manual SMS Composer allows real estate agents to send messages directly to leads from the Lead Detail page. This is the primary user-facing interface for lead outreach and follow-up, integrated into the conversation view.

### Purpose
- **Quick response** to new leads within the dashboard
- **AI-assisted** message generation with user control
- **Compliance-aware** (DNC/consent checks before sending)
- **Conversational** — messages appear in a thread with lead history

---

## User Stories

### US-7.1: Send Manual SMS
**As a** real estate agent  
**I want to** type and send a message to a lead directly  
**So that** I can respond quickly without leaving the dashboard  

**Acceptance Criteria:**
- Input field is always visible in the lead detail conversation view
- User types message and presses Send button (or Cmd/Ctrl+Enter)
- Message is sent via Twilio API within 1-2 seconds
- Sent message appears in the conversation thread immediately (optimistic UI)
- Send button shows spinner while in-flight; disabled state prevents double-send

---

### US-7.2: AI-Assisted Drafting
**As a** real estate agent  
**I want to** generate an AI suggestion based on the lead context  
**So that** I can save time and send more professional messages  

**Acceptance Criteria:**
- AI button (purple, labeled "AI" on mobile) is visible next to the input field
- Clicking AI fetches a contextual suggestion based on lead info and conversation history
- Suggestion appears in the input field as editable text
- User can accept, edit, or discard the suggestion before sending
- AI button shows spinner while loading; disabled state prevents rapid-fire requests
- 30-second cooldown after AI request (prevents token waste)

---

### US-7.3: Smart Composer Behavior
**As a** real estate agent  
**I want to** know when a lead cannot receive SMS  
**So that** I don't waste time trying to message opted-out or non-consenting leads  

**Acceptance Criteria:**
- For DNC leads: Composer is disabled, input shows warning placeholder "Lead has opted out"
- For no-consent leads: Composer is disabled, input shows similar warning
- Input field has visual disabled state (reduced opacity, cursor: not-allowed)
- Red warning banner appears above composer explaining opt-out status
- All buttons (AI, Send) are disabled for opted-out leads

---

### US-7.4: Character Counter & Feedback
**As a** real estate agent  
**I want to** see message length feedback  
**So that** I stay within SMS character limits and avoid splitting  

**Acceptance Criteria:**
- Character counter updates in real-time as user types
- SMS standard: 160 characters for single message
- Counter displays remaining characters or message count if over limit
- Visual feedback at 80% capacity (yellow), 100% capacity (red)
- Tooltip or helper text explains multi-part SMS if user exceeds 160 chars

---

### US-7.5: Keyboard Shortcuts
**As a** a power user  
**I want to** use Cmd/Ctrl+Enter to send messages  
**So that** I can work faster without reaching for the mouse  

**Acceptance Criteria:**
- Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) triggers send
- Shortcut works from input field or anywhere in message composer area
- Tooltip shows shortcut hint in the form

---

### US-7.6: Error Handling & Retry
**As a** real estate agent  
**I want to** understand why a send failed  
**So that** I can fix the issue and retry  

**Acceptance Criteria:**
- If Twilio returns an error (invalid number, service down, etc.), error banner shows
- Error message is human-readable (not technical stack trace)
- Error banner has a Close (×) button
- Retryable errors show "Try again" CTA
- Non-retryable errors explain what went wrong (e.g., "Lead number invalid")

---

## Layout & Structure

### Lead Detail Page Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ LeadDetailHeader                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────┐  ┌────────────────────────┐ │
│  │  ConversationView              │  │  Sidebar               │ │
│  │  (2/3 width on desktop)        │  │  (1/3 width)          │ │
│  │                                │  │                       │ │
│  │  [Message Thread]              │  │  QualificationCard    │ │
│  │  • Lead messages               │  │                       │ │
│  │  • Agent responses             │  │  BookingCard          │ │
│  │  • AI-generated messages       │  │                       │ │
│  │                                │  │  QuickActionsCard     │ │
│  │  ┌──────────────────────────┐  │  │                       │ │
│  │  │ [Error Banner] (if error)│  │  │                       │ │
│  │  ├──────────────────────────┤  │  └────────────────────────┘ │
│  │  │ Message Composer         │  │                             │
│  │  │ ┌────────────────────┐   │  │                             │
│  │  │ │ Input field        │   │  │                             │
│  │  │ │ "Type a message..." │   │  │                             │
│  │  │ └────────────────────┘   │  │                             │
│  │  │ [AI] [Send]              │  │                             │
│  │  │ Helper text              │  │                             │
│  │  └──────────────────────────┘  │                             │
│  └────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Message Composer Details
```
┌─────────────────────────────────────────────┐
│ Message Composer                            │
├─────────────────────────────────────────────┤
│                                             │
│ [Message Input]                             │
│ ┌─────────────────────────────────────┐   │
│ │ Type a message...                   │   │
│ │ (160 char limit)                    │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ Buttons Row:                                │
│ ┌──────┐ ┌──────┐ ┌──────┐                │
│ │ [AI] │ │[Send]│ │  Xx  │ Close error   │
│ └──────┘ └──────┘ └──────┘                │
│                                             │
│ Helper Text:                                │
│ "Press Enter to send • Use AI button..."    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Component Specification

### 1. Message Input Field

**Component:** `<input type="text">`

**States:**
- **Enabled** (default): User can type freely
- **Disabled** (sending): Greyed out while message is in-flight
- **Disabled** (opted-out): Greyed out; placeholder shows warning
- **Focus**: Blue ring-2 ring-emerald-500

**Styling:**
- **Baseline:** 40px height (py-2), 3px padding (px-3)
- **Typography:** Text-sm on mobile, text-base on desktop
- **Border:** 1px solid slate-300 (light), slate-700 (dark mode)
- **Background:** White (light), slate-800 (dark mode)
- **Placeholder text:** Semantic based on state
  - Default: "Type a message..."
  - Opted out: "Lead has opted out"
- **Focus state:** Ring-2 ring-emerald-500 (brand green)
- **Disabled state:** opacity-50, cursor-not-allowed

**Placeholder Messaging:**
| State | Placeholder Text |
|-------|-----------------|
| Default | "Type a message..." |
| Opted Out (DNC) | "Lead has opted out" |
| No Consent | "Lead has opted out" |
| Sending | (input keeps value, disabled) |

**Keyboard Behavior:**
- `Enter` key: Triggers send (if not Shift+Enter)
- `Shift+Enter`: Line break (for multiline support, future)
- `Cmd+Enter` (Mac) / `Ctrl+Enter`: Force send
- `Escape`: Clear error banner (if present)

---

### 2. AI Button

**Component:** `<button type="button">`

**Label Options:**
- **Desktop (sm+):** "AI" with Bot icon
- **Mobile:** Bot icon only
- **Loading state:** Spinner icon, text changes to "..."

**Styling:**
- **Background:** bg-purple-500 (brand purple for AI)
- **Hover:** bg-purple-600
- **Disabled:** opacity-50, cursor-not-allowed
- **Size:** py-2 px-3 (mobile), px-4 (desktop)
- **Icon:** lucide-react `<Bot size={16} />`
- **Loading spinner:** lucide-react `<Loader2 size={16} />` with animate-spin

**States:**
- **Ready:** Purple, clickable, shows "AI" label
- **Loading:** Spinner visible, button disabled
- **Cooldown:** Disabled for 30 seconds after successful request (prevents token waste)
- **Disabled:** If opted-out, sending, or in cooldown

**Tooltip:**
- **Normal:** "Generate AI suggestion"
- **Cooldown:** "AI button disabled after timeout (30s cooldown)"

**Behavior:**
- Click triggers `/api/sms/ai-suggest` POST
- Suggested text is populated into input field
- Text is fully editable before send
- No special formatting or markers

**API Payload:**
```json
{
  "lead_id": "uuid",
  "conversation_history": [{ message_body, direction, created_at }, ...]
}
```

**API Response:**
```json
{
  "suggestion": "Thanks for reaching out. I'd love to help with that property."
}
```

---

### 3. Send Button

**Component:** `<button type="submit">`

**Label Options:**
- **Desktop (sm+):** "Send" with Send icon
- **Mobile:** Send icon only
- **Loading state:** Spinner icon, text changes to "..."

**Styling:**
- **Background:** bg-emerald-500 (brand green)
- **Hover:** bg-emerald-600
- **Disabled:** opacity-50, cursor-not-allowed
- **Size:** py-2 px-3 (mobile), px-4 (desktop)
- **Icon:** lucide-react `<Send size={16} />`
- **Loading spinner:** lucide-react `<Loader2 size={16} />` with animate-spin

**States:**
- **Ready:** Green, clickable
- **Sending:** Spinner visible, button disabled (prevents double-send)
- **Disabled:** If input empty, opted-out, or already sending

**Behavior:**
- Form submission via `handleSend()` function
- POST to `/api/sms/send` with `lead_id` and `message`
- Spinner appears immediately while in-flight
- On success: Input clears, page refreshes to show new message
- On failure: Error banner appears, input retains text for retry

**API Payload:**
```json
{
  "lead_id": "uuid",
  "message": "Thanks for reaching out..."
}
```

**API Response (Success):**
```json
{
  "success": true,
  "message_id": "uuid",
  "status": "sent"
}
```

**API Response (Error):**
```json
{
  "success": false,
  "error": "Failed to send message",
  "action": "Check lead phone number and try again",
  "code": "INVALID_PHONE",
  "category": "validation",
  "retryable": false
}
```

---

### 4. Error Banner

**Component:** Alert box above composer

**States:**
- **Visible:** Red background, dismissible with × button
- **Hidden:** Not rendered (error state is null)

**Styling:**
- **Background:** bg-red-50 (light), red-900/20 (dark)
- **Border:** 1px solid red-200 (light), red-800 (dark)
- **Text color:** text-red-800 (light), red-200 (dark)
- **Padding:** p-4
- **Border-radius:** rounded-lg
- **Flex layout:** flex items-start gap-3

**Content:**
```
┌─────────────────────────────────────────────┐
│ [!] Error message text        [×] Close Btn │
│     Action text or suggestion               │
└─────────────────────────────────────────────┘
```

**Error Types & Messages:**

| Error Code | User Message | Action | Retryable |
|-----------|-------------|--------|-----------|
| `INVALID_PHONE` | "Invalid lead phone number" | "Update the lead's phone number" | No |
| `DNC_REGISTERED` | "Lead has opted out" | "Remove from DNC list if consent obtained" | No |
| `TWILIO_ERROR` | "Failed to send message" | "Check your Twilio account and try again" | Yes |
| `NETWORK_ERROR` | "Network error. Please check your connection" | "Try again" | Yes |
| `UNKNOWN` | "Something went wrong" | "Try again or contact support" | Yes |

**Animation:**
- Slide in from top (transform: translateY(-4px) on mount)
- Fade out on close (opacity: 0, transition: 300ms)

---

### 5. Helper Text

**Component:** Small text below buttons

**Content (Default):**
"Press Enter to send • Use AI button for smart reply"

**Content (Opted Out):**
"This lead has opted out and cannot receive SMS messages."

**Styling:**
- **Font size:** text-xs
- **Color:** text-slate-500 (light), text-slate-400 (dark)
- **Padding:** mt-2 (top margin only)

---

## Message Bubble Specification

### Inbound Message (from Lead)
```
┌────────────────────────────┐
│ [Avatar] Message bubble    │
│ 5 minutes ago              │
└────────────────────────────┘
```

**Styling:**
- **Bubble background:** bg-slate-100 (light), bg-slate-800 (dark)
- **Text color:** text-slate-900 (light), text-white (dark)
- **Alignment:** Flex left (justify-start)
- **Avatar:** Circular, 32px (h-8 w-8), bg-slate-200 dark:bg-slate-700
- **Avatar icon:** User icon (lucide-react), slate-600 (light), slate-300 (dark)
- **Padding:** px-4 py-2
- **Border-radius:** rounded-lg
- **Max-width:** xs (320px) on mobile, md (448px) on desktop
- **Word-break:** break-words (handle long text)

**Metadata:**
- **Time:** "5 minutes ago" (humanized via formatDistanceToNow)
- **Font size:** text-xs
- **Color:** text-slate-500 (light), text-slate-400 (dark)
- **Alignment:** Left-aligned

---

### Outbound Message (from Agent)
```
┌────────────────────────────┐
│ Message bubble    [Avatar] │
│ 2 minutes ago               │
│ Delivered • AI              │
└────────────────────────────┘
```

**Styling:**
- **Bubble background:** bg-emerald-500 (brand green)
- **Text color:** text-white
- **Alignment:** Flex right (justify-end)
- **Avatar:** Circular, 32px, bg-emerald-500
- **Avatar icon:** Bot icon or User icon, text-white
- **Padding:** px-4 py-2
- **Border-radius:** rounded-lg
- **Max-width:** Same as inbound
- **Flex order:** flex-row-reverse (avatar on right)

**Metadata:**
- **Time:** "2 minutes ago"
- **Status badge:** "sent", "delivered", or "failed"
  - **Delivered:** text-emerald-600 (light), text-emerald-400 (dark)
  - **Sent:** text-slate-500
  - **Failed:** text-red-600, font-medium
- **AI indicator:** "AI" label with Bot icon (if message was AI-generated)
- **Font size:** text-xs
- **Alignment:** Right-aligned

---

### Failed Message (from Agent)
```
┌────────────────────────────┐
│ Failed! [Avatar]           │
│ Message text (red bg)      │
│ 1 minute ago               │
│ FAILED (in red)            │
└────────────────────────────┘
```

**Styling:**
- **Bubble background:** bg-red-100 (light), bg-red-900/30 (dark)
- **Text color:** text-red-900 (light), text-red-100 (dark)
- **Avatar:** bg-red-500, text-white
- **Avatar icon:** AlertCircle icon (lucide-react)
- **Status:** "Failed" in red, font-medium
- **All other styles:** Same as outbound

**User Action:**
- User can retry by re-sending the same text
- Clicking the failed message does not currently do anything (no edit-in-place yet)
- User must clear input and retype or use copy-paste

---

## Conversation Thread

**Layout:**
- Vertical stack of message bubbles
- Scrollable container with max-height
- Auto-scroll to bottom on new messages (`scrollIntoView`)
- Padding: p-4 on desktop, p-3 on mobile

**Spacing:**
- Gap between bubbles: space-y-4
- Tight clustering for same-direction messages
- Slightly more space between direction changes

**Scroll Behavior:**
- Auto-scroll on mount and when new messages arrive
- Smooth scroll behavior: `behavior: 'smooth'`
- Scroll to bottom reference element: `ref={messagesEndRef}`

---

## Responsive Design

### Mobile (< 640px)
- **Composer:** Full width, stacked buttons (vertical)
- **Input field:** Full width
- **Button labels:** Hidden, icons only (AI button shows Bot icon, Send shows Send icon)
- **Message bubbles:** max-width-xs (320px)
- **Typography:** text-sm
- **Padding:** p-3 (tighter spacing)

### Tablet (640px - 1024px)
- **Composer:** Full width, inline buttons
- **Message bubbles:** max-width-sm (384px)
- **Typography:** text-base
- **Padding:** p-4

### Desktop (> 1024px)
- **Composer:** Full width (in 2/3 column layout)
- **Message bubbles:** max-width-md to max-width-lg (448px - 512px)
- **Button labels:** Visible
- **Padding:** p-4

---

## Accessibility (A11y)

### ARIA & Semantics
- Input field: `<input type="text">` with `aria-label="Message input"`
- Buttons: `<button>` with visible labels or `aria-label` for icon-only buttons
- Error banner: `role="alert"` for screen reader announcements
- Message thread: `role="log"` for live region updates

### Keyboard Navigation
- Tab order: Input → AI button → Send button
- Form submission: Enter key triggers send
- Error close: Escape key or click × button
- All interactive elements are keyboard accessible

### Color Contrast
- Button text: White on emerald/purple (WCAG AA compliant)
- Error text: Dark red on light background (WCAG AA compliant)
- Helper text: Slate-500 on white (meets WCAG AA)

### Focus Indicators
- All buttons: Visible focus ring (ring-2 ring-emerald-500)
- Input field: Visible focus ring (ring-2 ring-emerald-500)
- Error close button: Visible focus ring

---

## Dark Mode Support

The entire composer uses Tailwind's dark mode variants (`dark:`):

| Element | Light | Dark |
|---------|-------|------|
| Input background | white | slate-800 |
| Input border | slate-300 | slate-700 |
| Input text | black | white |
| Button (Send) | emerald-500 | emerald-600 hover |
| Button (AI) | purple-500 | purple-600 hover |
| Message bubble (inbound) | slate-100 bg, slate-900 text | slate-800 bg, white text |
| Message bubble (outbound) | emerald-500 bg, white text | emerald-500 bg, white text |
| Error banner | red-50 bg, red-800 text | red-900/20 bg, red-200 text |
| Helper text | slate-500 | slate-400 |
| Border color | slate-200 | slate-800 |

---

## Compliance & Safety

### DNC (Do Not Call) Handling
- **Detection:** Check `lead.dnc` boolean before rendering input
- **UI:** Disabled input field, red warning banner, helper text
- **Prevention:** Send button is disabled; API also validates on backend

### Consent (SMS Opt-in) Handling
- **Detection:** Check `lead.consent_sms` boolean before rendering input
- **UI:** Disabled input field, yellow warning banner, helper text
- **Prevention:** Send button is disabled; API also validates on backend

### Message Logging
- Every outbound SMS is logged to the `messages` table with:
  - `lead_id`: Recipient lead UUID
  - `message_body`: Full text of message
  - `direction`: "outbound"
  - `ai_generated`: Boolean (true if AI-assisted)
  - `status`: "sent", "delivered", or "failed"
  - `created_at`: Timestamp
  - `twilio_sid`: Twilio message SID for tracking

### Rate Limiting
- AI button: 30-second cooldown to prevent token waste
- Send button: Disabled during in-flight request (prevents double-send)
- Backend API enforces per-lead rate limits (future enhancement)

---

## Performance Considerations

### Optimizations
1. **Optimistic UI:** Message appears immediately after send (before page reload)
2. **Page reload:** Full page refresh fetches updated conversation (simple, reliable)
3. **AI request debouncing:** 30-second cooldown prevents spam
4. **Virtual scrolling:** Future enhancement for very long conversation threads

### Bundle Size
- lucide-react icons: ~40KB (already in dashboard bundle)
- Component code: ~8KB minified
- No additional dependencies required

---

## Implementation Notes

### File Locations
- **Component:** `/product/lead-response/dashboard/components/dashboard/ConversationView.tsx`
- **Styles:** Inline Tailwind classes (no separate CSS file)
- **API routes:**
  - Send: `/api/sms/send`
  - AI suggest: `/api/sms/ai-suggest`
- **Types:** `/lib/types.ts` (Lead, Message, Agent interfaces)

### State Management
- React hooks (`useState`, `useRef`, `useEffect`)
- Local state: `newMessage`, `sending`, `aiLoading`, `error`, `aiDisabledUntil`
- No external state management (Redux, Zustand) required

### Error Handling
- Try-catch block wraps both API calls
- Network errors: Caught by catch block, formatted as human-readable message
- API errors: Parsed from response body; includes `error`, `action`, `code`, `category`, `retryable`

---

## Future Enhancements

### Phase 2 (Backlog)
1. **Rich message editor:** Support bold, italic, emojis
2. **Message templates:** Pre-written message shortcuts
3. **Undo/redo:** Revert recent messages
4. **Message search:** Find messages in conversation
5. **Edit sent messages:** Modify sent messages within 5-minute window
6. **Read receipts:** Real-time delivery status updates via WebSocket

### Phase 3
1. **Bulk SMS:** Send same message to multiple leads
2. **Scheduled SMS:** Send at optimal time (e.g., 9 AM agent's timezone)
3. **Smart routing:** Route leads to best agent based on availability
4. **Conversation AI:** Let AI handle full conversations without agent approval

---

## QA Checklist

- [ ] **Happy path:** User types message, clicks Send, message appears in thread
- [ ] **AI assist:** User clicks AI button, suggestion appears, edits it, sends
- [ ] **Keyboard shortcuts:** Cmd+Enter (Mac) and Ctrl+Enter (Windows) send message
- [ ] **DNC lead:** Input is disabled; warning message is clear
- [ ] **No-consent lead:** Input is disabled; warning message is clear
- [ ] **Error handling:** Twilio error shows banner; user can close and retry
- [ ] **Mobile responsive:** Buttons stack on mobile; text is readable
- [ ] **Dark mode:** All colors are correct in dark mode
- [ ] **Accessibility:** Tab order is correct; error banner is announced
- [ ] **Loading states:** Spinner appears while sending; button disabled
- [ ] **Double-send prevention:** Second click doesn't send again
- [ ] **Cooldown:** AI button is disabled for 30 seconds after request
- [ ] **Character counter:** Real-time counter shows remaining characters
- [ ] **Failed message UI:** Failed messages show red background and AlertCircle icon
- [ ] **AI badge:** Outbound messages show "AI" label if ai_generated=true

---

## Design Rationale

### Color System
- **Emerald (Send):** Trust, action, primary CTA
- **Purple (AI):** Intelligence, assistant, secondary action
- **Red (Error):** Urgency, failure state, stop
- **White/Slate (Default):** Neutral, readable, accessible

### Typography
- **Input placeholder:** Small, hint text (helps user understand what to do)
- **Button labels:** Short, action-oriented ("Send", "AI")
- **Helper text:** Supports discoverability (keyboard shortcuts, AI feature)
- **Metadata:** Subtle, non-intrusive (time, status)

### Layout
- **Input-first:** Message input is the main focus
- **Buttons inline:** Send and AI buttons are together (quick scanning)
- **Error above:** Banner appears at top (interrupts attention, gets read)
- **Thread below:** Conversation history is scrollable (doesn't interfere with input)

### Interaction
- **Immediate feedback:** Spinner appears instantly on click
- **Clear affordance:** Buttons are clearly clickable (color, shape, hover state)
- **Prevent errors:** Disabled states prevent invalid actions (opted-out send)
- **Recoverability:** Error messages explain how to fix (action CTA)

---

## References

- **Component code:** `ConversationView.tsx`
- **Type definitions:** `/lib/types.ts`
- **API documentation:** `/docs/guides/API.md`
- **Figma mockups:** (if applicable)
- **Accessibility guidelines:** WCAG 2.1 Level AA

---

*This spec was created retroactively to document the completed UC-7 implementation. It serves as a reference for developers, designers, and QA engineers working with the Manual SMS Composer.*
