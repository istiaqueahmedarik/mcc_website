const { createShapeId, toRichText } = await import('tldraw')

const shapes = []
const addBox = (key, x, y, w, h, { color = 'grey', fill = 'solid', radius = 'm', text = '', textSize = 's', meta = {}, opacity = 1 } = {}) => {
  shapes.push({
    id: createShapeId(key),
    type: 'geo',
    x, y,
    opacity,
    meta,
    props: {
      geo: 'rectangle',
      w, h,
      color,
      fill,
      dash: 'solid',
      size: textSize,
      richText: toRichText(text),
    },
  })
}
const addText = (key, x, y, text, { size = 's', color = 'black', w = 300, align = 'start', meta = {}, opacity = 1 } = {}) => {
  shapes.push({
    id: createShapeId(key),
    type: 'text',
    x, y,
    opacity,
    meta,
    props: {
      richText: toRichText(text),
      color,
      size,
      font: 'sans',
      textAlign: align,
      w,
      autoSize: false,
    },
  })
}

// Page and navigation shell.
addBox('page', 40, 40, 1400, 960, { color: 'grey', fill: 'solid', meta: { role: 'page-background' } })
addBox('sidebar', 40, 40, 224, 960, { color: 'black', fill: 'solid' })
addText('brand', 72, 72, 'MCC · TRAINER', { size: 'm', color: 'white', w: 170 })
addText('nav-overview', 72, 142, 'Overview', { color: 'grey', w: 150 })
addBox('nav-contests', 60, 184, 184, 46, { color: 'blue', fill: 'semi', text: 'Contests & reports', textSize: 's' })
addText('nav-classrooms', 72, 250, 'Classrooms', { color: 'grey', w: 150 })
addText('nav-students', 72, 298, 'Students', { color: 'grey', w: 150 })
addText('nav-forms', 72, 346, 'Forms', { color: 'grey', w: 150 })
addText('nav-help', 72, 926, 'Help & shortcuts', { color: 'grey', w: 160 })

// Report header.
addText('crumb', 304, 76, 'Trainer dashboard  /  Contests  /  Fall 2026', { color: 'grey', w: 620 })
addText('title', 304, 112, 'Contest report', { size: 'xl', w: 560 })
addText('subtitle', 304, 166, 'Algorithms · Room A  ·  42 students  ·  Updated 8 min ago', { color: 'grey', w: 700 })
addBox('refresh', 1152, 116, 116, 42, { color: 'grey', fill: 'none', text: 'Refresh' })
addBox('share', 1280, 116, 112, 42, { color: 'blue', fill: 'solid', text: 'Share report' })

// Section heading and filters.
addText('performance-title', 304, 226, 'Recent performance', { size: 'l', w: 360 })
addText('performance-copy', 304, 266, 'Students who solved at least one problem in the last 72 hours.', { color: 'grey', w: 650 })
addBox('active-filter', 1148, 238, 244, 38, { color: 'green', fill: 'semi', text: '●  Active solvers only  ·  12' })

// Main performance table card.
addBox('performance-card', 304, 310, 1088, 408, { color: 'grey', fill: 'solid', meta: { role: 'performance-card' } })
addText('table-student', 332, 336, 'STUDENT', { color: 'grey', w: 300 })
addText('table-24', 784, 336, 'LAST 24H', { color: 'grey', w: 140, align: 'middle' })
addText('table-48', 966, 336, 'LAST 48H', { color: 'grey', w: 140, align: 'middle' })
addText('table-72', 1148, 336, 'LAST 72H', { color: 'grey', w: 140, align: 'middle' })
addText('table-note', 332, 374, 'Counts are cumulative by window', { color: 'grey', w: 320 })
addBox('header-rule', 328, 405, 1040, 2, { color: 'grey', fill: 'solid' })

const students = [
  { key: 'amina', name: 'Amina Rahman', id: '2201007', total: '11 solves · 4 contests', y: 432, counts: [5, 8, 11] },
  { key: 'rafi', name: 'Rafi Islam', id: '2201042', total: '7 solves · 3 contests', y: 496, counts: [2, 5, 7] },
  { key: 'nusrat', name: 'Nusrat Jahan', id: '2201088', total: '5 solves · 2 contests', y: 560, counts: [1, 3, 5] },
  { key: 'sami', name: 'Sami Hasan', id: '2201119', total: '3 solves · 2 contests', y: 624, counts: [0, 1, 3] },
]
const xs = [804, 986, 1168]
const windows = ['24h', '48h', '72h']
for (const student of students) {
  addText(`name-${student.key}`, 332, student.y, student.name, { size: 'm', w: 250 })
  addText(`id-${student.key}`, 332, student.y + 28, `${student.id}  ·  ${student.total}`, { color: 'grey', w: 330 })
  student.counts.forEach((count, index) => {
    if (!count) {
      addText(`empty-${student.key}-${windows[index]}`, xs[index] + 30, student.y + 10, '—', { color: 'grey', w: 44, align: 'middle' })
      return
    }
    const hoverKey = `${student.key}-${windows[index]}`
    addBox(`chip-${hoverKey}`, xs[index], student.y + 4, 92, 38, {
      color: 'green',
      fill: 'semi',
      radius: 'pill',
      text: `+${count}`,
      textSize: 'm',
      meta: { role: 'performance-chip', hoverKey, student: student.name, window: windows[index] },
    })
  })
  if (student.key !== 'sami') addBox(`rule-${student.key}`, 328, student.y + 58, 1040, 1, { color: 'grey', fill: 'solid' })
}
addText('hint', 332, 686, 'Hover a green +x to see which contests produced those solves.', { color: 'blue', w: 620 })
addText('view-all', 1176, 686, 'View all 12  →', { color: 'blue', w: 180, align: 'end' })

