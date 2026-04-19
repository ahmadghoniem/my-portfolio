import { Vibrant } from "node-vibrant/browser"

export async function extractGradientColors(
  source: string
): Promise<{ top: string; bottom: string; glow: string; light: string } | undefined> {
  const palette = await Vibrant.from(source).getPalette()
  const top = palette.DarkVibrant?.hex ?? palette.Vibrant?.hex
  const bottom = palette.DarkMuted?.hex ?? palette.Muted?.hex
  const glow = palette.Vibrant?.hex ?? palette.DarkVibrant?.hex
  const light = palette.LightVibrant?.hex ?? palette.Vibrant?.hex
  return top && bottom ? { top, bottom, glow, light } : undefined
}
