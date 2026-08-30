import { createGateway, generateText, Output } from 'ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'

/**
 * Resolve the AI Gateway key. In production it comes from process.env; in the
 * dev preview the server process can predate the integration being connected,
 * so fall back to reading the env file directly.
 */
function gatewayApiKey(): string | undefined {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY
  try {
    const raw = readFileSync(join(process.cwd(), '.env.development.local'), 'utf8')
    const line = raw.split('\n').find(l => l.startsWith('AI_GATEWAY_API_KEY='))
    return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')
  } catch {
    return undefined
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * AI-powered description + feature generator for the Add Game wizard.
 *
 * Previous version scraped ScriptBlox/rscripts search results, which pulled
 * in other hubs' names, junk tags, and irrelevant features. Now a real LLM
 * writes VoidHub-specific copy from the game name + Roblox description,
 * with a clean template fallback if the AI call fails.
 */

const OutputSchema = z.object({
  description: z
    .string()
    .describe(
      'SEO description for the VoidHub script page for this game, 120-150 characters, mentioning the game name and VoidHub. Never mention any other script hub.',
    ),
  features: z
    .array(z.string())
    .describe(
      'Realistic script feature names for THIS specific game based on its gameplay (e.g. a fruit farming game gets Auto Farm Fruits; a shooter gets Aimbot/ESP). 5-8 items, Title Case, 1-3 words each.',
    ),
  tags: z
    .array(z.string())
    .describe('10-15 SEO tags relevant to this game and its script, lowercase.'),
})

function fallback(name: string) {
  return {
    description: `VoidHub brings you a free Roblox script for ${name}. Undetected, auto-updating, and safe to use — just paste the loadstring and execute.`,
    features: ['Auto Farm', 'ESP', 'Teleport', 'Speed Hack', 'God Mode'],
    tags: [
      name.toLowerCase(),
      `${name.toLowerCase()} script`,
      `${name.toLowerCase()} free script`,
      `${name.toLowerCase()} loadstring`,
      'roblox script',
      'roblox exploit',
      'voidhub',
    ],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') || '').trim().slice(0, 80)
  const robloxDesc = (searchParams.get('description') || '').trim().slice(0, 600)

  if (!name) {
    return Response.json({ error: 'Missing game name' }, { status: 400 })
  }

  try {
    const gateway = createGateway({ apiKey: gatewayApiKey() })
    const { output } = await generateText({
      model: gateway('google/gemini-3.5-flash'),
      output: Output.object({ schema: OutputSchema }),
      prompt: [
        `You write copy for VoidHub, a Roblox script hub with free scripts and premium keys available in the Shop for instant delivery.`,
        `Game: "${name}"`,
        robloxDesc ? `Official Roblox description of the game: "${robloxDesc}"` : '',
        ``,
        `Write the SEO description, realistic script features, and SEO tags for VoidHub's script page for this game.`,
        `Rules:`,
        `- Features must make sense for this game's actual gameplay. Use what you know about "${name}" on Roblox.`,
        `- Never mention any other script hub, executor brand, or competitor.`,
        `- Tone: confident and clean, no emojis, no clickbait.`,
      ]
        .filter(Boolean)
        .join('\n'),
      abortSignal: AbortSignal.timeout(20000),
    })

    return Response.json({
      description: output.description.slice(0, 160),
      suggestedFeatures: output.features.slice(0, 10),
      tags: output.tags.slice(0, 18),
      source: 'ai',
    })
  } catch (e) {
    console.log('[v0] generate-desc AI error:', e instanceof Error ? e.message : e)
    const fb = fallback(name)
    return Response.json({
      description: fb.description,
      suggestedFeatures: fb.features,
      tags: fb.tags,
      source: 'fallback',
    })
  }
}
