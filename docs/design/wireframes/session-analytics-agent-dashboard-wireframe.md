# Wireframe: Session Analytics for Agent Dashboard

**Task ID:** ba7c5481-775e-4fde-9c9a-79871f4fe0f4
**Date:** 2026-05-29

## Desktop Wireframe (1440)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Pilot Engagement                                         Updated 2m ago      [ Refresh ]     │
│ Track pilot adoption and intervention risk.                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Active in 24h]      [At Risk >72h]      [Avg Sessions/Pilot 7d]      [Login Rate 7d]      │
│      12 / 18               4                        2.7                      67%             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐             │
│ │ Alex Morgan   [At Risk]│ │ Priya Shah   [Active]  │ │ Ben Torres [Low Act.]  │             │
│ │ alex@...                │ │ priya@...              │ │ ben@...                │             │
│ │ Last Login   4d ago     │ │ Last Login   2h ago    │ │ Last Login   52h ago   │             │
│ │ Sessions(7d) 0          │ │ Sessions(7d) 6         │ │ Sessions(7d) 1         │             │
│ │ Top Page     Settings   │ │ Top Page     Leads     │ │ Top Page     Dashboard │             │
│ │ Review conv.            │ │ Review conv.           │ │ Review conv.           │             │
│ └────────────────────────┘ └────────────────────────┘ └────────────────────────┘             │
│                                                                                              │
│ ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐             │
│ │ ...more pilot cards... │ │ ...                    │ │ ...                    │             │
│ └────────────────────────┘ └────────────────────────┘ └────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe (390)

```text
┌────────────────────────────────────┐
│ Pilot Engagement      [Refresh]    │
│ Updated 2m ago                      │
├────────────────────────────────────┤
│ [Active in 24h: 12/18]             │
│ [At Risk >72h: 4]                  │
│ [Avg Sessions/Pilot: 2.7]          │
│ [Login Rate 7d: 67%]               │
├────────────────────────────────────┤
│ Alex Morgan               [At Risk]│
│ alex@...                            │
│ Last Login: 4d ago                 │
│ Sessions (7d): 0                   │
│ Top Page: Settings                 │
│ [Review conversations]             │
├────────────────────────────────────┤
│ Priya Shah                 [Active]│
│ ...                                │
└────────────────────────────────────┘
```

## State Wireframes

### Loading
```text
[Title]
[metric skeleton][metric skeleton][metric skeleton][metric skeleton]
[card skeleton][card skeleton][card skeleton]
```

### Empty
```text
No pilot agents yet
Session analytics will appear once pilots sign up.
[Invite pilot agents]
```

### Error
```text
Unable to load session analytics
Could not fetch pilot usage data.
[Try again]
```
