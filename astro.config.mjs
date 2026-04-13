// @ts-check
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { remarkInlineSvg } from "./src/plugins/remark-inline-svg.mjs"

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  markdown: {
    remarkPlugins: [remarkInlineSvg]
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
