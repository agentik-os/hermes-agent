import {
  atom,
  Badge,
  Codicon,
  Contribute,
  host,
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  TITLEBAR_AREAS,
  useValue
} from '@hermes/plugin-sdk'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'

const ID = 'agk-surface-prototype'
const ROUTE = '/agk-prototype'
const STYLE_ID = 'agk-surface-prototype-style'

export const surfaceSpecs = Object.freeze({
  collective: {
    id: 'collective',
    label: 'Collective',
    layout: 'network-hub',
    eyebrow: 'Human network',
    title: 'Connect people and collaboration',
    summary: 'Find operators, exchange systems, join spaces and turn relationships into coordinated action.',
    nav: ['Home', 'Feed', 'Spaces', 'Chats', 'Members', 'Events', 'Live'],
    metrics: [
      ['Your network', '523 members'],
      ['Active now', '42'],
      ['Upcoming', '3 events']
    ],
    primary: [
      {
        title: 'Agentic Engineering',
        meta: '23 replies',
        body: 'Operators are sharing governed Runtime patterns and complete OS examples.',
        action: 'Open discussion'
      },
      {
        title: 'People to meet',
        meta: '4 strong matches',
        body: 'Builders, CAIOs and domain experts aligned with the AGK Hermes mission.',
        action: 'Review matches'
      },
      {
        title: 'Live now',
        meta: '14 participants',
        body: 'Agentic Coding room with screen sharing, chat, resources and an AI assistant.',
        action: 'Join room'
      }
    ],
    activity: ['Research OS v2 shared', 'New Builder group formed', 'Workshop starts in 45 min'],
    context: [
      ['Active space', 'AGK Builders'],
      ['Relationship view', 'Collaborators'],
      ['Reputation signal', 'Verified systems']
    ]
  },
  learn: {
    id: 'learn',
    label: 'Learn',
    layout: 'learning-path',
    eyebrow: 'Capability development',
    title: 'Learn the skills',
    summary: 'Turn guided learning into verified capability and reusable systems.',
    nav: ['Home', 'My Learning', 'Paths', 'Courses', 'Labs', 'Challenges', 'Certifications'],
    metrics: [
      ['Active path', 'AI Organization Builder'],
      ['Progress', '68%'],
      ['Evidence', '12 verified']
    ],
    primary: [
      {
        title: 'Continue your path',
        meta: 'Module 7 of 10',
        body: 'Design a governed multi-agent operating model and open the result in Build.',
        action: 'Resume lesson'
      },
      {
        title: 'Learning cohort',
        meta: '3 useful discussions',
        body: 'Cohort conversations live in Collective while Learn preserves the guided path.',
        action: 'Open in Collective'
      }
    ],
    activity: ['Lab evidence attached', 'Skill claim verified', 'Build bridge ready'],
    context: [
      ['Current cohort', 'Organization Builders'],
      ['Tutor', 'Architecture Tutor'],
      ['Next milestone', 'Blueprint review']
    ]
  },
  build: {
    id: 'build',
    label: 'Build',
    layout: 'operating-center',
    eyebrow: 'Outcome operating center',
    title: 'Build the systems',
    summary: 'Coordinate the Project, its intelligence organization, active work and Runtime.',
    nav: ['Overview', 'Work', 'Organization', 'Intelligence', 'Runtime'],
    modes: ['Operate', 'Design', 'Code', 'Inspect'],
    metrics: [
      ['Project', 'AGK Hermes Upgrade'],
      ['Mission health', 'On track'],
      ['Active runs', '7']
    ],
    primary: [
      {
        title: 'Mission control',
        meta: '4 tasks in progress',
        body: 'Runtime adapter, permission boundary and product shell remain the critical path.',
        action: 'Inspect work'
      },
      {
        title: 'Organization map',
        meta: '1 Oracle, 3 Teams',
        body: 'Architecture, Runtime and Product teams are aligned around one outcome.',
        action: 'Open Canvas'
      },
      {
        title: 'Runtime posture',
        meta: 'Hermes connected',
        body: 'Current view is a visual prototype. Governed execution is not enabled.',
        action: 'Inspect Runtime'
      }
    ],
    activity: ['Architecture review passed', '31 mutation tests green', 'Build Gate remains closed'],
    context: [
      ['Oracle', 'AGK Build Oracle'],
      ['Outcome', 'Governed Hermes foundation'],
      ['Environment', 'Local macOS prototype']
    ]
  },
  deals: {
    id: 'deals',
    label: 'Deals',
    layout: 'commercial-pipeline',
    eyebrow: 'Economic action',
    title: 'Turn capability into business',
    summary: 'Qualify opportunities, shape engagements and connect delivery to Build.',
    nav: ['Pipeline', 'Opportunities', 'Engagements', 'Contracts', 'Reviews'],
    metrics: [
      ['Qualified pipeline', '€184k'],
      ['Open opportunities', '9'],
      ['Conversion', '31%']
    ],
    primary: [
      {
        title: 'Northstar AI transformation',
        meta: 'Proposal requested',
        body: 'Strong match for the Automation Workforce and Runtime Governance capability.',
        action: 'Shape engagement'
      },
      {
        title: 'Operator enablement cohort',
        meta: 'Discovery',
        body: 'Learn evidence supports a phased advisory and implementation engagement.',
        action: 'Review fit'
      }
    ],
    activity: ['Opportunity qualified', 'Delivery Project draft created', 'Contract review requested'],
    context: [
      ['Account', 'Northstar Systems'],
      ['Introducer', 'AGK Community'],
      ['Next action', 'Scope workshop']
    ]
  },
  evolve: {
    id: 'evolve',
    label: 'Evolve',
    layout: 'operator-evolution',
    eyebrow: 'Personal evolution',
    title: 'Improve the operator',
    summary: 'Align goals, decisions, routines and Personal OS intelligence without weakening Self privacy.',
    nav: ['Today', 'Goals', 'Strategy', 'Decisions', 'Personal OS', 'Journal', 'Progress', 'Insights'],
    metrics: [
      ['Focus', 'Ship the prototype'],
      ['Weekly alignment', '82%'],
      ['Private notes', '14']
    ],
    primary: [
      {
        title: 'Today command center',
        meta: '3 commitments',
        body: 'Review the five-universe prototype, choose the next implementation boundary and protect deep-work time.',
        action: 'Open today'
      },
      {
        title: 'Decision journal',
        meta: 'Private by default',
        body: 'The Hermes prototype decision is scoped and cannot grant Build authority.',
        action: 'Review decision'
      }
    ],
    activity: ['Morning review completed', 'One decision captured', 'No cross-universe grants'],
    context: [
      ['Privacy zone', 'Self only'],
      ['Personal OS', 'Operator OS'],
      ['Next review', 'Friday 16:00']
    ]
  }
})

