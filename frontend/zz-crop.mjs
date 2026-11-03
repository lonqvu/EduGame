import { chromium } from '@playwright/test'
const [src, out] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'msedge' }); const p = await b.newPage({ viewport: { width: 1100, height: 1000 } })
import { readFileSync } from 'node:fs'
await p.setContent('<img src="data:image/png;base64,' + readFileSync(src).toString('base64') + '">'); await p.waitForTimeout(300)
// Find the inner picture of the big card: scan the middle row and column for the white frame.
const box = await p.evaluate(() => {
  const img = document.querySelector('img'); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data
  const white = (x, y) => { const i = (y * c.width + x) * 4; return d[i] > 235 && d[i + 1] > 228 && d[i + 2] > 215 }
  const y = 600, x = 500; let l = 0, r = 1080, t = 0, bt = 1020
  for (let i = 20; i < 300; i++) if (!white(i, y)) { l = i; break }
  for (let i = 1080; i > 800; i--) if (!white(i, y)) { r = i; break }
  for (let i = 60; i < 400; i++) if (!white(x, i)) { t = i; break }
  for (let i = 1000; i > 700; i--) if (!white(x, i)) { bt = i; break }
  return { l, r, t, bt }
})
console.log(JSON.stringify(box))
const crops = await p.evaluate(({ box }) => {
  const img = document.querySelector('img'); const out = []
  const inset = 14, L = box.l + inset, R = box.r - inset, T = box.t + inset, B = box.bt - inset
  const W = R - L, H = B - T
  for (const top of [T, T + (H - W / 2) / 2, B - W / 2]) {
    const c = document.createElement('canvas'); c.width = 960; c.height = 480
    c.getContext('2d').drawImage(img, L, top, W, W / 2, 0, 0, 960, 480); out.push(c.toDataURL('image/png'))
  }
  // Whole picture fitted in the middle, sides from a blurred copy.
  const c = document.createElement('canvas'); c.width = 960; c.height = 480; const g = c.getContext('2d')
  g.filter = 'blur(24px) saturate(1.1)'; g.drawImage(img, L, T + (H - W / 2) / 2, W, W / 2, -40, -40, 1040, 560); g.filter = 'none'
  const w = 480 * W / H; g.drawImage(img, L, T, W, H, (960 - w) / 2, 0, w, 480); out.push(c.toDataURL('image/png'))
  return out
}, { box })
await p.setContent('<body style="margin:0;background:#333">' + crops.map((u) => `<img src="${u}" style="width:480px;margin:6px;border-radius:14px">`).join('') + '</body>')
await p.waitForTimeout(500); await p.screenshot({ path: out, fullPage: true }); await b.close()