// Always-present continuation of the report so placement is clear.
addText('ranking-title', 304, 770, 'Overall ranking', { size: 'l', w: 360 })
addText('ranking-meta', 304, 808, 'Scored report · solved first, penalty breaks ties', { color: 'grey', w: 520 })
addBox('ranking-card', 304, 854, 1088, 116, { color: 'grey', fill: 'solid' })
addText('rank-head', 332, 876, '#     Student                                      Solved        Penalty        Score', { color: 'grey', w: 930 })
addBox('ranking-rule', 328, 910, 1040, 1, { color: 'grey', fill: 'solid' })
addText('rank-row', 332, 930, '1     Amina Rahman                              26              08:42            94.8', { size: 'm', w: 930 })

// Hover tooltip shapes. The first is visible on open so the behavior is legible in a static screenshot.
const tooltipData = {
  'amina-24h': ['Amina Rahman · last 24 hours', 'Codeforces Round 1012', '+3', 'MCC Weekly #24', '+2', '5 solves across 2 contests'],
  'amina-48h': ['Amina Rahman · last 48 hours', 'Codeforces Round 1012', '+3', 'MCC Weekly #24', '+2', 'ICPC Practice Set 7', '+3', '8 solves across 3 contests'],
  'amina-72h': ['Amina Rahman · last 72 hours', 'Codeforces Round 1012', '+3', 'MCC Weekly #24', '+2', 'ICPC Practice Set 7', '+3', 'Graph Sprint', '+3', '11 solves across 4 contests'],
  'rafi-24h': ['Rafi Islam · last 24 hours', 'MCC Weekly #24', '+2', '2 solves across 1 contest'],
  'rafi-48h': ['Rafi Islam · last 48 hours', 'MCC Weekly #24', '+2', 'ICPC Practice Set 7', '+3', '5 solves across 2 contests'],
  'rafi-72h': ['Rafi Islam · last 72 hours', 'MCC Weekly #24', '+2', 'ICPC Practice Set 7', '+3', 'Graph Sprint', '+2', '7 solves across 3 contests'],
  'nusrat-24h': ['Nusrat Jahan · last 24 hours', 'Codeforces Round 1012', '+1', '1 solve across 1 contest'],
  'nusrat-48h': ['Nusrat Jahan · last 48 hours', 'Codeforces Round 1012', '+1', 'MCC Weekly #24', '+2', '3 solves across 2 contests'],
  'nusrat-72h': ['Nusrat Jahan · last 72 hours', 'Codeforces Round 1012', '+2', 'MCC Weekly #24', '+3', '5 solves across 2 contests'],
  'sami-48h': ['Sami Hasan · last 48 hours', 'Graph Sprint', '+1', '1 solve across 1 contest'],
  'sami-72h': ['Sami Hasan · last 72 hours', 'Graph Sprint', '+1', 'ICPC Practice Set 7', '+2', '3 solves across 2 contests'],
}

let tooltipIndex = 0
for (const [hoverKey, lines] of Object.entries(tooltipData)) {
  const visible = hoverKey === 'amina-24h'
  const countPairs = Math.floor((lines.length - 2) / 2)
  const height = 86 + countPairs * 34
  const left = hoverKey.endsWith('72h') ? 938 : hoverKey.endsWith('48h') ? 872 : 700
  const top = hoverKey.startsWith('amina') ? 448 : hoverKey.startsWith('rafi') ? 512 : hoverKey.startsWith('nusrat') ? 576 : 640
  const meta = { role: 'performance-tooltip', tooltipFor: hoverKey, tooltipIndex }
  addBox(`tooltip-bg-${tooltipIndex}`, left, top, 338, height, { color: 'black', fill: 'solid', meta, opacity: visible ? 1 : 0 })
  addText(`tooltip-title-${tooltipIndex}`, left + 18, top + 16, lines[0], { color: 'white', w: 296, meta, opacity: visible ? 1 : 0 })
  let cursor = top + 50
  for (let i = 1; i < lines.length - 1; i += 2) {
    addText(`tooltip-label-${tooltipIndex}-${i}`, left + 18, cursor, lines[i], { color: 'grey', w: 230, meta, opacity: visible ? 1 : 0 })
    addText(`tooltip-count-${tooltipIndex}-${i}`, left + 270, cursor, lines[i + 1], { color: 'green', w: 46, align: 'end', meta, opacity: visible ? 1 : 0 })
    cursor += 34
  }
  addText(`tooltip-summary-${tooltipIndex}`, left + 18, top + height - 30, lines[lines.length - 1], { color: 'white', w: 296, meta, opacity: visible ? 1 : 0 })
  tooltipIndex += 1
}

editor.createShapes(shapes)
editor.zoomToFit({ animation: { duration: 0 } })
await helpers.saveDoc()
return { created: shapes.length, performanceChips: shapes.filter((shape) => shape.meta?.role === 'performance-chip').length, tooltips: tooltipIndex }
