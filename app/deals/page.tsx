"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Euro,
  Plus,
  RefreshCw,
  Check,
  X,
  Wallet,
  TrendingUp,
  ArrowRightLeft,
} from "lucide-react"

interface Curator {
  id: number
  name: string
  telegram_username: string | null
  eur_balance: number
  total_eur_purchased: number
  total_usdt_spent: number
  avg_eur_cost: number
  profit_usdt: number
  is_active: boolean
}

interface Deal {
  id: number
  direction: string
  client_nickname: string | null
  client_telegram: string | null
  requested_give_amount: number | null
  requested_give_currency: string | null
  requested_receive_amount: number | null
  requested_receive_currency: string | null
  requested_rate: number | null
  actual_give_amount: number | null
  actual_give_currency: string | null
  actual_receive_amount: number | null
  actual_receive_currency: string | null
  actual_rate: number | null
  usdt_received: number | null
  eur_given: number | null
  eur_cost_at_deal: number | null
  profit_total: number | null
  profit_curator: number | null
  profit_agency: number | null
  curator_id: number | null
  curator_name: string | null
  status: string
  note: string | null
  created_at: string
  completed_at: string | null
}

export default function DealsPage() {
  const [curators, setCurators] = useState<Curator[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("deals")

  // Form states
  const [newCuratorName, setNewCuratorName] = useState("")
  const [newCuratorTelegram, setNewCuratorTelegram] = useState("")

  // Purchase form
  const [purchaseCuratorId, setPurchaseCuratorId] = useState<string>("")
  const [purchaseEurAmount, setPurchaseEurAmount] = useState("")
  const [purchaseUsdtSpent, setPurchaseUsdtSpent] = useState("")
  const [purchaseNote, setPurchaseNote] = useState("")

  // New deal form
  const [newDealDirection, setNewDealDirection] = useState("")
  const [newDealClient, setNewDealClient] = useState("")
  const [newDealGiveAmount, setNewDealGiveAmount] = useState("")
  const [newDealGiveCurrency, setNewDealGiveCurrency] = useState("RUB")
  const [newDealReceiveAmount, setNewDealReceiveAmount] = useState("")
  const [newDealReceiveCurrency, setNewDealReceiveCurrency] = useState("EUR")
  const [newDealRate, setNewDealRate] = useState("")
  const [newDealCurator, setNewDealCurator] = useState<string>("")

  // Complete deal form
  const [completingDeal, setCompletingDeal] = useState<Deal | null>(null)
  const [completeUsdtReceived, setCompleteUsdtReceived] = useState("")
  const [completeEurGiven, setCompleteEurGiven] = useState("")
  const [completeCurator, setCompleteCurator] = useState<string>("")

  const fetchCurators = useCallback(async () => {
    try {
      const res = await fetch("/api/curators")
      const data = await res.json()
      setCurators(data)
    } catch (error) {
      console.error("Error fetching curators:", error)
    }
  }, [])

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals")
      const data = await res.json()
      setDeals(data)
    } catch (error) {
      console.error("Error fetching deals:", error)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchCurators(), fetchDeals()]).finally(() => setLoading(false))
  }, [fetchCurators, fetchDeals])

  const handleAddCurator = async () => {
    if (!newCuratorName) return

    try {
      const res = await fetch("/api/curators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCuratorName,
          telegram_username: newCuratorTelegram || null,
        }),
      })

      if (res.ok) {
        setNewCuratorName("")
        setNewCuratorTelegram("")
        fetchCurators()
      }
    } catch (error) {
      console.error("Error adding curator:", error)
    }
  }

  const handlePurchase = async () => {
    if (!purchaseCuratorId || !purchaseEurAmount || !purchaseUsdtSpent) return

    try {
      const res = await fetch(`/api/curators/${purchaseCuratorId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eur_amount: parseFloat(purchaseEurAmount),
          usdt_spent: parseFloat(purchaseUsdtSpent),
          note: purchaseNote || null,
        }),
      })

      if (res.ok) {
        setPurchaseEurAmount("")
        setPurchaseUsdtSpent("")
        setPurchaseNote("")
        setPurchaseCuratorId("")
        fetchCurators()
      }
    } catch (error) {
      console.error("Error processing purchase:", error)
    }
  }

  const handleAddDeal = async () => {
    if (!newDealDirection) return

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: newDealDirection,
          client_nickname: newDealClient || null,
          requested_give_amount: parseFloat(newDealGiveAmount) || null,
          requested_give_currency: newDealGiveCurrency,
          requested_receive_amount: parseFloat(newDealReceiveAmount) || null,
          requested_receive_currency: newDealReceiveCurrency,
          requested_rate: parseFloat(newDealRate) || null,
          curator_id: newDealCurator ? parseInt(newDealCurator) : null,
        }),
      })

      if (res.ok) {
        setNewDealDirection("")
        setNewDealClient("")
        setNewDealGiveAmount("")
        setNewDealReceiveAmount("")
        setNewDealRate("")
        setNewDealCurator("")
        fetchDeals()
      }
    } catch (error) {
      console.error("Error adding deal:", error)
    }
  }

  const handleCompleteDeal = async () => {
    if (!completingDeal || !completeUsdtReceived || !completeEurGiven || !completeCurator) return

    try {
      const res = await fetch(`/api/deals/${completingDeal.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_give_amount: completingDeal.actual_give_amount,
          actual_give_currency: completingDeal.actual_give_currency,
          actual_receive_amount: completingDeal.actual_receive_amount,
          actual_receive_currency: completingDeal.actual_receive_currency,
          actual_rate: completingDeal.actual_rate,
          usdt_received: parseFloat(completeUsdtReceived),
          eur_given: parseFloat(completeEurGiven),
          curator_id: parseInt(completeCurator),
        }),
      })

      if (res.ok) {
        setCompletingDeal(null)
        setCompleteUsdtReceived("")
        setCompleteEurGiven("")
        setCompleteCurator("")
        fetchDeals()
        fetchCurators()
      }
    } catch (error) {
      console.error("Error completing deal:", error)
    }
  }

  const handleCancelDeal = async (dealId: number) => {
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" })
      if (res.ok) {
        fetchDeals()
      }
    } catch (error) {
      console.error("Error cancelling deal:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Ожидает</Badge>
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Выполнена</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Отменена</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalProfit = deals
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + (d.profit_total || 0), 0)

  const totalCuratorProfit = curators.reduce((sum, c) => sum + Number(c.profit_usdt), 0)
  const totalEurBalance = curators.reduce((sum, c) => sum + Number(c.eur_balance), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Учёт сделок</h1>
          <Button
            onClick={() => {
              fetchCurators()
              fetchDeals()
            }}
            variant="outline"
            className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <Euro className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Баланс EUR</p>
                  <p className="text-xl font-bold text-white">{totalEurBalance.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Общая прибыль</p>
                  <p className="text-xl font-bold text-white">{totalProfit.toFixed(2)} USDT</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-2">
                  <Wallet className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Прибыль кураторов</p>
                  <p className="text-xl font-bold text-white">{totalCuratorProfit.toFixed(2)} USDT</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500/20 p-2">
                  <ArrowRightLeft className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Всего сделок</p>
                  <p className="text-xl font-bold text-white">{deals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger
              value="deals"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Сделки
            </TabsTrigger>
            <TabsTrigger
              value="curators"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Кураторы
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Откуп EUR
            </TabsTrigger>
          </TabsList>

          {/* Deals Tab */}
          <TabsContent value="deals" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                  Сделки
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Новая сделка
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-slate-700 bg-slate-900">
                    <DialogHeader>
                      <DialogTitle className="text-white">Создать сделку</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Направление</label>
                        <Select value={newDealDirection} onValueChange={setNewDealDirection}>
                          <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                            <SelectValue placeholder="Выберите направление" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-700 bg-slate-800">
                            <SelectItem value="RUB-EUR">RUB → EUR</SelectItem>
                            <SelectItem value="USDT-EUR">USDT → EUR</SelectItem>
                            <SelectItem value="UAH-EUR">UAH → EUR</SelectItem>
                            <SelectItem value="EUR-RUB">EUR → RUB</SelectItem>
                            <SelectItem value="EUR-USDT">EUR → USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Клиент (ник)</label>
                        <Input
                          value={newDealClient}
                          onChange={(e) => setNewDealClient(e.target.value)}
                          className="border-slate-700 bg-slate-800 text-white"
                          placeholder="@username"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm text-slate-400">Отдаёт</label>
                          <Input
                            type="number"
                            value={newDealGiveAmount}
                            onChange={(e) => setNewDealGiveAmount(e.target.value)}
                            className="border-slate-700 bg-slate-800 text-white"
                            placeholder="Сумма"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-400">Валюта</label>
                          <Select value={newDealGiveCurrency} onValueChange={setNewDealGiveCurrency}>
                            <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-800">
                              <SelectItem value="RUB">RUB</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="USDT">USDT</SelectItem>
                              <SelectItem value="UAH">UAH</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm text-slate-400">Получает</label>
                          <Input
                            type="number"
                            value={newDealReceiveAmount}
                            onChange={(e) => setNewDealReceiveAmount(e.target.value)}
                            className="border-slate-700 bg-slate-800 text-white"
                            placeholder="Сумма"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-400">Валюта</label>
                          <Select value={newDealReceiveCurrency} onValueChange={setNewDealReceiveCurrency}>
                            <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-800">
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="RUB">RUB</SelectItem>
                              <SelectItem value="USDT">USDT</SelectItem>
                              <SelectItem value="UAH">UAH</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Курс</label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={newDealRate}
                          onChange={(e) => setNewDealRate(e.target.value)}
                          className="border-slate-700 bg-slate-800 text-white"
                          placeholder="Курс обмена"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Куратор</label>
                        <Select value={newDealCurator} onValueChange={setNewDealCurator}>
                          <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                            <SelectValue placeholder="Выберите куратора" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-700 bg-slate-800">
                            {curators.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name} ({c.eur_balance} EUR)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddDeal} className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Создать сделку
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {deals.length === 0 ? (
                      <p className="py-8 text-center text-slate-400">Сделок пока нет</p>
                    ) : (
                      deals.map((deal) => (
                        <Card key={deal.id} className="border-slate-700 bg-slate-800/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">#{deal.id}</span>
                                  <span className="text-emerald-400">{deal.direction}</span>
                                  {getStatusBadge(deal.status)}
                                </div>
                                <div className="text-sm text-slate-400">
                                  Клиент: {deal.client_nickname || "—"}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-500">Заявка: </span>
                                    <span className="text-slate-300">
                                      {deal.requested_give_amount} {deal.requested_give_currency} →{" "}
                                      {deal.requested_receive_amount} {deal.requested_receive_currency}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Факт: </span>
                                    <span className="text-white">
                                      {deal.actual_give_amount} {deal.actual_give_currency} →{" "}
                                      {deal.actual_receive_amount} {deal.actual_receive_currency}
                                    </span>
                                  </div>
                                </div>
                                {deal.status === "completed" && (
                                  <div className="mt-2 rounded bg-emerald-500/10 p-2 text-sm">
                                    <span className="text-slate-400">Прибыль: </span>
                                    <span className="font-medium text-emerald-400">
                                      {Number(deal.profit_total).toFixed(2)} USDT
                                    </span>
                                    <span className="ml-4 text-slate-400">Куратору: </span>
                                    <span className="text-purple-400">
                                      {Number(deal.profit_curator).toFixed(2)} USDT
                                    </span>
                                    <span className="ml-4 text-slate-400">Агентству: </span>
                                    <span className="text-blue-400">
                                      {Number(deal.profit_agency).toFixed(2)} USDT
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-slate-500">
                                  {new Date(deal.created_at).toLocaleString("ru-RU")}
                                  {deal.curator_name && ` • Куратор: ${deal.curator_name}`}
                                </div>
                              </div>
                              {deal.status === "pending" && (
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => {
                                          setCompletingDeal(deal)
                                          setCompleteEurGiven(deal.actual_receive_amount?.toString() || "")
                                          setCompleteCurator(deal.curator_id?.toString() || "")
                                        }}
                                      >
                                        <Check className="mr-1 h-4 w-4" />
                                        Закрыть
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="border-slate-700 bg-slate-900">
                                      <DialogHeader>
                                        <DialogTitle className="text-white">
                                          Закрыть сделку #{deal.id}
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <label className="mb-1 block text-sm text-slate-400">
                                            Куратор
                                          </label>
                                          <Select
                                            value={completeCurator}
                                            onValueChange={setCompleteCurator}
                                          >
                                            <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                                              <SelectValue placeholder="Выберите куратора" />
                                            </SelectTrigger>
                                            <SelectContent className="border-slate-700 bg-slate-800">
                                              {curators.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                  {c.name} ({Number(c.eur_balance).toFixed(2)} EUR, ср.
                                                  {Number(c.avg_eur_cost).toFixed(4)} USDT)
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-sm text-slate-400">
                                            EUR выдано клиенту
                                          </label>
                                          <Input
                                            type="number"
                                            value={completeEurGiven}
                                            onChange={(e) => setCompleteEurGiven(e.target.value)}
                                            className="border-slate-700 bg-slate-800 text-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-sm text-slate-400">
                                            USDT получено
                                          </label>
                                          <Input
                                            type="number"
                                            value={completeUsdtReceived}
                                            onChange={(e) => setCompleteUsdtReceived(e.target.value)}
                                            className="border-slate-700 bg-slate-800 text-white"
                                          />
                                        </div>
                                        {completeCurator && completeUsdtReceived && completeEurGiven && (
                                          <div className="rounded bg-slate-800 p-3 text-sm">
                                            <p className="text-slate-400">Предварительный расчёт:</p>
                                            {(() => {
                                              const curator = curators.find(
                                                (c) => c.id.toString() === completeCurator
                                              )
                                              if (!curator) return null
                                              const eurCost =
                                                parseFloat(completeEurGiven) * Number(curator.avg_eur_cost)
                                              const profit = parseFloat(completeUsdtReceived) - eurCost
                                              return (
                                                <>
                                                  <p className="text-white">
                                                    Себестоимость EUR: {eurCost.toFixed(2)} USDT
                                                  </p>
                                                  <p className="text-emerald-400">
                                                    Прибыль: {profit.toFixed(2)} USDT
                                                  </p>
                                                  <p className="text-purple-400">
                                                    Куратору (40%): {(profit * 0.4).toFixed(2)} USDT
                                                  </p>
                                                  <p className="text-blue-400">
                                                    Агентству (60%): {(profit * 0.6).toFixed(2)} USDT
                                                  </p>
                                                </>
                                              )
                                            })()}
                                          </div>
                                        )}
                                        <Button
                                          onClick={handleCompleteDeal}
                                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        >
                                          Подтвердить закрытие
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-600/50 text-red-400 hover:bg-red-600/20"
                                    onClick={() => handleCancelDeal(deal.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curators Tab */}
          <TabsContent value="curators" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-emerald-400" />
                  Кураторы
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-slate-700 bg-slate-900">
                    <DialogHeader>
                      <DialogTitle className="text-white">Добавить куратора</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Имя</label>
                        <Input
                          value={newCuratorName}
                          onChange={(e) => setNewCuratorName(e.target.value)}
                          className="border-slate-700 bg-slate-800 text-white"
                          placeholder="Имя куратора"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-400">Telegram</label>
                        <Input
                          value={newCuratorTelegram}
                          onChange={(e) => setNewCuratorTelegram(e.target.value)}
                          className="border-slate-700 bg-slate-800 text-white"
                          placeholder="@username"
                        />
                      </div>
                      <Button
                        onClick={handleAddCurator}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        Добавить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {curators.length === 0 ? (
                    <p className="col-span-2 py-8 text-center text-slate-400">
                      Кураторов пока нет
                    </p>
                  ) : (
                    curators.map((curator) => (
                      <Card key={curator.id} className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-white">{curator.name}</h3>
                              {curator.telegram_username && (
                                <p className="text-sm text-slate-400">{curator.telegram_username}</p>
                              )}
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-400">Активен</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded bg-slate-900/50 p-2">
                              <p className="text-slate-500">Баланс EUR</p>
                              <p className="text-lg font-bold text-emerald-400">
                                {Number(curator.eur_balance).toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded bg-slate-900/50 p-2">
                              <p className="text-slate-500">Ср. себестоимость</p>
                              <p className="text-lg font-bold text-white">
                                {Number(curator.avg_eur_cost).toFixed(4)} USDT
                              </p>
                            </div>
                            <div className="rounded bg-slate-900/50 p-2">
                              <p className="text-slate-500">Откуплено EUR</p>
                              <p className="font-medium text-white">
                                {Number(curator.total_eur_purchased).toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded bg-slate-900/50 p-2">
                              <p className="text-slate-500">Прибыль</p>
                              <p className="font-medium text-purple-400">
                                {Number(curator.profit_usdt).toFixed(2)} USDT
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EUR Purchase Tab */}
          <TabsContent value="purchases" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Euro className="h-5 w-5 text-emerald-400" />
                  Откуп EUR (пополнение баланса)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="mb-4 font-medium text-white">Новый откуп</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Куратор</label>
                      <Select value={purchaseCuratorId} onValueChange={setPurchaseCuratorId}>
                        <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                          <SelectValue placeholder="Выберите куратора" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-800">
                          {curators.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Сумма EUR</label>
                      <Input
                        type="number"
                        value={purchaseEurAmount}
                        onChange={(e) => setPurchaseEurAmount(e.target.value)}
                        className="border-slate-700 bg-slate-800 text-white"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Потрачено USDT</label>
                      <Input
                        type="number"
                        value={purchaseUsdtSpent}
                        onChange={(e) => setPurchaseUsdtSpent(e.target.value)}
                        className="border-slate-700 bg-slate-800 text-white"
                        placeholder="550"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Примечание</label>
                      <Input
                        value={purchaseNote}
                        onChange={(e) => setPurchaseNote(e.target.value)}
                        className="border-slate-700 bg-slate-800 text-white"
                        placeholder="Опционально"
                      />
                    </div>
                  </div>
                  {purchaseEurAmount && purchaseUsdtSpent && (
                    <div className="mt-4 rounded bg-slate-900 p-3 text-sm">
                      <span className="text-slate-400">Курс откупа: </span>
                      <span className="font-medium text-white">
                        {(parseFloat(purchaseUsdtSpent) / parseFloat(purchaseEurAmount)).toFixed(4)} USDT/EUR
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={handlePurchase}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={!purchaseCuratorId || !purchaseEurAmount || !purchaseUsdtSpent}
                  >
                    Провести откуп
                  </Button>
                </div>

                <div className="text-sm text-slate-400">
                  <p className="mb-2 font-medium text-white">Как работает откуп:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Куратор покупает EUR за USDT</li>
                    <li>Сумма EUR добавляется к балансу куратора</li>
                    <li>Считается средняя себестоимость EUR</li>
                    <li>При закрытии сделки прибыль считается от средней себестоимости</li>
                    <li>40% прибыли идёт куратору, 60% агентству</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
