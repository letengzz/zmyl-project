import { query } from '../utils/db'

// GET /api/attendance-export-html?year=2026&month=8
// 导出当月所有人员的考勤数据为单个 HTML 文件（固定快照，样式参考考勤日历：
// 蓝色=导入工时、绿色=手动工时、红色=两者不一致、橙色=加班）
export default defineEventHandler(async (event) => {
  const { year, month } = getQuery(event) as { year?: string; month?: string }
  if (!year || !month) {
    setResponseStatus(event, 400)
    return { success: false, message: '缺少年月参数' }
  }

  const y = Number(year)
  const m = Number(month)
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  // 人员列表（与考勤页面选择人员一致：初始考勤表顺序 punch_seq，其次按 id）
  let personRows = await query(
    `SELECT person_id, MIN(punch_seq) AS seq, MIN(id) AS min_id
     FROM attendance
     WHERE attendance_date >= ? AND attendance_date < ? AND (hours > 0 OR punch_seq IS NOT NULL)
     GROUP BY person_id
     ORDER BY seq IS NULL, seq, min_id`,
    [startDate, endDate]
  ) as any[]

  if (personRows.length === 0) {
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    const prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`
    const prevEndDate = `${m === 1 ? y : prevY}-${String(m).padStart(2, '0')}-01`
    personRows = await query(
      `SELECT person_id, MIN(punch_seq) AS seq, MIN(id) AS min_id
       FROM attendance
       WHERE attendance_date >= ? AND attendance_date < ? AND (hours > 0 OR punch_seq IS NOT NULL)
       GROUP BY person_id
       ORDER BY seq IS NULL, seq, min_id`,
      [prevStartDate, prevEndDate]
    ) as any[]
  }

  if (personRows.length === 0) {
    setResponseStatus(event, 404)
    return { success: false, message: '该月无考勤数据' }
  }

  const personIds = [...new Set(personRows.map(r => r.person_id as number))]
  const persons = await query(
    `SELECT id, name, id_card, position FROM person WHERE id IN (${personIds.map(() => '?').join(',')})`,
    personIds
  ) as any[]
  const personMap = new Map(persons.map(p => [p.id, p]))
  const orderedPersons = personIds.map(id => personMap.get(id)).filter(Boolean)

  // 当月全部考勤记录，按人分组
  const records = await query(
    `SELECT person_id, attendance_date, hours, manual_hours FROM attendance WHERE attendance_date >= ? AND attendance_date < ?`,
    [startDate, endDate]
  ) as any[]

  const recMap = new Map<number, Record<string, { imported: number; manual: number }>>()
  for (const r of records) {
    const d = r.attendance_date instanceof Date ? r.attendance_date : new Date(r.attendance_date)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!recMap.has(r.person_id)) recMap.set(r.person_id, {})
    recMap.get(r.person_id)![dateStr] = { imported: Number(r.hours) || 0, manual: Number(r.manual_hours) || 0 }
  }

  const daysInMonth = new Date(y, m, 0).getDate()
  const startDayOfWeek = new Date(y, m - 1, 1).getDay() // 0=周日
  const prevLastDay = new Date(y, m - 1, 0).getDate()

  // 生成每人日历表格
  function buildCalendar(recs: Record<string, { imported: number; manual: number }>): string {
    let html = '<table class="cal"><thead><tr>'
    for (const w of ['日', '一', '二', '三', '四', '五', '六']) html += `<th>${w}</th>`
    html += '</tr></thead><tbody><tr>'

    // 上月占位格
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      html += `<td class="out"><span class="d">${prevLastDay - i}</span></td>`
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const rec = recs[dateStr]
      let cell = `<span class="d">${d}</span>`
      if (rec) {
        const imported = rec.imported
        const manual = rec.manual
        const eff = imported > 0 ? imported : manual
        if (eff > 0) {
          const ot = Math.max(0, eff - 9)
          if (imported > 0 && manual > 0 && Math.abs(imported - manual) >= 0.05) {
            // 不一致：显示导入/手动 + 红色差
            cell += `<span class="imp">${imported}h</span><span class="man">${manual}h</span><span class="diff">差 ${(Math.round((imported - manual) * 10) / 10).toFixed(1)}h</span>`
          } else if (imported > 0) {
            cell += `<span class="imp">${imported}h</span>`
          } else {
            cell += `<span class="man">${manual}h</span>`
          }
          if (ot > 0) cell += `<span class="ot">加班 ${ot.toFixed(1)}h</span>`
        } else {
          cell += `<span class="rest">休</span>`
        }
      }
      html += `<td class="day">${cell}</td>`
      if ((startDayOfWeek + d) % 7 === 0 && d < daysInMonth) html += '</tr><tr>'
    }
    // 尾部补齐
    const totalCells = startDayOfWeek + daysInMonth
    const tail = (7 - (totalCells % 7)) % 7
    for (let i = 1; i <= tail; i++) {
      html += `<td class="out"><span class="d">${i}</span></td>`
    }
    html += '</tr></tbody></table>'
    return html
  }

  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 每人一个区块（默认隐藏，由 JS 控制显示当前选中人员）
  const sections: string[] = []
  const personsInfo: { name: string; position: string; days: number }[] = []
  let totalPersons = 0
  for (const p of orderedPersons) {
    const recs = recMap.get(p.id) || {}
    let totalHours = 0
    let workDays = 0
    let overtimeHours = 0
    for (const rec of Object.values(recs)) {
      const eff = rec.imported > 0 ? rec.imported : rec.manual
      if (eff > 0) {
        totalHours += eff
        workDays++
        overtimeHours += Math.max(0, eff - 9)
      }
    }
    if (totalHours <= 0) continue
    const idx = sections.length
    totalPersons++
    personsInfo.push({ name: p.name, position: p.position || '', days: workDays })
    const attendDays = Math.round((totalHours / 9) * 100) / 100
    sections.push(`
<div class="person" data-idx="${idx}">
  <h2>${esc(p.name)} <span class="pos">${esc(p.position || '')}</span></h2>
  <div class="summary">
    出勤 <b>${workDays}</b> 天 · 总工时 <b>${Math.round(totalHours * 10) / 10}h</b> · 折算天数 <b>${attendDays}</b> 天 · 加班合计 <b>${Math.round(overtimeHours * 10) / 10}h</b>
  </div>
  ${buildCalendar(recs)}
</div>`)
  }

  const pickerItems = personsInfo
    .map((p, i) => `<div class="picker-item" onclick="selectPerson(${i})">${esc(p.name)} <span class="pi-pos">${esc(p.position)}</span><span class="pi-days">${p.days}天</span></div>`)
    .join('')
  const personsJson = JSON.stringify(personsInfo).replace(/</g, '\\u003c')

  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${y}年${m}月考勤数据</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
  h1 { text-align: center; font-size: 26px; margin-bottom: 6px; }
  .sub { text-align: center; color: #888; font-size: 13px; margin-bottom: 24px; }
  .legend { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
  .legend span { display: inline-block; margin: 0 6px; padding: 1px 8px; border-radius: 3px; }
  .lg-imp { background: #dbeafe; color: #1d4ed8; }
  .lg-man { background: #dcfce7; color: #15803d; }
  .lg-diff { background: #fee2e2; color: #b91c1c; }
  .lg-ot { background: #ffedd5; color: #c2410c; }
  .person { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; }
  .person h2 { font-size: 17px; margin-bottom: 6px; }
  .person .pos { font-size: 12px; color: #999; font-weight: normal; }
  .summary { font-size: 13px; color: #555; margin-bottom: 10px; }
  .summary b { color: #1d4ed8; }
  .cur-bar { text-align: center; margin-bottom: 16px; }
  .cur-bar button { font-size: 20px; font-weight: bold; color: #1d4ed8; background: #fff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 6px 28px; cursor: pointer; }
  .cur-bar button:hover { background: #eff6ff; }
  #picker { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; align-items: center; justify-content: center; }
  .picker-box { background: #fff; border-radius: 10px; width: 400px; max-width: 92vw; max-height: 74vh; display: flex; flex-direction: column; padding: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
  .picker-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
  #picker-search { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; }
  .picker-list { flex: 1; overflow-y: auto; margin-top: 10px; border: 1px solid #f3f4f6; border-radius: 6px; }
  .picker-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer; border-bottom: 1px solid #f3f4f6; }
  .picker-item:hover { background: #eff6ff; }
  .pi-pos { color: #9ca3af; font-size: 12px; }
  .pi-days { margin-left: auto; color: #1d4ed8; font-size: 12px; }
  .picker-close { margin-top: 10px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
  .picker-close:hover { background: #f9fafb; }
  .cal { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .cal th { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 4px 0; font-size: 12px; color: #555; font-weight: normal; }
  .cal td { border: 1px solid #e5e7eb; height: 74px; vertical-align: top; padding: 4px; font-size: 11px; }
  .cal td.out { background: #fafafa; color: #ccc; }
  .cal .d { display: block; text-align: right; font-size: 12px; color: #999; margin-bottom: 2px; }
  .cal span { display: block; margin: 1px 0; padding: 1px 4px; border-radius: 3px; text-align: center; font-size: 11px; }
  .imp { background: #dbeafe; color: #1d4ed8; }
  .man { background: #dcfce7; color: #15803d; }
  .diff { background: #fee2e2; color: #b91c1c; }
  .ot { background: #ffedd5; color: #c2410c; }
  .rest { color: #ccc; }
  @media print {
    body { background: #fff; padding: 0; }
    .person { border: none; page-break-inside: avoid; }
    .cur-bar, #picker { display: none !important; }
  }
  /* 手机端适配 */
  @media (max-width: 768px) {
    body { padding: 10px; }
    h1 { font-size: 20px; }
    .sub { font-size: 12px; margin-bottom: 14px; }
    .legend { font-size: 11px; margin-bottom: 12px; }
    .cur-bar button { font-size: 17px; padding: 5px 18px; }
    .person { padding: 10px; margin-bottom: 12px; }
    .person h2 { font-size: 15px; }
    .summary { font-size: 12px; }
    .cal th { padding: 3px 0; font-size: 10px; }
    .cal td { height: 48px; padding: 2px; font-size: 10px; }
    .cal .d { font-size: 10px; }
    .cal span { font-size: 9px; padding: 1px 2px; margin: 1px 0; }
    .picker-box { width: 94vw; max-height: 78vh; padding: 12px; }
    .picker-item { padding: 9px 10px; font-size: 14px; }
  }
  @media (max-width: 380px) {
    .cal td { height: 42px; }
    .cal span { font-size: 8px; }
    .cal .d { font-size: 9px; }
  }
</style>
</head>
<body>
<h1>${y}年${m}月考勤数据</h1>
<p class="sub">导出时间：${nowStr} · 共 ${totalPersons} 人 · 数据为当月快照</p>
<div class="cur-bar">
  <button id="cur-name" onclick="openPicker()">${totalPersons > 0 ? esc(personsInfo[0]!.name) : ''} ▾</button>
</div>
<div class="legend">
  <span class="lg-imp">蓝色=考勤</span>
  <span class="lg-ot">橙色=加班</span>
</div>
${sections.join('\n')}
<div id="picker" onclick="if(event.target===this)closePicker()">
  <div class="picker-box">
    <div class="picker-title">选择人员</div>
    <input id="picker-search" oninput="filterList()" placeholder="搜索姓名或职位..." />
    <div class="picker-list">
      <div class="picker-item" onclick="selectPerson(-1)"><b>全部人员（${totalPersons}人）</b></div>
      ${pickerItems}
    </div>
    <button class="picker-close" onclick="closePicker()">关闭</button>
  </div>
</div>
<script>
var PERSONS = ${personsJson};
var current = 0; // -1 表示查看全部
function apply() {
  document.getElementById('cur-name').textContent = current < 0 ? ('全部人员（' + PERSONS.length + '人）') : PERSONS[current].name;
  document.querySelectorAll('.person').forEach(function(el) {
    var idx = Number(el.getAttribute('data-idx'));
    el.style.display = (current < 0 || idx === current) ? '' : 'none';
  });
}
function selectPerson(i) { current = i; apply(); closePicker(); window.scrollTo(0, 0); }
function openPicker() { document.getElementById('picker').style.display = 'flex'; document.getElementById('picker-search').value = ''; filterList(); }
function closePicker() { document.getElementById('picker').style.display = 'none'; }
function filterList() {
  var kw = document.getElementById('picker-search').value.trim().toLowerCase();
  document.querySelectorAll('.picker-item').forEach(function(el) {
    el.style.display = el.textContent.toLowerCase().indexOf(kw) >= 0 ? '' : 'none';
  });
}
apply();
</script>
</body>
</html>`

  const res = event.node.res
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(`${y}年${m}月考勤数据.html`)}"`)
  res.end(Buffer.from(html, 'utf-8'))
})
