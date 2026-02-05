import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const curators = await sql`
      SELECT 
        id,
        name,
        telegram_username,
        eur_balance,
        total_eur_purchased,
        total_usdt_spent,
        avg_eur_cost,
        profit_usdt,
        is_active,
        created_at,
        updated_at
      FROM curators
      WHERE is_active = true
      ORDER BY name ASC
    `
    return NextResponse.json(curators)
  } catch (error) {
    console.error("Error fetching curators:", error)
    return NextResponse.json({ error: "Failed to fetch curators" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, telegram_username } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO curators (name, telegram_username)
      VALUES (${name}, ${telegram_username || null})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating curator:", error)
    return NextResponse.json({ error: "Failed to create curator" }, { status: 500 })
  }
}
