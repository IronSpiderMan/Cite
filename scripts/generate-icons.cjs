const fs = require('fs')
const path = require('path')
const { createICNS, createICO, RESIZE_BICUBIC } = require('png2icons')

async function main() {
  const root = process.cwd()
  const inPng = path.join(root, 'build', 'icon.png')
  const outIcns = path.join(root, 'build', 'icon.icns')
  const outIco = path.join(root, 'build', 'icon.ico')

  if (!fs.existsSync(inPng)) {
    throw new Error(`Missing input file: ${inPng}`)
  }

  const input = fs.readFileSync(inPng)

  const alg = typeof RESIZE_BICUBIC === 'number' ? RESIZE_BICUBIC : 2
  const icns = createICNS(input, alg, 0)
  if (!icns) throw new Error('Failed to generate ICNS')
  fs.writeFileSync(outIcns, icns)

  const ico = createICO(input, alg, 0, true, true)
  if (!ico) throw new Error('Failed to generate ICO')
  fs.writeFileSync(outIco, ico)

  process.stdout.write(`Wrote:\n- ${path.relative(root, outIcns)}\n- ${path.relative(root, outIco)}\n`)
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + '\n')
  process.exit(1)
})

