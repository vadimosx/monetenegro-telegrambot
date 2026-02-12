"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpDown, Calculator } from "lucide-react"

interface ExchangeCalculatorUnifiedProps {
  onOrderCreate: () => void
  showTechnicalInfo?: boolean
  selectedCity?: string
  getCityName?: (cityId: string) => string
}

interface MarginTier {
  min: number
  max: number | null | undefined
  margin: number
}

const currencies = [
  { value: "USDT", label: "USDT" },
  { value: "EUR", label: "EUR" },
  { value: "RUB", label: "RUB" },
]

const exchangeDirections = [
  { id: "usdt-eur", from: "USDT", to: "EUR", name: "USDT → EUR", banks: [] },
  { id: "eur-usdt", from: "EUR", to: "USDT", name: "EUR → USDT", banks: [] },
  {
    id: "rub-eur",
    from: "RUB",
    to: "EUR",
    name: "RUB → EUR",
    banks: ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"],
  },
  {
    id: "eur-rub",
    from: "EUR",
    to: "RUB",
    name: "EUR → RUB",
    banks: ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"],
  },
  { id: "usdt-rub", from: "USDT", to: "RUB", name: "USDT → RUB", banks: [] },
  { id: "rub-usdt", from: "RUB", to: "USDT", name: "RUB → USDT", banks: [] },
]

