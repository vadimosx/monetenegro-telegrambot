"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Refresh all data
export async function refreshData() {
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

    return { success: true, data: { curators, buybacks, deals, rates } }
  } catch (error) {
    console.error("Error refreshing data:", error)
    return { success: false, error: "Failed to refresh data" }
  }
}

// Curator actions
export async function addCurator(data: { 
  name: string
  telegram: string
  phone: string
  notes: string 
}) {
  try {
    await sql`
      INSERT INTO curators (name, telegram_username, phone, notes)
      VALUES (${data.name}, ${data.telegram || null}, ${data.phone || null}, ${data.notes || null})
    `
    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error adding curator:", error)
    return { success: false, error: "Failed to add curator" }
  }
}

export async function updateCurator(id: number, data: { 
  name: string
  telegram: string
  phone: string
  notes: string
  isActive: boolean 
}) {
  try {
    await sql`
      UPDATE curators 
      SET 
        name = ${data.name},
        telegram_username = ${data.telegram || null},
        phone = ${data.phone || null},
        notes = ${data.notes || null},
        is_active = ${data.isActive}
      WHERE id = ${id}
    `
    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error updating curator:", error)
    return { success: false, error: "Failed to update curator" }
  }
}

export async function deleteCurator(id: number) {
  try {
    await sql`DELETE FROM curators WHERE id = ${id}`
    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error deleting curator:", error)
    return { success: false, error: "Failed to delete curator" }
  }
}

// Buyback actions
// Откуп = покупка EUR за USDT у куратора
// eur_amount - сколько EUR купили
// usdt_spent - сколько USDT потратили  
// rate - курс (USDT за 1 EUR)
export async function addBuyback(data: {
  curatorId: number
  eurAmount: number
  usdtSpent: number
  rate: number
  notes: string
}) {
  try {
    // Get curator's current EUR balance and avg rate
    const [curator] = await sql`SELECT balance_eur FROM curators WHERE id = ${data.curatorId}`
    if (!curator) return { success: false, error: "Куратор не найден" }

    const eurBalanceBefore = parseFloat(curator.balance_eur) || 0
    const eurBalanceAfter = eurBalanceBefore + data.eurAmount

    // Calculate new average rate
    // avgRateBefore * eurBalanceBefore + newRate * newEurAmount / eurBalanceAfter
    const [avgResult] = await sql`
      SELECT COALESCE(
        CASE WHEN SUM(eur_amount) > 0 
          THEN SUM(usdt_spent) / SUM(eur_amount) 
          ELSE 0 
        END, 0
      ) as avg_rate
      FROM buybacks WHERE curator_id = ${data.curatorId}
    `
    const avgRateBefore = parseFloat(avgResult?.avg_rate) || 0
    const totalUsdtSpent = avgRateBefore * eurBalanceBefore + data.usdtSpent
    const avgRateAfter = eurBalanceAfter > 0 ? totalUsdtSpent / eurBalanceAfter : data.rate

    await sql`
      INSERT INTO buybacks (curator_id, eur_amount, usdt_spent, rate, eur_balance_before, eur_balance_after, avg_rate_before, avg_rate_after, notes)
      VALUES (${data.curatorId}, ${data.eurAmount}, ${data.usdtSpent}, ${data.rate}, ${eurBalanceBefore}, ${eurBalanceAfter}, ${avgRateBefore}, ${avgRateAfter}, ${data.notes || null})
    `

    // Update curator EUR balance
    await sql`UPDATE curators SET balance_eur = ${eurBalanceAfter} WHERE id = ${data.curatorId}`

    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error adding buyback:", error)
    return { success: false, error: "Failed to add buyback" }
  }
}

// Close deal - assign curator, enter actual amounts, calculate profit, deduct balance
export async function closeDeal(id: number, data: {
  curatorId: number
  actualGiveAmount: number
  actualGiveCurrency: string
  actualReceiveAmount: number
  actualReceiveCurrency: string
  actualRate: number
  eurCostAtDeal: number
  note: string
}) {
  try {
    // Get the deal first
    const [deal] = await sql`SELECT * FROM deals WHERE id = ${id}`
    if (!deal) {
      return { success: false, error: "Deal not found" }
    }

    // Calculate profit
    // profit = what client pays (in EUR terms) - what we give (in EUR terms)
    const profitTotal = data.actualGiveAmount * data.actualRate - data.actualGiveAmount * data.eurCostAtDeal

    await sql`
      UPDATE deals 
      SET 
        curator_id = ${data.curatorId},
        actual_give_amount = ${data.actualGiveAmount},
        actual_give_currency = ${data.actualGiveCurrency},
        actual_receive_amount = ${data.actualReceiveAmount},
        actual_receive_currency = ${data.actualReceiveCurrency},
        actual_rate = ${data.actualRate},
        eur_cost_at_deal = ${data.eurCostAtDeal},
        profit_total = ${profitTotal},
        status = 'closed',
        completed_at = NOW(),
        updated_at = NOW(),
        note = CASE WHEN note IS NOT NULL AND note != '' THEN note || ' | ' || ${data.note || ''} ELSE ${data.note || null} END
      WHERE id = ${id}
    `

    // Deduct from curator balance (the currency they gave us)
    if (data.actualGiveCurrency === "RUB") {
      await sql`UPDATE curators SET balance_rub = balance_rub - ${data.actualGiveAmount} WHERE id = ${data.curatorId}`
    } else if (data.actualGiveCurrency === "EUR") {
      await sql`UPDATE curators SET balance_eur = balance_eur - ${data.actualGiveAmount} WHERE id = ${data.curatorId}`
    } else if (data.actualGiveCurrency === "USDT") {
      await sql`UPDATE curators SET balance_usdt = balance_usdt - ${data.actualGiveAmount} WHERE id = ${data.curatorId}`
    }

    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error closing deal:", error)
    return { success: false, error: "Failed to close deal" }
  }
}

// Get average buyback rate (USDT/EUR) for a curator
export async function getAverageBuybackRate(curatorId: number) {
  try {
    const [result] = await sql`
      SELECT 
        SUM(eur_amount) as total_eur,
        SUM(usdt_spent) as total_usdt,
        CASE WHEN SUM(eur_amount) > 0 THEN SUM(usdt_spent) / SUM(eur_amount) ELSE 0 END as avg_rate
      FROM buybacks
      WHERE curator_id = ${curatorId}
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error getting average rate:", error)
    return { success: false, error: "Failed to get average rate" }
  }
}