export const prototypeSurface = atom('build')
export const prototypeBuildMode = atom('Operate')

export function selectSurface(id) {
  if (!Object.hasOwn(surfaceSpecs, id)) return false
  prototypeSurface.set(id)
  return true
}

export function selectBuildMode(mode) {
  if (!surfaceSpecs.build.modes.includes(mode)) return false
  prototypeBuildMode.set(mode)
  return true
}

function SurfaceSwitcher() {
  const active = useValue(prototypeSurface)

  return jsx('div', {
    className: 'agk-prototype-switcher',
    role: 'tablist',
    'aria-label': 'AGK surface',
    children: Object.values(surfaceSpecs).map(surface =>
      jsx(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': active === surface.id,
          className: 'agk-prototype-surface-pill',
          'data-active': active === surface.id ? 'true' : 'false',
          'data-agk-surface': surface.id,
          onClick: () => selectSurface(surface.id),
          children: surface.label
        },
        surface.id
      )
    )
  })
}

function BuildModeSwitcher() {
  const active = useValue(prototypeBuildMode)

  return jsx('div', {
    className: 'agk-prototype-build-modes',
    role: 'tablist',
    'aria-label': 'Build mode',
    children: surfaceSpecs.build.modes.map(mode =>
      jsx(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': active === mode,
          className: 'agk-prototype-build-mode',
          'data-active': active === mode ? 'true' : 'false',
          'data-agk-build-mode': mode.toLowerCase(),
          onClick: () => selectBuildMode(mode),
          children: mode
        },
        mode
      )
    )
  })
}

function Metric({ label, value }) {
  return jsxs('div', {
    className: 'agk-prototype-metric',
    children: [
      jsx('span', { className: 'agk-prototype-muted', children: label }),
      jsx('strong', { children: value })
    ]
  })
}

