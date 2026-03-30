import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import './index.css'

const CELL_SIZE = 24
const FILL_CHANCE = 0.18

const baseModels = [
  { name: 'claude-3.5-sonnet', provider: 'Anthropic', icon: 'claude.svg',   baseScore: 91, baseCost: 72, baseSpeed: 55, baseMatrix: 88 },
  { name: 'gpt-o3',            provider: 'OpenAI',    icon: 'openai.svg',    baseScore: 87, baseCost: 48, baseSpeed: 40, baseMatrix: 80 },
  { name: 'gpt-4o',            provider: 'OpenAI',    icon: 'openai.svg',    baseScore: 82, baseCost: 63, baseSpeed: 74, baseMatrix: 75 },
  { name: 'claude-3-opus',     provider: 'Anthropic', icon: 'claude.svg',    baseScore: 79, baseCost: 55, baseSpeed: 50, baseMatrix: 71 },
  { name: 'gemini-2.0-pro',    provider: 'Google',    icon: 'gemini.svg',    baseScore: 74, baseCost: 80, baseSpeed: 82, baseMatrix: 68 },
  { name: 'deepseek-r1',       provider: 'DeepSeek',  icon: 'deepseek.svg',  baseScore: 69, baseCost: 91, baseSpeed: 68, baseMatrix: 65 },
  { name: 'grok-3',            provider: 'xAI',       icon: 'grok.svg',      baseScore: 58, baseCost: 70, baseSpeed: 91, baseMatrix: 54 },
  { name: 'gemini-2.5-flash',  provider: 'Google',    icon: 'gemini.svg',    baseScore: 51, baseCost: 95, baseSpeed: 97, baseMatrix: 49 },
]

const Icons = {
  accuracy: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5"/>
      <path d="m22 10-7.5 7.5L13 16"/>
    </svg>
  ),
  cost: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  speed: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4l2 2"/>
      <polyline points="10 2 14 2"/>
    </svg>
  ),
  matrix: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  cubes: (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
      <path d="m7.5 4.21 9 5.19"/>
      <path d="m7.5 19.79 9-5.19"/>
    </svg>
  )
}

const METRICS = [
  { id: 'score',  label: 'Accuracy', icon: Icons.accuracy, key: 'baseScore' },
  { id: 'cost',   label: 'Cost',     icon: Icons.cost,     key: 'baseCost'  },
  { id: 'speed',  label: 'Speed',    icon: Icons.speed,    key: 'baseSpeed' },
  { id: 'matrix', label: 'Matrix',   icon: Icons.matrix,   key: 'baseMatrix'},
]

const tabInfo = {
  general: {
    title: 'General Accuracy Distribution',
    desc: 'Overall success rate across all 127 redstone circuit challenges',
    icon: 'redstone',
    heading: 'General Overview',
    body: 'The general benchmark aggregates scores across all test categories — spatial reasoning, circuit logic, tick timing, and complex builds. Models are placed in a live Minecraft 3D environment and must build working redstone contraptions from scratch.',
  },
  logic: {
    title: 'Logic Gate Accuracy',
    desc: 'Success rate on AND, OR, NOT, and XOR gate construction',
    icon: 'repeater',
    heading: 'Circuit Logic',
    body: 'Tests the model\'s ability to construct fundamental logic gates using redstone. Minecraft redstone has unique constraints: signals decay over 15 blocks, repeaters add tick delays, and comparators enable analog signal processing. Models must reason about these rules to build functional circuits.',
  },
  static: {
    title: 'Static Movement Accuracy',
    desc: 'Piston, door, and trapdoor mechanism construction',
    icon: 'piston',
    heading: 'Static Movement',
    body: 'Evaluates contraptions that use pistons, sticky pistons, and slime/honey blocks to create mechanical movement. Models must understand block pushing limits (12 blocks max), quasi-connectivity, and the unique interaction between pistons and different block types.',
  },
  dynamic: {
    title: 'Dynamic Movement Accuracy',
    desc: 'Flying machines, item transport, and state machines',
    icon: 'slime',
    heading: 'Dynamic Movement',
    body: 'The most complex category — models must build self-propelling flying machines, item sorting systems, and multi-state contraptions. This requires understanding of observer blocks, BUD switches, and precise tick-level timing across moving components.',
  },
}

