import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Закрытие сделки с расчётом прибыли
export async function POST(
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
      usdt_received,
      eur_given,
      curator_id
    } = data

    if (!curator_id || !eur_given || !usdt_received) {
      return NextResponse.json(
        { error: "Curator ID, EUR given and USDT received are required" },
        { status: 400 }
      )
    }

    // Получаем данные куратора
    const curatorData = await sql`
      SELECT id, eur_balance, avg_eur_cost, profit_usdt
      FROM curators WHERE id = ${curator_id}
    `

    if (curatorData.length === 0) {
      return NextResponse.json({ error: "Curator not found" }, { status: 404 })
    }

    const curator = curatorData[0]
    
    // Проверяем достаточность баланса
    if (Number(curator.eur_balance) < eur_given) {
      return NextResponse.json(
        { error: `Insufficient EUR balance. Available: ${curator.eur_balance}` },
        { status: 400 }
      )
    }

    const eurCostAtDeal = Number(curator.avg_eur_cost)
    
    // Расчёт прибыли
    // Себестоимость выданных EUR
    const eurCostInUsdt = eur_given * eurCostAtDeal
    // Общая прибыль = полученные USDT - себестоимость EUR
    const profitTotal = usdt_received - eurCostInUsdt
    // 40% куратору
    const profitCurator = profitTotal * 0.4
    // 60% агентству
    const profitAgency = profitTotal * 0.6

    // Обновляем сделку
    const updatedDeal = await sql`
      UPDATE deals
      SET 
        actual_give_amount = ${actual_give_amount || null},
        actual_give_currency = ${actual_give_currency || null},
        actual_receive_amount = ${actual_receive_amount || null},
        actual_receive_currency = ${actual_receive_currency || null},
        actual_rate = ${actual_rate || null},
        usdt_received = ${usdt_received},
        eur_given = ${eur_given},
        eur_cost_at_deal = ${eurCostAtDeal},
        profit_total = ${profitTotal},
        profit_curator = ${profitCurator},
        profit_agency = ${profitAgency},
        curator_id = ${curator_id},
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${dealId}
      RETURNING *
    `

    // Обновляем баланс куратора
    const newEurBalance = Number(curator.eur_balance) - eur_given
    const newProfitUsdt = Number(curator.profit_usdt) + profitCurator

    await sql`
      UPDATE curators
      SET 
        eur_balance = ${newEurBalance},
        profit_usdt = ${newProfitUsdt},
        updated_at = NOW()
      WHERE id = ${curator_id}
    `

    return NextResponse.json({
      deal: updatedDeal[0],
      profit: {
        eur_cost_at_deal: eurCostAtDeal,
        eur_cost_in_usdt: eurCostInUsdt,
        profit_total: profitTotal,
        profit_curator: profitCurator,
        profit_agency: profitAgency
      },
      curator: {
        new_eur_balance: newEurBalance,
        new_profit_usdt: newProfitUsdt
      }
    })
  } catch (error) {
    console.error("Error completing deal:", error)
    return NextResponse.json(
      { error: "Failed to complete deal" },
      { status: 500 }
    )
  }
}