export function ExchangeCalculatorUnified({
  onOrderCreate,
  showTechnicalInfo = false,
  selectedCity = "budva",
  getCityName,
}: ExchangeCalculatorUnifiedProps) {
  const [fromCurrency, setFromCurrency] = useState("USDT")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [fromBank, setFromBank] = useState("")
  const [toBank, setToBank] = useState("")
  const [amount, setAmount] = useState("1")
  const [toAmount, setToAmount] = useState("")
  const [telegramUsername, setTelegramUsername] = useState<string>("")
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)
  const [contactInput, setContactInput] = useState<string>("")
  const [lastEdited, setLastEdited] = useState<"from" | "to">("from")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [realUsdEurRate, setRealUsdEurRate] = useState<number>(0)
  const [rubRate, setRubRate] = useState<number | null>(null)

  const [usdtEurPercentage, setUsdtEurPercentage] = useState<number>(0)
  const [rubEurTiers, setRubEurTiers] = useState<MarginTier[]>([])
  const [usdtEurTiers, setUsdtEurTiers] = useState<MarginTier[]>([])
  const [sendingOrder, setSendingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateSource, setRateSource] = useState<"binance" | "fix" | "last-binance" | null>(null) // Removed "fallback", added "last-binance"
  const [isRateCached, setIsRateCached] = useState(false)

  useEffect(() => {
    const fetchUsdEurRate = async () => {
      setRateLoading(true)
      try {
        const sheetResponse = await fetch(`/api/rub-rate?_=${Date.now()}`, {
          cache: "no-store",
        })
        const sheetData = await sheetResponse.json()

        if (sheetData.fixUsdEurRate && sheetData.fixUsdEurRate > 0) {
          setRealUsdEurRate(sheetData.fixUsdEurRate)
          setRateSource("fix")
          console.log(`[v0] Using FIX rate from D2: ${sheetData.fixUsdEurRate.toFixed(6)} USD/EUR`)
          setRateLoading(false)
          return
        }

        // Check cache first - if less than 5 minutes, use cached rate
        const lastBinanceRate = typeof window !== "undefined" ? localStorage.getItem("lastBinanceRate") : null
        const lastBinanceTime = typeof window !== "undefined" ? localStorage.getItem("lastBinanceTime") : null

        if (lastBinanceRate && lastBinanceTime) {
          const timeElapsed = Date.now() - Number.parseInt(lastBinanceTime)
          const minutesElapsed = Math.floor(timeElapsed / 1000 / 60)

          // Use cached rate if less than 5 minutes old
          if (timeElapsed < 5 * 60 * 1000) {
            const rate = Number.parseFloat(lastBinanceRate)
            setRealUsdEurRate(rate)
            setRateSource("binance")
            setIsRateCached(true)

            console.log(`[v0] Using cached Binance rate (${minutesElapsed} min old): ${rate.toFixed(6)} USD/EUR`)
            setRateLoading(false)
            return
          }
        }

        // If no FIX rate in D2, fetch from server-side API (which has fallbacks)
        console.log("[v0] No FIX rate in D2, fetching from server API...")

        try {
          const response = await fetch(`/api/rate?_=${Date.now()}`, { cache: "no-store" })

          if (!response.ok) {
            console.log(`[v0] Server API returned status ${response.status}`)
            throw new Error(`Server API error: ${response.status}`)
          }

          const data = await response.json()

          if (data.ok && data.usd_eur) {
            // Server returns USD/EUR rate (e.g., 0.92)
            // For USDT/EUR we use the same rate (USDT ≈ USD)
            const usdtEurRate = data.usd_eur
            setRealUsdEurRate(usdtEurRate)
            setRateSource("binance")
            setIsRateCached(false)

            if (typeof window !== "undefined") {
              localStorage.setItem("lastBinanceRate", usdtEurRate.toString())
              localStorage.setItem("lastBinanceTime", Date.now().toString())
            }

            console.log(
              `[v0] Successfully fetched from server API: ${usdtEurRate.toFixed(6)} USD/EUR`,
            )
            setRateLoading(false)
            return
          }
        } catch (apiError) {
          console.log("[v0] Server API failed, attempting to use cached rate")

          if (lastBinanceRate) {
            const rate = Number.parseFloat(lastBinanceRate)
            const timeAgo = lastBinanceTime
              ? Math.floor((Date.now() - Number.parseInt(lastBinanceTime)) / 1000 / 60)
              : 0
            setRealUsdEurRate(rate)
            setRateSource("binance")
            setIsRateCached(true)
            console.log(`[v0] Using cached rate from ${timeAgo} minutes ago: ${rate.toFixed(6)} USDT/EUR`)
            setRateLoading(false)
            return
          }

          console.error("[v0] Server API unavailable and no cached rate, using fallback 0.92")
          setRealUsdEurRate(0.92) // Fallback USD/EUR rate
          setRateSource("binance")
          setIsRateCached(true)
          setRateLoading(false)
          return
        }
      } catch (error) {
        console.error("[v0] ⚠️ Critical error in fetchUsdEurRate:", error)
        setRealUsdEurRate(0.86)
        setRateSource("binance")
        setIsRateCached(true)
      } finally {
        setRateLoading(false)
      }
    }

    fetchUsdEurRate()
    // Check Binance cache every 5 minutes instead of 30 seconds
    const interval = setInterval(fetchUsdEurRate, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/rub-rate?_=${timestamp}`, {
          cache: "no-store",
        })
        const data = await response.json()

        if (data.rubRate) setRubRate(data.rubRate)
        if (data.usdtEurPercentage !== undefined) setUsdtEurPercentage(data.usdtEurPercentage)
        if (data.rubEurTiers) setRubEurTiers(data.rubEurTiers)
        if (data.usdtEurTiers) setUsdtEurTiers(data.usdtEurTiers)
      } catch (error) {
        console.error("[v0] Error fetching rates:", error)
      }
    }

    fetchRates()
    const interval = setInterval(fetchRates, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const tryGetTelegramUser = () => {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        console.log("[v0] Telegram WebApp not found on window")
        return false
      }

      tg.ready()
      setIsTelegramWebApp(true)
      console.log("[v0] Telegram WebApp found, initDataUnsafe:", JSON.stringify(tg.initDataUnsafe))

      const user = tg.initDataUnsafe?.user
      if (user) {
        const username = user.username ? `@${user.username}` : user.first_name || `id_${user.id}`
        console.log("[v0] Telegram user detected:", username)
        setTelegramUsername(username)
        setTelegramUserId(user.id)
        return true
      }
      console.log("[v0] Telegram WebApp exists but no user data")
      return false
    }

    // Try immediately
    if (!tryGetTelegramUser()) {
      // Retry - Telegram WebApp SDK may load after our code
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (tryGetTelegramUser() || attempts >= 20) {
          clearInterval(interval)
          if (attempts >= 20) {
            console.log("[v0] Gave up waiting for Telegram user data after 20 attempts")
          }
        }
      }, 500)
      return () => clearInterval(interval)
    }
  }, [])

  const currentDirection = exchangeDirections.find((d) => d.from === fromCurrency && d.to === toCurrency)
  const selectedDirection = currentDirection?.id || ""

  const getRubMargin = (eurAmount: number): number => {
    if (rubEurTiers.length === 0) {
      return eurAmount <= 50 ? 0.015 : 0.01
    }

    for (const tier of rubEurTiers) {
      if (tier.max === null || tier.max === Number.POSITIVE_INFINITY) {
        if (eurAmount >= tier.min) {
          return Math.abs(tier.margin) / 100
        }
      } else if (eurAmount >= tier.min && eurAmount < tier.max) {
        return Math.abs(tier.margin) / 100
      }
    }

    const lastTier = rubEurTiers[rubEurTiers.length - 1]
    return Math.abs(lastTier.margin) / 100
  }

  const getUsdtMargin = (eurAmount: number): number => {
    if (usdtEurTiers.length === 0) {
      return eurAmount <= 5000 ? 0.015 : 0.01
    }

    for (const tier of usdtEurTiers) {
      if (tier.max === null || tier.max === Number.POSITIVE_INFINITY) {
        if (eurAmount >= tier.min) {
          return Math.abs(tier.margin) / 100
        }
      } else if (eurAmount >= tier.min && eurAmount < tier.max) {
        return Math.abs(tier.margin) / 100
      }
    }

    const lastTier = usdtEurTiers[usdtEurTiers.length - 1]
    return Math.abs(lastTier.margin) / 100
  }

  // Unified helper function to convert USDT to EUR (used by all directions)
  // Returns EUR amount for given USDT amount with margin applied
  const convertUsdtToEur = (usdtAmount: number): number => {
    const baseRate = realUsdEurRate // USDT/EUR (e.g., 0.86)
    // For Binance mode: apply buyback B2 to rate
    const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
    const eurAmountBeforeMargin = usdtAmount * effectiveRate
    const margin = getUsdtMargin(eurAmountBeforeMargin)
    return eurAmountBeforeMargin * (1 - margin)
  }

  // Unified helper function to convert EUR to USDT (used by all directions)
  // Returns USDT amount for given EUR amount with margin applied
  const convertEurToUsdt = (eurAmount: number): number => {
    const baseRate = realUsdEurRate // USDT/EUR (e.g., 0.86)
    // For Binance mode: apply buyback B2 to rate
    const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
    const usdtAmountBeforeMargin = eurAmount / effectiveRate
    const margin = getUsdtMargin(eurAmount) // Margin based on EUR amount
    return usdtAmountBeforeMargin * (1 - margin)
  }

  const getExchangeRate = (selectedDirection: string, amount: string): number | null => {
    if (!realUsdEurRate || !rubRate) return null

    // For Binance mode, add buyback percentage
    const shouldAddBuyback = rateSource !== "fix"

    if (selectedDirection === "eur-usdt" && realUsdEurRate) {
      // EUR → USDT using unified helper
      const eurAmount = Number.parseFloat(amount) || 0
      const usdtAmount = convertEurToUsdt(eurAmount)
      return usdtAmount / eurAmount
    } else if (selectedDirection === "usdt-eur" && realUsdEurRate) {
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurAmount = convertUsdtToEur(usdtAmount)
      return eurAmount / usdtAmount
    } else if ((selectedDirection === "rub-eur" || selectedDirection === "eur-rub") && realUsdEurRate && rubRate) {
      if (selectedDirection === "rub-eur") {
        // RUB → EUR: RUB / rubRate = USDT, then USDT → EUR
        const rubAmount = Number.parseFloat(amount) || 0
        const usdtAmount = rubAmount / rubRate
        const eurAmount = convertUsdtToEur(usdtAmount)
        return eurAmount / rubAmount
      } else {
        // EUR → RUB: EUR → USDT, then USDT * rubRate = RUB
        const eurAmount = Number.parseFloat(amount) || 0
        const usdtAmount = convertEurToUsdt(eurAmount)
        const rubAmount = usdtAmount * rubRate
        return rubAmount / eurAmount
      }
    } else if (selectedDirection === "usdt-rub" && rubRate) {
      // USDT → RUB: USDT * rubRate, then apply margin
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurEquivalent = usdtAmount * realUsdEurRate
      const margin = getRubMargin(eurEquivalent)
      return rubRate * (1 - margin)
    } else if (selectedDirection === "rub-usdt" && rubRate && realUsdEurRate) {
      // RUB → USDT: RUB / rubRate, then apply margin
      const rubAmount = Number.parseFloat(amount) || 0
      const usdtAmountBeforeMargin = rubAmount / rubRate
      const eurEquivalent = usdtAmountBeforeMargin * realUsdEurRate
      const margin = getUsdtMargin(eurEquivalent)
      return (1 / rubRate) * (1 - margin)
    }

    return null
  }

  // Reverse calculation: given toAmount, calculate fromAmount
  const getReverseFromAmount = (selectedDirection: string, toAmountStr: string): number | null => {
    const toAmt = Number.parseFloat(toAmountStr) || 0
    if (toAmt <= 0 || !realUsdEurRate) return null

    if (selectedDirection === "usdt-eur") {
      // toAmt is EUR, need to find USDT
      // EUR = USDT * effectiveRate * (1 - margin)
      // We iterate: guess USDT, compute EUR, adjust
      const baseRate = realUsdEurRate
      const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
      // Initial guess without margin
      let usdtGuess = toAmt / effectiveRate
      for (let i = 0; i < 5; i++) {
        const eurResult = convertUsdtToEur(usdtGuess)
        usdtGuess = usdtGuess * (toAmt / eurResult)
      }
      return usdtGuess
    } else if (selectedDirection === "eur-usdt") {
      // toAmt is USDT, need to find EUR
      const baseRate = realUsdEurRate
      const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
      let eurGuess = toAmt * effectiveRate
      for (let i = 0; i < 5; i++) {
        const usdtResult = convertEurToUsdt(eurGuess)
        eurGuess = eurGuess * (toAmt / usdtResult)
      }
      return eurGuess
    } else if (selectedDirection === "rub-eur" && rubRate) {
      // toAmt is EUR, need RUB
      // RUB / rubRate = USDT, USDT -> EUR
      // Reverse: find USDT that gives toAmt EUR, then USDT * rubRate = RUB
      const baseRate = realUsdEurRate
      const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
      let usdtGuess = toAmt / effectiveRate
      for (let i = 0; i < 5; i++) {
        const eurResult = convertUsdtToEur(usdtGuess)
        usdtGuess = usdtGuess * (toAmt / eurResult)
      }
      return usdtGuess * rubRate
    } else if (selectedDirection === "eur-rub" && rubRate) {
      // toAmt is RUB, need EUR
      // EUR -> USDT, USDT * rubRate = RUB
      const baseRate = realUsdEurRate
      const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
      let eurGuess = toAmt / rubRate * effectiveRate
      for (let i = 0; i < 5; i++) {
        const usdtFromEur = convertEurToUsdt(eurGuess)
        const rubResult = usdtFromEur * rubRate
        eurGuess = eurGuess * (toAmt / rubResult)
      }
      return eurGuess
    } else if (selectedDirection === "usdt-rub" && rubRate) {
      // toAmt is RUB, need USDT
      // USDT * rubRate * (1 - margin) = RUB
      let usdtGuess = toAmt / rubRate
      for (let i = 0; i < 5; i++) {
        const eurEquivalent = usdtGuess * realUsdEurRate
        const margin = getRubMargin(eurEquivalent)
        const rubResult = usdtGuess * rubRate * (1 - margin)
        usdtGuess = usdtGuess * (toAmt / rubResult)
      }
      return usdtGuess
    } else if (selectedDirection === "rub-usdt" && rubRate) {
      // toAmt is USDT, need RUB
      // RUB / rubRate = USDT_before, USDT_before * (1 - margin) = USDT
      let rubGuess = toAmt * rubRate
      for (let i = 0; i < 5; i++) {
        const usdtBeforeMargin = rubGuess / rubRate
        const eurEquivalent = usdtBeforeMargin * realUsdEurRate
        const margin = getUsdtMargin(eurEquivalent)
        const usdtResult = usdtBeforeMargin * (1 - margin)
        rubGuess = rubGuess * (toAmt / usdtResult)
      }
      return rubGuess
    }

    return null
  }

  const rate = getExchangeRate(selectedDirection, amount)

  const getPerUnitRateDisplay = () => {
    if (!selectedDirection || rate === null) return null

    if (selectedDirection === "rub-eur") {
      const eurPerRub = rate
      const rubPerEur = 1 / eurPerRub
      return `1 EUR = ${rubPerEur.toFixed(2)} RUB`
    } else if (selectedDirection === "eur-rub") {
      const rubPerEur = rate
      return `1 EUR = ${rubPerEur.toFixed(2)} RUB`
    }

    if (selectedDirection === "usdt-eur") {
      return `1 USDT = ${rate.toFixed(4)} EUR`
    } else if (selectedDirection === "eur-usdt") {
      return `1 EUR = ${rate.toFixed(4)} USDT`
    }

    if (selectedDirection === "usdt-rub") {
      return `1 USDT = ${rate.toFixed(2)} RUB`
    } else if (selectedDirection === "rub-usdt") {
      return `1 RUB = ${rate.toFixed(4)} USDT`
    }

    return null
  }

  useEffect(() => {
    const decimals = 1

    if (lastEdited === "from" && amount) {
      if (rate !== null) {
        const calculated = (Number.parseFloat(amount) * rate).toFixed(decimals)
        setToAmount(calculated)
      }
    } else if (lastEdited === "to" && toAmount) {
      const reverseFrom = getReverseFromAmount(selectedDirection, toAmount)
      if (reverseFrom !== null) {
        setAmount(reverseFrom.toFixed(decimals))
      } else if (rate !== null && rate !== 0) {
        setAmount((Number.parseFloat(toAmount) / rate).toFixed(decimals))
      }
    }
  }, [amount, toAmount, rate, lastEdited, selectedDirection, realUsdEurRate, rubRate, usdtEurPercentage, rateSource])

  const getBanksForCurrency = (currency: string) => {
    if (currency === "RUB") {
      return ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"]
    }
    return []
  }

  const handleSwap = () => {
    const tempFrom = fromCurrency
    const tempFromBank = fromBank
    setFromCurrency(toCurrency)
    setToCurrency(tempFrom)
    setFromBank(toBank)
    setToBank(tempFromBank)
    setLastEdited("from")
  }

  const handleExchange = () => {
    if (fromCurrency && toCurrency && amount) {
      setShowConfirmation(true)
    }
  }

  const handleConfirmOrder = async () => {
    const finalContact = telegramUsername || contactInput

    if (!finalContact) {
      setOrderError("Пожалуйста, введите контакт для связи")
      return
    }

    setSendingOrder(true)
    setOrderError(null)

    try {
      const telegramResponse = await fetch("/api/telegram/send-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: toAmount,
          fromBank: fromBank || null,
          toBank: toBank || null,
          rate: rate !== null ? rate.toFixed(6) : "0",
          telegramUsername: finalContact,
          telegramUserId: telegramUserId,
          isTelegramWebApp: isTelegramWebApp,
          city: getCityName ? getCityName(selectedCity) : selectedCity,
        }),
      })

      const telegramData = await telegramResponse.json()

      if (!telegramResponse.ok) {
        setOrderError(telegramData.error || "Ошибка при отправке заявки")
        return
      }

      const sheetsResponse = await fetch("/api/google-sheets/save-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: toAmount,
          fromBank: fromBank || "N/A",
          toBank: toBank || "N/A",
          rate: rate !== null ? rate.toFixed(6) : "0",
          timestamp: new Date().toISOString(),
          telegramUsername: finalContact,
        }),
      })

      if (!sheetsResponse.ok) {
        console.log("[v0] Failed to save order to Google Sheets, but continuing...")
      }

      alert("Спасибо за вашу заявку! С вами свяжется оператор в ближайшее время.")

      onOrderCreate()
      setShowConfirmation(false)
      setAmount("")
      setToAmount("")
      setFromCurrency("")
      setToCurrency("")
      setFromBank("")
      setToBank("")
      setContactInput("")
    } catch (error) {
      setOrderError("Ошибка сети при отправке заявки")
    } finally {
      setSendingOrder(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
      setLastEdited("from")
    }
  }

  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setToAmount(value)
      setLastEdited("to")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3 px-4">
        <Calculator className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Exchange Calculator</h2>
      </div>

      {showTechnicalInfo && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Источник курса:</span>
            <span className="font-medium text-foreground">
              {rateSource === "fix"
                ? `🔒 FIX Mode (table D2) | ${realUsdEurRate.toFixed(4)}`
                : rateSource === "last-binance"
                  ? `📊 Binance (cached) (${usdtEurPercentage > 0 ? "+" : ""}${usdtEurPercentage}%) | ${realUsdEurRate.toFixed(4)}`
                  : `📊 Binance (${usdtEurPercentage > 0 ? "+" : ""}${usdtEurPercentage}%) | ${realUsdEurRate.toFixed(4)}`}
            </span>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 mx-4">
        <div className="space-y-1">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1.5 block text-center">From</label>
            <div className="flex items-center justify-center gap-3">
              <Input
                type="number"
                placeholder="1"
                value={amount}
                onChange={handleAmountChange}
                className="bg-black/50 border-gray-600 text-white text-lg h-9 text-center flex-1 max-w-32"
              />
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 flex-1 max-w-32">
                  <SelectValue placeholder="USDT" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value} className="text-white">
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fromCurrency === "RUB" && (
              <div className="mt-3">
                <Select value={fromBank} onValueChange={setFromBank}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 max-w-64 mx-auto">
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-600">
                    {getBanksForCurrency(fromCurrency).map((bank) => (
                      <SelectItem key={bank} value={bank} className="text-white">
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-8 rounded-full bg-black/50 border-gray-600 hover:bg-gray-700 p-0"
              onClick={handleSwap}
              disabled={!fromCurrency || !toCurrency}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-white" />
            </Button>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-1.5 block text-center">To</label>
            <div className="flex items-center justify-center gap-3">
              <Input
                type="number"
                placeholder="0"
                value={toAmount}
                onChange={handleToAmountChange}
                className="bg-black/50 border-gray-600 text-white text-lg h-9 text-center flex-1 max-w-32"
              />
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 flex-1 max-w-32">
                  <SelectValue placeholder="EUR" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value} className="text-white">
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {toCurrency === "RUB" && (
              <div className="mt-3">
                <Select value={toBank} onValueChange={setToBank}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 max-w-64 mx-auto">
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-600">
                    {getBanksForCurrency(toCurrency).map((bank) => (
                      <SelectItem key={bank} value={bank} className="text-white">
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-700">
            {telegramUsername && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Telegram:</span>
                <span className="text-white font-medium">{telegramUsername}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Направление:</span>
              <span className="text-white font-medium">{currentDirection?.name}</span>
            </div>
            {getPerUnitRateDisplay() && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Курс:</span>
                <span className="text-green-400 font-medium">{getPerUnitRateDisplay()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Отдаете:</span>
              <span className="text-white font-medium">
                {amount} {fromCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Получаете:</span>
              <span className="text-green-400 font-medium">
                {toAmount} {toCurrency}
              </span>
            </div>
            {showTechnicalInfo && (
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-700">
                <span className="text-gray-400">Откуп:</span>
                <span className="text-yellow-400 font-medium">
                  {usdtEurPercentage > 0 ? "+" : ""}
                  {usdtEurPercentage}%
                </span>
              </div>
            )}
            {showTechnicalInfo && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Маржа:</span>
                <span className="text-yellow-400 font-medium">
                  {(() => {
                    const rate = getExchangeRate(selectedDirection, amount)
                    const fromAmt = Number.parseFloat(amount) || 0
                    const toAmt = lastEdited === "from" ? fromAmt * rate : Number.parseFloat(toAmount) || 0

                    // Determine which currency we're giving out (toCurrency when from is edited)
                    const givingCurrency = lastEdited === "from" ? toCurrency : fromCurrency

                    if (givingCurrency === "RUB" || selectedDirection.includes("rub")) {
                      // Convert to EUR equivalent for tier lookup
                      const eurEquivalent =
                        givingCurrency === "RUB" && rubRate ? (toAmt / rubRate) * (realUsdEurRate || 1) : toAmt
                      return (getRubMargin(eurEquivalent) * 100).toFixed(1)
                    } else {
                      // USDT/EUR - convert to EUR equivalent
                      let eurEquivalent = toAmt
                      if (givingCurrency === "USDT" && realUsdEurRate) {
                        eurEquivalent = toAmt * realUsdEurRate
                      }
                      return (getUsdtMargin(eurEquivalent) * 100).toFixed(1)
                    }
                  })()}%
                </span>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleExchange}
          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-black font-semibold"
          disabled={!fromCurrency || !toCurrency || !amount || Number.parseFloat(amount) <= 0}
        >
          Отправить заявку
        </Button>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-black/90 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Подтверждение заявки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-lg space-y-2">
              {telegramUsername ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Telegram:</span>
                  <span className="text-white">{telegramUsername}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Контакт для связи:</label>
                  <Input
                    type="text"
                    placeholder="Введите Telegram username или телефон"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    className="bg-black/50 border-gray-600 text-white"
                  />
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Направление:</span>
                <span className="text-white">{currentDirection?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Отдаете:</span>
                <span className="text-white">
                  {amount} {fromCurrency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Получаете:</span>
                <span className="text-green-400 font-medium">
                  {toAmount} {toCurrency}
                </span>
              </div>
              {getPerUnitRateDisplay() && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Курс:</span>
                  <span className="text-green-400">{getPerUnitRateDisplay()}</span>
                </div>
              )}
            </div>

            {orderError && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                {orderError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                disabled={sendingOrder}
              >
                Отмена
              </Button>
              <Button
                onClick={handleConfirmOrder}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold"
                disabled={sendingOrder}
              >
                {sendingOrder ? "Отправка..." : "Подтвердить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
