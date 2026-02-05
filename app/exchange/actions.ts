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
export async function addBuyback(data: {
  curatorId: number
  currency: string
  amount: number
  rate: number
  notes: string
}) {
  try {
    const eurEquivalent = data.amount * data.rate

    await sql`
      INSERT INTO buybacks (curator_id, currency, amount, rate, eur_equivalent, notes)
      VALUES (${data.curatorId}, ${data.currency}, ${data.amount}, ${data.rate}, ${eurEquivalent}, ${data.notes || null})
    `

    // Update curator balance
    if (data.currency === "RUB") {
      await sql`
        UPDATE curators 
        SET balance_rub = balance_rub + ${data.amount}
        WHERE id = ${data.curatorId}
      `
    } else if (data.currency === "EUR") {
      await sql`
        UPDATE curators 
        SET balance_eur = balance_eur + ${data.amount}
        WHERE id = ${data.curatorId}
      `
    } else if (data.currency === "USDT") {
      await sql`
        UPDATE curators 
        SET balance_usdt = balance_usdt + ${data.amount}
        WHERE id = ${data.curatorId}
      `
    }

    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error adding buyback:", error)
    return { success: false, error: "Failed to add buyback" }
  }
}

// Deal actions
export async function createDeal(data: {
  curatorId: number
  currencyFrom: string
  currencyTo: string
  amountFrom: number
  buybackRate: number
  sellRate: number
  notes: string
}) {
  try {
    const amountTo = data.amountFrom * data.sellRate
    const profitEur = data.amountFrom * data.sellRate - data.amountFrom * data.buybackRate
    const profitPercent = ((data.sellRate - data.buybackRate) / data.buybackRate) * 100

    await sql`
      INSERT INTO deals (
        curator_id, currency_from, currency_to, 
        amount_from, amount_to, buyback_rate, sell_rate,
        profit_eur, profit_percent, status, notes
      )
      VALUES (
        ${data.curatorId}, ${data.currencyFrom}, ${data.currencyTo},
        ${data.amountFrom}, ${amountTo}, ${data.buybackRate}, ${data.sellRate},
        ${profitEur}, ${profitPercent}, 'open', ${data.notes || null}
      )
    `

    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error creating deal:", error)
    return { success: false, error: "Failed to create deal" }
  }
}

export async function closeDeal(id: number, data: {
  sellRate: number
  notes: string
}) {
  try {
    // Get the deal first
    const [deal] = await sql`SELECT * FROM deals WHERE id = ${id}`
    
    if (!deal) {
      return { success: false, error: "Deal not found" }
    }

    const amountTo = parseFloat(deal.amount_from) * data.sellRate
    const profitEur = parseFloat(deal.amount_from) * data.sellRate - parseFloat(deal.amount_from) * parseFloat(deal.buyback_rate)
    const profitPercent = ((data.sellRate - parseFloat(deal.buyback_rate)) / parseFloat(deal.buyback_rate)) * 100

    await sql`
      UPDATE deals 
      SET 
        sell_rate = ${data.sellRate},
        amount_to = ${amountTo},
        profit_eur = ${profitEur},
        profit_percent = ${profitPercent},
        status = 'closed',
        closed_at = NOW(),
        notes = COALESCE(notes || ' | ', '') || ${data.notes || ''}
      WHERE id = ${id}
    `

    revalidatePath("/exchange")
    return { success: true }
  } catch (error) {
    console.error("Error closing deal:", error)
    return { success: false, error: "Failed to close deal" }
  }
}

// Get average buyback rate for a currency from a curator
export async function getAverageBuybackRate(curatorId: number, currency: string) {
  try {
    const [result] = await sql`
      SELECT 
        SUM(amount) as total_amount,
        SUM(eur_equivalent) as total_eur,
        CASE WHEN SUM(amount) > 0 THEN SUM(eur_equivalent) / SUM(amount) ELSE 0 END as avg_rate
      FROM buybacks
      WHERE curator_id = ${curatorId} AND currency = ${currency}
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("Error getting average rate:", error)
    return { success: false, error: "Failed to get average rate" }
  }
}

// Get curator stats
export async function getCuratorStats(curatorId: number) {
  try {
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM deals WHERE curator_id = ${curatorId}) as total_deals,
        (SELECT COUNT(*) FROM deals WHERE curator_id = ${curatorId} AND status = 'closed') as closed_deals,
        (SELECT COALESCE(SUM(profit_eur), 0) FROM deals WHERE curator_id = ${curatorId} AND status = 'closed') as total_profit,
        (SELECT COALESCE(SUM(eur_equivalent), 0) FROM buybacks WHERE curator_id = ${curatorId}) as total_buybacks
    `
    return { success: true, data: stats }
  } catch (error) {
    console.error("Error getting curator stats:", error)
    return { success: false, error: "Failed to get curator stats" }
  }
}
