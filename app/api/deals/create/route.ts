import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    const {
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      fromBank,
      toBank,
      rate,
      telegramUsername,
      city,
    } = body

    // Build direction string like "RUB_EUR", "USDT_EUR"
    const direction = `${fromCurrency}_${toCurrency}`

    const result = await sql`
      INSERT INTO deals (
        direction,
        client_nickname,
        client_telegram,
        city,
        requested_give_amount,
        requested_give_currency,
        requested_receive_amount,
        requested_receive_currency,
        requested_rate,
        bank_name,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${direction},
        ${telegramUsername || null},
        ${telegramUsername || null},
        ${city || null},
        ${parseFloat(fromAmount) || 0},
        ${fromCurrency},
        ${parseFloat(toAmount) || 0},
        ${toCurrency},
        ${parseFloat(rate) || 0},
        ${fromBank || toBank || null},
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id
    `

    console.log("[v0] Deal created in database:", result[0]?.id)

    return NextResponse.json({
      success: true,
      dealId: result[0]?.id,
      message: "Deal saved to database",
    })
  } catch (error) {
    console.error("[v0] Error creating deal:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