function PrimaryCard({ item, index }) {
  return jsxs('article', {
    className: 'agk-prototype-card',
    'data-card-index': String(index),
    children: [
      jsxs('div', {
        className: 'agk-prototype-card-heading',
        children: [
          jsx('h3', { children: item.title }),
          jsx(Badge, { variant: 'muted', size: 'xs', children: item.meta })
        ]
      }),
      jsx('p', { children: item.body }),
      jsx('button', {
        type: 'button',
        className: 'agk-prototype-link',
        onClick: () => host.notify({ kind: 'info', message: `${item.action} is a visual prototype action.` }),
        children: item.action
      })
    ]
  })
}

function ContextRail({ spec }) {
  return jsxs('aside', {
    className: 'agk-prototype-context',
    children: [
      jsxs('div', {
        className: 'agk-prototype-context-heading',
        children: [
          jsx('span', { children: 'Context' }),
          jsx(Codicon, { name: 'inspect' })
        ]
      }),
      jsx('div', {
        className: 'agk-prototype-context-list',
        children: spec.context.map(([label, value]) =>
          jsxs(
            'div',
            {
              className: 'agk-prototype-context-row',
              children: [
                jsx('span', { className: 'agk-prototype-muted', children: label }),
                jsx('strong', { children: value })
              ]
            },
            label
          )
        )
      }),
      jsxs('div', {
        className: 'agk-prototype-notice',
        children: [
          jsx(Badge, { variant: 'warn', size: 'xs', children: 'Visual spike' }),
          jsx('p', { children: 'No AGK domain state or governed Runtime is connected.' })
        ]
      })
    ]
  })
}

function AgkPrototypePage() {
  const active = useValue(prototypeSurface)
  const spec = surfaceSpecs[active]

  return jsxs(Fragment, {
    children: [
      jsx(Contribute, {
        area: TITLEBAR_AREAS.center,
        id: 'agk-prototype:surface-switcher',
        children: jsx(SurfaceSwitcher, {})
      }),
      jsxs('div', {
        className: `agk-prototype-root agk-prototype-layout-${spec.layout}`,
        'data-agk-layout': spec.layout,
        'data-agk-active-surface': spec.id,
        children: [
          jsxs('aside', {
            className: 'agk-prototype-nav',
            children: [
              jsxs('div', {
                className: 'agk-prototype-brand',
                children: [
                  jsx('span', { className: 'agk-prototype-mark', children: 'A' }),
                  jsxs('div', {
                    children: [
                      jsx('strong', { children: 'AGK' }),
                      jsx('span', { children: 'Hermes prototype' })
                    ]
                  })
                ]
              }),
              jsx('nav', {
                'aria-label': `${spec.label} navigation`,
                children: spec.nav.map((item, index) =>
                  jsx(
                    'button',
                    {
                      type: 'button',
                      className: 'agk-prototype-nav-item',
                      'data-active': index === 0 ? 'true' : 'false',
                      onClick: () => host.notify({ kind: 'info', message: `${item} is not wired in this visual spike.` }),
                      children: item
                    },
                    item
                  )
                )
              }),
              jsx('div', {
                className: 'agk-prototype-gate',
                children: 'Build Gate · Closed'
              })
            ]
          }),
          jsxs('main', {
            className: 'agk-prototype-main',
            children: [
              jsxs('header', {
                className: 'agk-prototype-header',
                children: [
                  jsxs('div', {
                    children: [
                      jsx('span', { className: 'agk-prototype-eyebrow', children: spec.eyebrow }),
                      jsx('h1', { children: spec.title }),
                      jsx('p', { children: spec.summary })
                    ]
                  }),
                  jsx(Badge, { variant: 'outline', children: spec.label })
                ]
              }),
              spec.modes ? jsx(BuildModeSwitcher, {}) : null,
              jsx('section', {
                className: 'agk-prototype-metrics',
                'aria-label': `${spec.label} metrics`,
                children: spec.metrics.map(([label, value]) => jsx(Metric, { label, value }, label))
              }),
              jsx('section', {
                className: 'agk-prototype-primary',
                children: spec.primary.map((item, index) => jsx(PrimaryCard, { item, index }, item.title))
              }),
              jsxs('section', {
                className: 'agk-prototype-activity',
                children: [
                  jsx('h2', { children: 'Latest signal' }),
                  jsx('div', {
                    children: spec.activity.map(item =>
                      jsxs(
                        'div',
                        {
                          className: 'agk-prototype-activity-row',
                          children: [
                            jsx('span', { className: 'agk-prototype-activity-dot' }),
                            jsx('span', { children: item })
                          ]
                        },
                        item
                      )
                    )
                  })
                ]
              })
            ]
          }),
          jsx(ContextRail, { spec })
        ]
      })
    ]
  })
}

