import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Получить конкретную сделку
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dealId = parseInt(id)

    const deals = await sql`
      SELECT d.*, c.name as curator_name
      FROM deals d
      LEFT JOIN curators c ON d.curator_id = c.id
      WHERE d.id = ${dealId}
    `

    if (deals.length === 0) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(deals[0])
  } catch (error) {
    console.error("Error fetching deal:", error)
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
  }
}

// Обновить фактические данные сделки
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dealId = parseInt(id)
    const data = await request.json()

    const {
      actual_give_amount,
      actual_give_currency,
      actual_receive_amount,
      actual_receive_currency,
      actual_rate,
      curator_id,
      note,
      status
    } = data

    const updatedDeal = await sql`
      UPDATE deals
      SET 
        actual_give_amount = COALESCE(${actual_give_amount}, actual_give_amount),
        actual_give_currency = COALESCE(${actual_give_currency}, actual_give_currency),
        actual_receive_amount = COALESCE(${actual_receive_amount}, actual_receive_amount),
        actual_receive_currency = COALESCE(${actual_receive_currency}, actual_receive_currency),
        actual_rate = COALESCE(${actual_rate}, actual_rate),
        curator_id = COALESCE(${curator_id}, curator_id),
        note = COALESCE(${note}, note),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${dealId}
      RETURNING *
    `

    if (updatedDeal.length === 0) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(updatedDeal[0])
  } catch (error) {
    console.error("Error updating deal:", error)
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 })
  }
}

// Удалить/отменить сделку
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dealId = parseInt(id)

    await sql`
      UPDATE deals
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${dealId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling deal:", error)
    return NextResponse.json({ error: "Failed to cancel deal" }, { status: 500 })
  }
}
