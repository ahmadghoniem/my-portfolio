import type { APIRoute } from "astro"

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const imageUrl = url.searchParams.get("url")

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.statusText}`, {
        status: response.status
      })
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      }
    })
  } catch (error) {
    return new Response("Error proxying image", { status: 500 })
  }
}
