import { visit } from "unist-util-visit"
import { readFileSync } from "fs"
import { resolve } from "path"

/**
 * Remark plugin that replaces ![alt](path.svg) image nodes with inline <svg> elements.
 * Handles absolute /src/assets/... paths used in the project's markdown files.
 * Makes each SVG responsive by replacing fixed width/height with width="100%".
 */
export function remarkInlineSvg() {
  return function (tree) {
    const svgNodes = []

    visit(tree, "image", (node, index, parent) => {
      if (node.url && node.url.endsWith(".svg")) {
        svgNodes.push({ node, index, parent })
      }
    })

    for (const { node, index, parent } of svgNodes) {
      try {
        // Strip leading slash and resolve from project root
        const relativePath = node.url.replace(/^\//, "")
        const filePath = resolve(process.cwd(), relativePath)

        let svgContent = readFileSync(filePath, "utf-8")

        // Make SVG responsive — remove fixed dimensions, keep viewBox intact
        svgContent = svgContent
          .replace(/(<svg[^>]*)\s+width="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\s+height="[^"]*"/, "$1")
          .replace(/<svg/, '<svg width="100%"')

        parent.children[index] = {
          type: "html",
          value: svgContent
        }
      } catch (err) {
        console.warn(`[remark-inline-svg] Could not inline ${node.url}:`, err.message)
      }
    }
  }
}