function randomizeScores() {
  return baseModels.map(m => ({
    ...m,
    score:  Math.max(15, Math.min(97, m.baseScore  + Math.floor((Math.random() - 0.5) * 24))),
    cost:   Math.max(15, Math.min(97, m.baseCost   + Math.floor((Math.random() - 0.5) * 24))),
    speed:  Math.max(15, Math.min(97, m.baseSpeed  + Math.floor((Math.random() - 0.5) * 24))),
    matrix: Math.max(15, Math.min(97, m.baseMatrix + Math.floor((Math.random() - 0.5) * 24))),
  }))
}

function GridBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function draw() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      const cols = Math.ceil(w / CELL_SIZE)
      const rows = Math.ceil(h / CELL_SIZE)

      ctx.fillStyle = '#0d0d0d'
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() < FILL_CHANCE) {
            ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
          }
        }
      }
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  return <canvas ref={canvasRef} className="bg-grid" />
}

function getRankClass(i) {
  if (i === 0) return 'rank-1'
  if (i === 1) return 'rank-2'
  if (i === 2) return 'rank-3'
  return 'rank-default'
}

/* ---- Shared mouse-reactive hook ---- */
function useMouseRotation(defaultX, defaultY, rangeX = 15, rangeY = 20, spinTrigger) {
  const containerRef = useRef(null)
  const [rot, setRot] = useState({ x: defaultX, y: defaultY })
  const firstTriggerRef = useRef(true)
  const [spinOffset, setSpinOffset] = useState(0)

  useEffect(() => {
    if (firstTriggerRef.current) {
      firstTriggerRef.current = false
      return
    }
    setSpinOffset(prev => prev + 180)
  }, [spinTrigger])

  useEffect(() => {
    let mouseDx = 0
    let mouseDy = 0
    let scrollYOffset = 0

    function update() {
      setRot({
        x: defaultX - mouseDy * rangeX,
        y: defaultY + mouseDx * rangeY + scrollYOffset
      })
    }

    function handleMouseMove(e) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      mouseDx = (e.clientX - cx) / rect.width
      mouseDy = (e.clientY - cy) / rect.height
      update()
    }

    function handleScroll() {
      scrollYOffset = window.scrollY * 0.25
      update()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [defaultX, defaultY, rangeX, rangeY])

  return { containerRef, rot: { x: rot.x, y: rot.y + spinOffset } }
}

/* ---- Shared Box helper ---- */
function Box({ w, h, d, textures, style: extraStyle, faceStyle }) {
  const hw = w / 2, hh = h / 2, hd = d / 2
  return (
    <div className="p-box" style={{ width: w, height: h, ...extraStyle }}>
      {/* Front */}
      <div className="p-face" style={{
        width: w, height: h,
        top: 0, left: 0,
        transform: `translate3d(0, 0, ${hd}px)`,
        backgroundImage: `url(${textures.front})`,
        backgroundSize: `${w}px ${h}px`,
        ...faceStyle,
      }} />
      {/* Back */}
      <div className="p-face" style={{
        width: w, height: h,
        top: 0, left: 0,
        transform: `translate3d(0, 0, ${-hd}px) rotateY(180deg)`,
        backgroundImage: `url(${textures.back})`,
        backgroundSize: `${w}px ${h}px`,
        ...faceStyle,
      }} />
      {/* Right */}
      <div className="p-face" style={{
        width: d, height: h,
        top: 0, left: hw - hd,
        transform: `rotateY(90deg) translateZ(${hw}px)`,
        backgroundImage: `url(${textures.right})`,
        backgroundSize: `${d}px ${h}px`,
        ...faceStyle,
      }} />
      {/* Left */}
      <div className="p-face" style={{
        width: d, height: h,
        top: 0, left: hw - hd,
        transform: `rotateY(-90deg) translateZ(${hw}px)`,
        backgroundImage: `url(${textures.left})`,
        backgroundSize: `${d}px ${h}px`,
        ...faceStyle,
      }} />
      {/* Top */}
      <div className="p-face" style={{
        width: w, height: d,
        top: hh - hd, left: 0,
        transform: `rotateX(90deg) translateZ(${hh}px)`,
        backgroundImage: `url(${textures.top})`,
        backgroundSize: `${w}px ${d}px`,
        ...faceStyle,
      }} />
      {/* Bottom */}
      <div className="p-face" style={{
        width: w, height: d,
        top: hh - hd, left: 0,
        transform: `rotateX(-90deg) translateZ(${hh}px)`,
        backgroundImage: `url(${textures.bottom})`,
        backgroundSize: `${w}px ${d}px`,
        ...faceStyle,
      }} />
    </div>
  )
}

/* ---- Interactive 3D Redstone Icon (thin slab) ---- */
function RedstoneIcon({ spinTrigger }) {
  const { containerRef, rot } = useMouseRotation(-20, 25, 15, 20, spinTrigger)

  const U = 6
  const W = 16 * U
  const D = 1 * U

  return (
    <div ref={containerRef} className="sidebar-icon-wrap">
      <div
        className="piston-3d redstone-glow"
        style={{
          width: W, height: W,
          '--persp': '400px',
          '--rotX': `${rot.x}deg`,
          '--rotY': `${rot.y}deg`,
        }}
      >
        <Box w={W} h={W} d={D}
          textures={{
            front: 'redstone.png', back: 'redstone.png',
            left: 'redstone.png',  right: 'redstone.png',
            top: 'redstone.png',   bottom: 'redstone.png',
          }}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      </div>
    </div>
  )
}

/* ---- Interactive 3D Repeater ---- */
function RepeaterIcon({ spinTrigger }) {
  const { containerRef, rot } = useMouseRotation(-30, 30, 15, 20, spinTrigger)

  const U = 5
  const W = 16 * U
  const slabH = 2 * U

  const torchBodyW = 2 * U
  const torchTexW = 4 * U
  const torchBodyH = 6 * U
  const torchTexH = 7 * U

  const totalH = slabH + torchBodyH

  const torch1Z = 4 * U
  const torch2Z = 11 * U

  function Torch({ offsetX, offsetZ }) {
    const overflow = 1 * U
    const hd = torchBodyW / 2

    return (
      <div className="p-box" style={{
        width: torchTexW, height: torchTexH,
        position: 'absolute',
        bottom: slabH,
        left: offsetX - overflow,
      }}>
        <div className="p-face" style={{
          width: torchTexW, height: torchTexH, top: 0, left: 0,
          transform: `translate3d(${0}px, 0, ${offsetZ + hd}px)`,
          backgroundImage: `url(repeater/redstone_torch.png)`,
          backgroundSize: `${torchTexW}px ${torchTexH}px`,
        }} />
        <div className="p-face" style={{
          width: torchTexW, height: torchTexH, top: 0, left: 0,
          transform: `translate3d(${0}px, 0, ${offsetZ - hd}px) rotateY(180deg)`,
          backgroundImage: `url(repeater/redstone_torch.png)`,
          backgroundSize: `${torchTexW}px ${torchTexH}px`,
        }} />
        <div className="p-face" style={{
          width: torchTexW, height: torchTexH, top: 0, left: 0,
          transform: `translate3d(${hd}px, 0, ${offsetZ}px) rotateY(90deg)`,
          backgroundImage: `url(repeater/redstone_torch.png)`,
          backgroundSize: `${torchTexW}px ${torchTexH}px`,
        }} />
        <div className="p-face" style={{
          width: torchTexW, height: torchTexH, top: 0, left: 0,
          transform: `translate3d(${-hd}px, 0, ${offsetZ}px) rotateY(-90deg)`,
          backgroundImage: `url(repeater/redstone_torch.png)`,
          backgroundSize: `${torchTexW}px ${torchTexH}px`,
        }} />
        <div className="p-face" style={{
          width: torchTexW, height: torchTexW, top: 0, left: 0,
          transform: `translate3d(${0}px, ${-overflow}px, ${offsetZ}px) rotateX(90deg)`,
          backgroundImage: `url(repeater/redstone_torch_head.png)`,
          backgroundSize: `${torchTexW}px ${torchTexW}px`,
        }} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="sidebar-icon-wrap">
      <div className="piston-3d" style={{
        width: W, height: totalH,
        '--persp': '500px', '--rotX': `${rot.x}deg`, '--rotY': `${rot.y}deg`,
      }}>
        <Box w={W} h={slabH} d={W}
          textures={{
            front: 'repeater/repeater_side.png', back: 'repeater/repeater_side.png',
            left: 'repeater/repeater_side.png',  right: 'repeater/repeater_side.png',
            top: 'repeater/repeater_top.png',    bottom: 'repeater/repeater_bottom.png',
          }}
          style={{ position: 'absolute', bottom: 0, left: 0 }}
        />
        <Torch offsetX={W / 2 - torchBodyW / 2} offsetZ={-torch1Z + W / 2} />
        <Torch offsetX={W / 2 - torchBodyW / 2} offsetZ={-torch2Z + W / 2} />
      </div>
    </div>
  )
}

/* ---- Interactive 3D Slime Block ---- */
function SlimeBlockIcon({ spinTrigger }) {
  const { containerRef, rot } = useMouseRotation(-25, 30, 15, 20, spinTrigger)

  const U = 5
  const W = 16 * U
  const innerW = 12 * U

  const allSides = (tex) => ({ front: tex, back: tex, left: tex, right: tex, top: tex, bottom: tex })

  return (
    <div ref={containerRef} className="sidebar-icon-wrap">
      <div className="piston-3d" style={{
        width: W, height: W,
        '--persp': '500px', '--rotX': `${rot.x}deg`, '--rotY': `${rot.y}deg`,
      }}>
        <Box w={W} h={W} d={W}
          textures={allSides('slime_block.png')}
          style={{ position: 'absolute', top: 0, left: 0 }}
          faceStyle={{ opacity: 0.5 }}
        />
        <Box w={innerW} h={innerW} d={innerW}
          textures={allSides('slimeblock_inner.png')}
          style={{ position: 'absolute', top: (W - innerW) / 2, left: (W - innerW) / 2 }}
        />
      </div>
    </div>
  )
}

/* ---- Piston ---- */
function PistonIconFull({ spinTrigger }) {
  const { containerRef, rot } = useMouseRotation(-25, 35, 15, 20, spinTrigger)

  const U = 5
  const W = 16 * U
  const baseH = 12 * U
  const poleW = 4 * U
  const poleH = 16 * U
  const headH = 4 * U
  const totalH = baseH + poleH + headH

  const allSides = (tex) => ({ front: tex, back: tex, left: tex, right: tex, top: tex, bottom: tex })

  return (
    <div ref={containerRef} className="sidebar-icon-wrap">
      <div className="piston-3d" style={{
        width: W, height: totalH,
        '--persp': '500px', '--rotX': `${rot.x}deg`, '--rotY': `${rot.y}deg`,
      }}>
        <Box w={W} h={baseH} d={W}
          textures={{
            front: 'piston/piston_side.png', back: 'piston/piston_side.png',
            left: 'piston/piston_side.png',  right: 'piston/piston_side.png',
            top: 'piston/piston_inner.png',  bottom: 'piston/piston_bottom.png',
          }}
          style={{ position: 'absolute', bottom: 0, left: 0 }}
        />
        <Box w={poleW} h={poleH} d={poleW}
          textures={allSides('piston/piston_pole.png')}
          style={{ position: 'absolute', bottom: baseH, left: (W - poleW) / 2 }}
        />
        <Box w={W} h={headH} d={W}
          textures={{
            front: 'piston/piston_top_side.png', back: 'piston/piston_top_side.png',
            left: 'piston/piston_top_side.png',  right: 'piston/piston_top_side.png',
            top: 'piston/piston_top.png',        bottom: 'piston/piston_top.png',
          }}
          style={{ position: 'absolute', bottom: baseH + poleH, left: 0 }}
        />
      </div>
    </div>
  )
}

function SidebarIcon({ type, spinTrigger }) {
  switch (type) {
    case 'piston':   return <PistonIconFull spinTrigger={spinTrigger} />
    case 'repeater': return <RepeaterIcon spinTrigger={spinTrigger} />
    case 'slime':    return <SlimeBlockIcon spinTrigger={spinTrigger} />
    default:         return <RedstoneIcon spinTrigger={spinTrigger} />
  }
}

/* ---- Animated model list using FLIP ---- */
function AnimatedModelList({ models, metric }) {
  const itemRefs = useRef({})
  const prevPositions = useRef({})
  const listRef = useRef(null)

  // FLIP: before render, record positions
  const snapshotPositions = useCallback(() => {
    prevPositions.current = {}
    for (const [name, el] of Object.entries(itemRefs.current)) {
      if (el) prevPositions.current[name] = el.getBoundingClientRect().top
    }
  }, [])

  useEffect(() => {
    // After render (FLIP "play" phase): animate from old to new positions
    for (const [name, el] of Object.entries(itemRefs.current)) {
      if (!el || prevPositions.current[name] == null) continue
      const newTop = el.getBoundingClientRect().top
      const delta = prevPositions.current[name] - newTop
      if (Math.abs(delta) < 1) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.38s cubic-bezier(0.25, 1, 0.4, 1)'
        el.style.transform = ''
      })
    }
  })

  // snapshot before each render
  snapshotPositions()

  if (models.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-text">No models selected</div>
      </div>
    )
  }

  return (
    <div className="model-list" ref={listRef}>
      {models.map((model, i) => (
        <div
          key={model.name}
          className="model-row"
          ref={el => { itemRefs.current[model.name] = el }}
        >
          <span className={`model-rank ${getRankClass(i)}`}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <img src={model.icon} alt="" className="model-icon" />
          <span className="model-name">{model.name}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${model[metric]}%` }} />
          </div>
          <span className="model-pct">{model[metric]}%</span>
        </div>
      ))}
    </div>
  )
}

/* ---- Filter dropdown ---- */
function FilterPanel({ models, visible, onToggle, enabledModels, setEnabledModels }) {
  const all = models.map(m => m.name)

  function toggleAll() { setEnabledModels(new Set(all)) }
  function clearAll()  { setEnabledModels(new Set()) }
  function toggle(name) {
    setEnabledModels(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (!visible) return null

  return (
    <div className="filter-panel">
      <div className="filter-panel-actions">
        <button className="filter-action-btn" onClick={toggleAll}>SELECT ALL</button>
        <button className="filter-action-btn" onClick={clearAll}>CLEAR</button>
      </div>
      {models.map(m => (
        <label key={m.name} className="filter-row">
          <span className="filter-checkbox-wrap">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={enabledModels.has(m.name)}
              onChange={() => toggle(m.name)}
            />
            <span className="filter-checkmark" />
          </span>
          <span className="filter-model-name">{m.name}</span>
        </label>
      ))}
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab]       = useState('general')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [models, setModels]             = useState(() => randomizeScores())
  const [activeMetric, setActiveMetric] = useState('score')
  const [filterOpen, setFilterOpen]     = useState(false)
  const [enabledModels, setEnabledModels] = useState(() => new Set(baseModels.map(m => m.name)))

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'logic',   label: 'Logic' },
    { id: 'static',  label: 'Static Movement' },
    { id: 'dynamic', label: 'Dynamic Movement' },
  ]

  const handleTabChange = useCallback((id) => {
    setActiveTab(id)
    setModels(randomizeScores())
  }, [])

  const sorted = useMemo(() => {
    return [...models]
      .filter(m => enabledModels.has(m.name))
      .sort((a, b) => b[activeMetric] - a[activeMetric])
  }, [models, activeMetric, enabledModels])

  const info = tabInfo[activeTab]

  // Close filter panel on outside click
  const filterRef = useRef(null)
  useEffect(() => {
    function handle(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [filterOpen])

  return (
    <>
      <GridBackground />

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div>
              <div className="logo">
                <span className="logo-red">REDSTONE</span>
                <span className="logo-white">BENCH</span>
              </div>
              <div className="subtitle">
                <span className="subtitle-dot">●</span>
                AI's Minecraft Redstone Capabilities
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="nav-row">
            <div className="tabs tabs-desktop">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tabs-mobile">
              <div className="mobile-tab-current">
                <span className="tab-current-label">{tabs.find(t => t.id === activeTab)?.label}</span>
                <button
                  className={`tab-change-btn ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  CHANGE <span>▾</span>
                </button>
              </div>

              {dropdownOpen && (
                <div className="mobile-tab-dropdown">
                  {tabs.filter(t => t.id !== activeTab).map(tab => (
                    <button
                      key={tab.id}
                      className="tab mobile-drop-tab"
                      onClick={() => { handleTabChange(tab.id); setDropdownOpen(false) }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="content-row">
          {/* Stats Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{info.title}</div>
                <div className="card-desc">{info.desc}</div>
              </div>

              <div className="card-controls">
                {/* Metric buttons */}
                <div className="metric-btns">
                  {METRICS.map(m => (
                    <button
                      key={m.id}
                      className={`metric-btn ${activeMetric === m.id ? 'active' : ''}`}
                      title={m.label}
                      onClick={() => setActiveMetric(m.id)}
                    >
                      <span className="metric-icon">{m.icon}</span>
                    </button>
                  ))}
                </div>

                {/* Filter button */}
                <div className="filter-wrap" ref={filterRef}>
                  <button
                    className={`filter-btn ${filterOpen ? 'active' : ''}`}
                    onClick={() => setFilterOpen(f => !f)}
                  >
                    Models [{enabledModels.size}/{baseModels.length}] <span>▾</span>
                  </button>
                  <FilterPanel
                    models={baseModels}
                    visible={filterOpen}
                    onToggle={() => setFilterOpen(f => !f)}
                    enabledModels={enabledModels}
                    setEnabledModels={setEnabledModels}
                  />
                </div>
              </div>
            </div>

            <AnimatedModelList models={sorted} metric={activeMetric} />
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <SidebarIcon type={info.icon} spinTrigger={activeMetric} />
            <h3 className="sidebar-heading">{info.heading}</h3>
            <p className="sidebar-body">{info.body}</p>
          </div>
        </div>
      </div>
    </>
  )
}
