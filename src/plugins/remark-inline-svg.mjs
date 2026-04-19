import { copyFileSync, mkdirSync, readFileSync } from "fs"
import { basename, extname, resolve } from "path"
import { visit } from "unist-util-visit"

const NON_SVG_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]

export function remarkInlineSvg() {
  return function (tree) {
    const imageNodes = []
    visit(tree, "image", (node, index, parent) => {
      if (node.url && (node.url.endsWith(".svg") || NON_SVG_EXTS.includes(extname(node.url)))) {
        imageNodes.push({ node, index, parent })
      }
    })

    for (const { node, index, parent } of imageNodes) {
      const ext = extname(node.url)

      if (ext === ".svg") {
        try {
          const relativePath = node.url.replace(/^\//, "")
          const filePath = resolve(process.cwd(), relativePath)
          let svgContent = readFileSync(filePath, "utf-8")
          svgContent = svgContent
            .replace(/(<svg[^>]*)\s+width="[^"]*"/, "$1")
            .replace(/(<svg[^>]*)\s+height="[^"]*"/, "$1")
            .replace(/<svg/, '<svg width="100%"')
          parent.children[index] = { type: "html", value: svgContent }
        } catch (err) {
          console.warn(`[remark-inline-svg] Could not inline ${node.url}:`, err.message)
        }
      } else if (NON_SVG_EXTS.includes(ext)) {
        try {
          const relativePath = node.url.replace(/^\//, "")
          const srcPath = resolve(process.cwd(), relativePath)
          const filename = basename(node.url)
          const destDir = resolve(process.cwd(), "public/_assets")
          const destPath = resolve(destDir, filename)
          mkdirSync(destDir, { recursive: true })
          copyFileSync(srcPath, destPath)
          node.url = `/_assets/${filename}`
        } catch (err) {
          console.warn(`[remark-inline-svg] Could not copy ${node.url}:`, err.message)
        }
      }
    }
  }
}