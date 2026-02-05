import { neon } from "@neondatabase/serverless"
import { ExchangeAdminPanel } from "@/components/exchange-admin-panel"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getData() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    const [curators, buybacks, deals, rates] = await Promise.all([
      sql`SELECT * FROM curators ORDER BY name`,
      sql`SELECT b.*, c.name as curator_name 
          FROM buybacks b 
          LEFT JOIN curators c ON b.curator_id = c.id 
          ORDER BY b.created_at DESC 
          LIMIT 100`,
      sql`SELECT d.*, c.name as curator_name 
          FROM deals d 
          LEFT JOIN curators c ON d.curator_id = c.id 
          ORDER BY d.created_at DESC 
          LIMIT 100`,
      sql`SELECT * FROM currency_rates WHERE is_active = true ORDER BY currency`,
    ])

    return { curators, buybacks, deals, rates }
  } catch (error) {
    console.error("[v0] Error loading exchange data:", error)
    return { curators: [], buybacks: [], deals: [], rates: [] }
  }
}

export default async function ExchangePage() {
  const data = await getData()
  const ts = Date.now()

  return (
    <div className="min-h-screen bg-background">
      <ExchangeAdminPanel key={ts} initialData={data} />
    </div>
  )
}
