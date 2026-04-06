import { Vibrant } from "node-vibrant/browser"

export const fallbackGradient = {
  top: "#5d2c10",
  bottom: "#4a4842",
  glow: "#ba844f",
  light: "#d4a87a"
}

export async function extractGradientColors(
  source: string | HTMLImageElement
): Promise<{ top: string; bottom: string; glow: string; light: string }> {
  try {
    const palette = await Vibrant.from(source).getPalette()
    const top = palette.DarkVibrant?.hex ?? palette.Vibrant?.hex ?? fallbackGradient.top
    const bottom = palette.DarkMuted?.hex ?? palette.Muted?.hex ?? fallbackGradient.bottom
    const glow = palette.Vibrant?.hex ?? palette.DarkVibrant?.hex ?? fallbackGradient.glow
    const light = palette.LightVibrant?.hex ?? palette.Vibrant?.hex ?? fallbackGradient.light
    return { top, bottom, glow, light }
  } catch {
    return { ...fallbackGradient }
  }
}
