import { NextResponse } from "next/server"

const HARDCODED_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbx8-vlEoFmhtOp4VgmXJlENa5TJkK4N9sd9rmOXqFkaJ-CDWd4UX6peB0AOcNyM-Ci56A/exec"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromCurrency, toCurrency, fromAmount, toAmount, rate, timestamp, telegramUsername, userContact } = body

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || HARDCODED_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets webhook URL not configured",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Sending order to Google Sheets webhook")

    const date = new Date(timestamp).toLocaleDateString("ru-RU", {
      timeZone: "Europe/Belgrade",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const clientContact = telegramUsername || userContact || "N/A"

    // Direction format: "USDT-EUR", "RUB-EUR", etc.
    const direction = `${fromCurrency}-${toCurrency}`

    // E1: incoming amount (what we receive from client = fromAmount)
    const incomingAmount = Number.parseFloat(fromAmount) || 0

    // F1: currency of incoming
    const incomingCurrency = fromCurrency

    // G1: incoming in USDT - only if fromCurrency is USDT, otherwise empty
    const incomingUsdt = fromCurrency === "USDT" ? incomingAmount : null

    // H1: EUR payout - EUR amount from order, empty if no EUR involved
    let eurPayout: number | null = null
    if (toCurrency === "EUR") {
      eurPayout = Number.parseFloat(toAmount) || 0
    } else if (fromCurrency === "EUR") {
      eurPayout = incomingAmount
    }

    console.log("[v0] Order data to send:", {
      date,
      client: clientContact,
      direction,
      incomingAmount,
      incomingCurrency,
      incomingUsdt,
      eurPayout,
    })

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        client: clientContact,
        direction,
        incomingAmount,
        incomingCurrency,
        incomingUsdt,
        eurPayout,
      }),
      redirect: "follow",
    })

    const responseText = await webhookResponse.text()
    console.log("[v0] Google Sheets response:", responseText)

    if (responseText.includes("<HTML>") || responseText.includes("<html>")) {
      console.error("[v0] Google Sheets webhook returned HTML redirect")
      console.error("[v0] Response:", responseText.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets webhook configuration error. Check Apps Script deployment settings.",
        },
        { status: 500 },
      )
    }

    try {
      const webhookResult = JSON.parse(responseText)
      console.log("[v0] Successfully sent order to Google Sheets:", webhookResult)

      if (webhookResult.success) {
        return NextResponse.json({
          success: true,
          message: "Order saved to Google Sheets successfully",
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            error: webhookResult.error || "Failed to save to Google Sheets",
          },
          { status: 500 },
        )
      }
    } catch (parseError) {
      console.log("[v0] Google Sheets webhook response (not JSON):", responseText)
      return NextResponse.json({
        success: true,
        message: "Order sent to Google Sheets",
      })
    }
  } catch (error) {
    console.error("[v0] Error saving order to Google Sheets:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save order to Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
