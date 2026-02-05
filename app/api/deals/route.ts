import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const curatorId = searchParams.get("curator_id")

    let deals
    
    if (status && curatorId) {
      deals = await sql`
        SELECT d.*, c.name as curator_name
        FROM deals d
        LEFT JOIN curators c ON d.curator_id = c.id
        WHERE d.status = ${status} AND d.curator_id = ${parseInt(curatorId)}
        ORDER BY d.created_at DESC
      `
    } else if (status) {
      deals = await sql`
        SELECT d.*, c.name as curator_name
        FROM deals d
        LEFT JOIN curators c ON d.curator_id = c.id
        WHERE d.status = ${status}
        ORDER BY d.created_at DESC
      `
    } else if (curatorId) {
      deals = await sql`
        SELECT d.*, c.name as curator_name
        FROM deals d
        LEFT JOIN curators c ON d.curator_id = c.id
        WHERE d.curator_id = ${parseInt(curatorId)}
        ORDER BY d.created_at DESC
      `
    } else {
      deals = await sql`
        SELECT d.*, c.name as curator_name
        FROM deals d
        LEFT JOIN curators c ON d.curator_id = c.id
        ORDER BY d.created_at DESC
        LIMIT 100
      `
    }

    return NextResponse.json(deals)
  } catch (error) {
    console.error("Error fetching deals:", error)
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const {
      direction,
      client_nickname,
      client_telegram,
      requested_give_amount,
      requested_give_currency,
      requested_receive_amount,
      requested_receive_currency,
      requested_rate,
      curator_id,
      note
    } = data

    if (!direction) {
      return NextResponse.json({ error: "Direction is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO deals (
        direction,
        client_nickname,
        client_telegram,
        requested_give_amount,
        requested_give_currency,
        requested_receive_amount,
        requested_receive_currency,
        requested_rate,
        actual_give_amount,
        actual_give_currency,
        actual_receive_amount,
        actual_receive_currency,
        actual_rate,
        curator_id,
        note,
        status
      ) VALUES (
        ${direction},
        ${client_nickname || null},
        ${client_telegram || null},
        ${requested_give_amount || null},
        ${requested_give_currency || null},
        ${requested_receive_amount || null},
        ${requested_receive_currency || null},
        ${requested_rate || null},
        ${requested_give_amount || null},
        ${requested_give_currency || null},
        ${requested_receive_amount || null},
        ${requested_receive_currency || null},
        ${requested_rate || null},
        ${curator_id || null},
        ${note || null},
        'pending'
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating deal:", error)
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 })
  }
}