function installStyles(ctx) {
  if (typeof document === 'undefined') return
  document.getElementById(STYLE_ID)?.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.agk-prototype-switcher{display:flex;align-items:center;gap:2px;padding:0;border-radius:999px;background:transparent;box-shadow:none}
.agk-prototype-surface-pill{appearance:none;border:0;background:transparent;color:var(--ui-text-tertiary);font:inherit;font-size:12.5px;font-weight:560;letter-spacing:-0.01em;line-height:1;padding:7px 13px;border-radius:999px;cursor:pointer;transition:background 140ms ease,color 140ms ease,box-shadow 140ms ease}
.agk-prototype-surface-pill:hover:not([data-active='true']){background:color-mix(in srgb,var(--ui-text-primary) 5%,transparent);color:var(--ui-text-secondary)}
.agk-prototype-surface-pill:focus-visible{outline:2px solid color-mix(in srgb,var(--ui-text-primary) 28%,transparent);outline-offset:2px}
.agk-prototype-surface-pill[data-active='true']{background:var(--ui-surface-background);color:var(--ui-text-primary);font-weight:640;box-shadow:0 1px 2px color-mix(in srgb,var(--ui-text-primary) 10%,transparent),0 0 0 0.5px color-mix(in srgb,var(--ui-text-primary) 8%,transparent)}
.agk-prototype-root{display:grid;grid-template-columns:190px minmax(0,1fr) 250px;height:100%;min-height:0;overflow:hidden;background:var(--ui-surface-background);color:var(--ui-text-primary)}
.agk-prototype-nav,.agk-prototype-context{min-height:0;background:var(--ui-widget-surface-background);padding:18px}
.agk-prototype-nav{display:flex;flex-direction:column;gap:20px;border-right:1px solid var(--ui-stroke-tertiary)}
.agk-prototype-context{border-left:1px solid var(--ui-stroke-tertiary);overflow:auto}
.agk-prototype-brand{display:flex;align-items:center;gap:10px}
.agk-prototype-brand>div{display:flex;flex-direction:column;gap:1px}
.agk-prototype-brand>div span{font-size:10px;color:var(--ui-text-tertiary)}
.agk-prototype-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:var(--ui-accent);color:var(--ui-surface-background);font-weight:800}
.agk-prototype-nav nav{display:flex;flex-direction:column;gap:3px}
.agk-prototype-nav-item{appearance:none;border:0;background:transparent;color:var(--ui-text-secondary);font:inherit;font-size:12px;text-align:left;padding:8px 10px;border-radius:9px;cursor:pointer}
.agk-prototype-nav-item:hover,.agk-prototype-nav-item[data-active='true']{background:var(--ui-bg-quaternary);color:var(--ui-text-primary)}
.agk-prototype-gate{margin-top:auto;padding:8px 10px;border-radius:9px;background:var(--ui-bg-quaternary);color:var(--ui-text-tertiary);font-size:10px;font-weight:650}
.agk-prototype-main{min-width:0;overflow:auto;padding:28px 30px 40px}
.agk-prototype-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}
.agk-prototype-header h1{font-size:25px;line-height:1.12;margin:5px 0 7px;letter-spacing:-.025em}
.agk-prototype-header p{max-width:700px;margin:0;color:var(--ui-text-secondary);font-size:13px;line-height:1.55}
.agk-prototype-eyebrow{color:var(--ui-accent);font-size:10px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}
.agk-prototype-build-modes{display:flex;align-items:center;gap:4px;margin:-8px 0 18px;padding-bottom:10px}
.agk-prototype-build-mode{appearance:none;border:0;background:transparent;color:var(--ui-text-tertiary);font:inherit;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 10px;border-radius:8px;cursor:pointer}
.agk-prototype-build-mode:hover,.agk-prototype-build-mode[data-active='true']{background:var(--ui-bg-quaternary);color:var(--ui-text-primary)}
.agk-prototype-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
.agk-prototype-metric{display:flex;flex-direction:column;gap:5px;padding:13px 14px;border-radius:13px;background:var(--ui-widget-surface-background);box-shadow:inset 0 0 0 1px var(--ui-stroke-tertiary)}
.agk-prototype-metric strong{font-size:14px}
.agk-prototype-muted{color:var(--ui-text-tertiary);font-size:10px}
.agk-prototype-primary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.agk-prototype-card{display:flex;min-height:130px;flex-direction:column;gap:10px;padding:17px;border-radius:15px;background:var(--ui-widget-surface-background);box-shadow:var(--shadow-nous),inset 0 0 0 1px var(--ui-stroke-tertiary)}
.agk-prototype-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.agk-prototype-card h3{margin:0;font-size:14px}
.agk-prototype-card p{margin:0;color:var(--ui-text-secondary);font-size:12px;line-height:1.5}
.agk-prototype-link{appearance:none;align-self:flex-start;margin-top:auto;border:0;background:transparent;color:var(--ui-accent);font:inherit;font-size:11px;font-weight:700;padding:0;cursor:pointer}
.agk-prototype-activity{margin-top:18px;padding-top:2px}
.agk-prototype-activity h2{margin:0 0 10px;font-size:12px}
.agk-prototype-activity-row{display:flex;align-items:center;gap:9px;padding:6px 0;color:var(--ui-text-secondary);font-size:11px}
.agk-prototype-activity-dot{width:6px;height:6px;border-radius:999px;background:var(--ui-accent);opacity:.75}
.agk-prototype-context-heading{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:16px}
.agk-prototype-context-list{display:flex;flex-direction:column;gap:14px}
.agk-prototype-context-row{display:flex;flex-direction:column;gap:4px}
.agk-prototype-context-row strong{font-size:11px;line-height:1.4}
.agk-prototype-notice{margin-top:22px;padding:13px;border-radius:13px;background:var(--ui-bg-quaternary)}
.agk-prototype-notice p{margin:9px 0 0;color:var(--ui-text-secondary);font-size:10px;line-height:1.45}
.agk-prototype-layout-operating-center .agk-prototype-primary{grid-template-columns:repeat(2,minmax(0,1fr))}
.agk-prototype-layout-operating-center .agk-prototype-card:first-child{grid-row:span 2;min-height:272px}
.agk-prototype-layout-network-hub .agk-prototype-primary{grid-template-columns:repeat(2,minmax(0,1fr))}
.agk-prototype-layout-network-hub .agk-prototype-card:first-child{grid-row:span 2;min-height:272px}
.agk-prototype-layout-network-hub .agk-prototype-card:not(:first-child){min-height:130px}
.agk-prototype-layout-learning-path .agk-prototype-primary{grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr)}
.agk-prototype-layout-learning-path .agk-prototype-card:first-child{min-height:210px}
.agk-prototype-layout-commercial-pipeline .agk-prototype-primary{grid-template-columns:1fr}
.agk-prototype-layout-commercial-pipeline .agk-prototype-card{min-height:116px}
.agk-prototype-layout-operator-evolution .agk-prototype-main{max-width:980px;width:100%;margin:0 auto}
.agk-prototype-layout-operator-evolution .agk-prototype-primary{grid-template-columns:1fr}
@media(max-width:1000px){.agk-prototype-root{grid-template-columns:165px minmax(0,1fr)}.agk-prototype-context{display:none}}
@media(max-width:720px){.agk-prototype-root{grid-template-columns:1fr}.agk-prototype-nav{display:none}.agk-prototype-main{padding:22px 18px}.agk-prototype-metrics,.agk-prototype-primary{grid-template-columns:1fr!important}}
`
  document.head.append(style)
  ctx.onDispose(() => style.remove())
}

export default {
  id: ID,
  name: 'AGK Surface Prototype',
  description: 'Visual spike for the ratified Collective, Learn, Build, Deals and Evolve shell on Hermes Desktop.',
  register(ctx) {
    installStyles(ctx)
    ctx.registerMany([
      {
        id: 'page',
        area: ROUTES_AREA,
        title: 'AGK Prototype',
        data: { path: ROUTE },
        render: () => jsx(AgkPrototypePage, {})
      },
      {
        id: 'nav',
        area: SIDEBAR_NAV_AREA,
        order: 5,
        data: { codicon: 'project', label: 'AGK Prototype', path: ROUTE }
      },
      {
        id: 'open',
        area: PALETTE_AREA,
        data: {
          id: 'agk.prototype.open',
          label: 'AGK Prototype: Open surface shell',
          keywords: ['agk', 'collective', 'learn', 'build', 'deals', 'evolve', 'prototype'],
          run: () => host.navigate(ROUTE)
        }
      }
    ])
  }
}
