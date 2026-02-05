import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Откуп EUR - пополнение баланса куратора
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const curatorId = parseInt(id)
    const { eur_amount, usdt_spent, note } = await request.json()

    if (!eur_amount || !usdt_spent) {
      return NextResponse.json(
        { error: "EUR amount and USDT spent are required" },
        { status: 400 }
      )
    }

    const rate = usdt_spent / eur_amount

    // Получаем текущие данные куратора
    const curatorData = await sql`
      SELECT eur_balance, total_eur_purchased, total_usdt_spent
      FROM curators WHERE id = ${curatorId}
    `

    if (curatorData.length === 0) {
      return NextResponse.json({ error: "Curator not found" }, { status: 404 })
    }

    const curator = curatorData[0]
    const newEurBalance = Number(curator.eur_balance) + eur_amount
    const newTotalEurPurchased = Number(curator.total_eur_purchased) + eur_amount
    const newTotalUsdtSpent = Number(curator.total_usdt_spent) + usdt_spent
    
    // Считаем среднюю себестоимость EUR
    const newAvgCost = newTotalUsdtSpent / newTotalEurPurchased

    // Записываем откуп
    await sql`
      INSERT INTO eur_purchases (curator_id, eur_amount, usdt_spent, rate, note)
      VALUES (${curatorId}, ${eur_amount}, ${usdt_spent}, ${rate}, ${note || null})
    `

    // Обновляем баланс куратора
    const updatedCurator = await sql`
      UPDATE curators
      SET 
        eur_balance = ${newEurBalance},
        total_eur_purchased = ${newTotalEurPurchased},
        total_usdt_spent = ${newTotalUsdtSpent},
        avg_eur_cost = ${newAvgCost},
        updated_at = NOW()
      WHERE id = ${curatorId}
      RETURNING *
    `

    return NextResponse.json({
      curator: updatedCurator[0],
      purchase: {
        eur_amount,
        usdt_spent,
        rate,
        new_avg_cost: newAvgCost
      }
    })
  } catch (error) {
    console.error("Error processing EUR purchase:", error)
    return NextResponse.json(
      { error: "Failed to process EUR purchase" },
      { status: 500 }
    )
  }
}

// Получить историю откупов куратора
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const curatorId = parseInt(id)

    const purchases = await sql`
      SELECT *
      FROM eur_purchases
      WHERE curator_id = ${curatorId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(purchases)
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    )
  }
}
