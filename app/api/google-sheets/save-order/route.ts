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

    const payload = {
      date,
      client: clientContact,
      direction,
      incomingAmount,
      incomingCurrency,
      incomingUsdt,
      eurPayout,
    }

    const params = new URLSearchParams()
    params.set("data", JSON.stringify(payload))
    const getUrl = `${webhookUrl}?${params.toString()}`

    console.log("[v0] Sending to Apps Script via GET")

    // Apps Script returns HTML with redirect - we need to follow it manually
    let responseText = ""
    const maxRedirects = 5
    let currentUrl = getUrl

    for (let i = 0; i < maxRedirects; i++) {
      const res = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
      })

      // Check for HTTP redirect (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.status)) {
        const location = res.headers.get("location")
        if (location) {
          console.log(`[v0] HTTP redirect ${res.status} to: ${location.substring(0, 100)}...`)
          currentUrl = location
          continue
        }
      }

      responseText = await res.text()

      // Check for HTML meta/JS redirect
      const hrefMatch = responseText.match(/HREF="([^"]+)"/)
      if (hrefMatch && hrefMatch[1]) {
        const redirectUrl = hrefMatch[1].replace(/&amp;/g, "&")
        console.log(`[v0] HTML redirect to: ${redirectUrl.substring(0, 100)}...`)
        currentUrl = redirectUrl
        continue
      }

      // No more redirects - we have the final response
      break
    }

    console.log("[v0] Google Sheets final response:", responseText.substring(0, 200))

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
