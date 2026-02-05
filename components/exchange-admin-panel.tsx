"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { 
  Users, 
  Plus, 
  ArrowDownUp, 
  Wallet,
  TrendingUp,
  Calculator,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react"
import { 
  addCurator, 
  updateCurator, 
  deleteCurator,
  addBuyback,
  closeDeal,
  refreshData
} from "@/app/exchange/actions"

// Interfaces matching REAL database schema
interface Curator {
  id: number
  name: string
  telegram_username: string | null
  phone: string | null
  balance_eur: string
  balance_rub: string
  balance_usdt: string
  is_active: boolean
  notes: string | null
  created_at: string
}

interface Buyback {
  id: number
  curator_id: number
  curator_name: string
  eur_amount: string
  usdt_spent: string
  rate: string
  eur_balance_before: string | null
  eur_balance_after: string | null
  avg_rate_before: string | null
  avg_rate_after: string | null
  notes: string | null
  created_at: string
}

interface Deal {
  id: number
  direction: string
  client_nickname: string | null
  client_telegram: string | null
  requested_give_amount: string | null
  requested_give_currency: string | null
  requested_receive_amount: string | null
  requested_receive_currency: string | null
  requested_rate: string | null
  actual_give_amount: string | null
  actual_give_currency: string | null
  actual_receive_amount: string | null
  actual_receive_currency: string | null
  actual_rate: string | null
  eur_cost_at_deal: string | null
  profit_total: string | null
  profit_curator: string | null
  profit_agency: string | null
  curator_id: number | null
  curator_name: string | null
  status: string
  note: string | null
  created_at: string
  completed_at: string | null
}

interface Rate {
  id: number
  currency: string
  rate: string
  is_active: boolean
}

interface ExchangeAdminPanelProps {
  initialData: {
    curators: Curator[]
    buybacks: Buyback[]
    deals: Deal[]
    rates: Rate[]
  }
}

export function ExchangeAdminPanel({ initialData }: ExchangeAdminPanelProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  
  // Curator form state
  const [newCurator, setNewCurator] = useState({ name: "", telegram: "", phone: "", notes: "" })
  const [editingCurator, setEditingCurator] = useState<Curator | null>(null)
  const [showAddCurator, setShowAddCurator] = useState(false)
  
  // Buyback form state (откуп = покупка EUR за USDT)
  const [newBuyback, setNewBuyback] = useState({ 
    curatorId: "", 
    eurAmount: "", 
    usdtSpent: "", 
    rate: "",
    notes: ""
  })
  const [showAddBuyback, setShowAddBuyback] = useState(false)
  
  // Close deal form state
  const [closingDeal, setClosingDeal] = useState<Deal | null>(null)
  const [closeForm, setCloseForm] = useState({
    curatorId: "",
    actualGiveAmount: "",
    actualGiveCurrency: "RUB",
    actualReceiveAmount: "",
    actualReceiveCurrency: "EUR",
    actualRate: "",
    eurCostAtDeal: "",
    note: ""
  })

  const doRefresh = async () => {
    const result = await refreshData()
    if (result.success && result.data) {
      setData(result.data)
    }
  }

  const refresh = () => {
    startTransition(doRefresh)
  }

  const handleAddCurator = async () => {
    const result = await addCurator(newCurator)
    if (result.success) {
      setNewCurator({ name: "", telegram: "", phone: "", notes: "" })
      setShowAddCurator(false)
      startTransition(doRefresh)
    } else {
      alert("Ошибка при добавлении куратора")
    }
  }

  const handleUpdateCurator = () => {
    if (!editingCurator) return
    startTransition(async () => {
      const result = await updateCurator(editingCurator.id, {
        name: editingCurator.name,
        telegram: editingCurator.telegram_username || "",
        phone: editingCurator.phone || "",
        notes: editingCurator.notes || "",
        isActive: editingCurator.is_active
      })
      if (result.success) {
        setEditingCurator(null)
        await doRefresh()
      }
    })
  }

  const handleDeleteCurator = (id: number) => {
    if (!confirm("Удалить куратора?")) return
    startTransition(async () => {
      await deleteCurator(id)
      await doRefresh()
    })
  }

  const handleAddBuyback = async () => {
    const curatorId = parseInt(newBuyback.curatorId)
    const eurAmount = parseFloat(newBuyback.eurAmount)
    const usdtSpent = parseFloat(newBuyback.usdtSpent)
    const rate = parseFloat(newBuyback.rate)
    
    if (isNaN(curatorId) || isNaN(eurAmount) || isNaN(usdtSpent) || isNaN(rate)) {
      alert("Заполните все обязательные поля корректно")
      return
    }
    
    const result = await addBuyback({
      curatorId,
      eurAmount,
      usdtSpent,
      rate,
      notes: newBuyback.notes
    })
    
    if (result.success) {
      setNewBuyback({ curatorId: "", eurAmount: "", usdtSpent: "", rate: "", notes: "" })
      setShowAddBuyback(false)
      startTransition(doRefresh)
    } else {
      alert("Ошибка при добавлении откупа: " + (result.error || ""))
    }
  }

  const openCloseDealDialog = (deal: Deal) => {
    const giveCurrency = deal.requested_give_currency || deal.direction?.split("_")[0] || "RUB"
    const receiveCurrency = deal.requested_receive_currency || deal.direction?.split("_")[1] || "EUR"
    setClosingDeal(deal)
    setCloseForm({
      curatorId: deal.curator_id?.toString() || "",
      actualGiveAmount: deal.requested_give_amount || "",
      actualGiveCurrency: giveCurrency,
      actualReceiveAmount: deal.requested_receive_amount || "",
      actualReceiveCurrency: receiveCurrency,
      actualRate: deal.requested_rate || "",
      eurCostAtDeal: "",
      note: ""
    })
  }

  const handleCloseDeal = async () => {
    if (!closingDeal) return
    
    const curatorId = parseInt(closeForm.curatorId)
    const actualGiveAmount = parseFloat(closeForm.actualGiveAmount)
    const actualReceiveAmount = parseFloat(closeForm.actualReceiveAmount)
    const actualRate = parseFloat(closeForm.actualRate)
    
    if (isNaN(curatorId) || isNaN(actualGiveAmount) || isNaN(actualReceiveAmount) || isNaN(actualRate)) {
      alert("Заполните все обязательные поля корректно")
      return
    }
    
    const result = await closeDeal(closingDeal.id, {
      curatorId,
      actualGiveAmount,
      actualGiveCurrency: closeForm.actualGiveCurrency,
      actualReceiveAmount,
      actualReceiveCurrency: closeForm.actualReceiveCurrency,
      actualRate,
      eurCostAtDeal: parseFloat(closeForm.eurCostAtDeal) || 0,
      note: closeForm.note
    })
    
    if (result.success) {
      setClosingDeal(null)
      startTransition(doRefresh)
    } else {
      alert("Ошибка при закрытии сделки: " + (result.error || ""))
    }
  }

  const formatNum = (val: string | null | undefined) => {
    if (!val) return "-"
    const n = parseFloat(val)
    return isNaN(n) ? "-" : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
  }

  const formatRate = (val: string | null | undefined) => {
    if (!val) return "-"
    const n = parseFloat(val)
    return isNaN(n) ? "-" : n.toFixed(4)
  }

  // Calculate close deal profit preview
  const closeProfit = closeForm.actualGiveAmount && closeForm.actualRate && closeForm.eurCostAtDeal
    ? (parseFloat(closeForm.actualGiveAmount) * parseFloat(closeForm.actualRate) - parseFloat(closeForm.actualGiveAmount) * parseFloat(closeForm.eurCostAtDeal))
    : null

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exchange Admin</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Кураторы
            </div>
            <div className="text-2xl font-bold mt-1">{data.curators.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Сделки
            </div>
            <div className="text-2xl font-bold mt-1">{data.deals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ожидают
            </div>
            <div className="text-2xl font-bold mt-1">
              {data.deals.filter(d => d.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Прибыль
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {data.deals
                .filter(d => d.status === "closed" && d.profit_total)
                .reduce((sum, d) => sum + parseFloat(d.profit_total || "0"), 0)
                .toFixed(2)} EUR
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deals">
        <TabsList className="mb-4">
          <TabsTrigger value="deals" className="gap-2">
            <ArrowDownUp className="w-4 h-4" />
            Сделки
          </TabsTrigger>
          <TabsTrigger value="curators" className="gap-2">
            <Users className="w-4 h-4" />
            Кураторы
          </TabsTrigger>
          <TabsTrigger value="buybacks" className="gap-2">
            <Wallet className="w-4 h-4" />
            Откупы
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Статистика
          </TabsTrigger>
        </TabsList>

        {/* === DEALS TAB === */}
        <TabsContent value="deals" className="space-y-4">
          <h2 className="text-xl font-semibold">Сделки</h2>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <table className="w-full">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium">Дата</th>
                      <th className="p-3 text-left font-medium">Клиент</th>
                      <th className="p-3 text-left font-medium">Направление</th>
                      <th className="p-3 text-right font-medium">Отдает</th>
                      <th className="p-3 text-right font-medium">Получает</th>
                      <th className="p-3 text-right font-medium">Курс</th>
                      <th className="p-3 text-left font-medium">Куратор</th>
                      <th className="p-3 text-right font-medium">Прибыль</th>
                      <th className="p-3 text-left font-medium">Заметки</th>
                      <th className="p-3 text-center font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deals.map(deal => (
                      <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 text-sm">
                          {new Date(deal.created_at).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="p-3 text-sm">
                          {deal.client_telegram || deal.client_nickname || "-"}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-sm">
                            {deal.requested_give_currency || deal.direction?.split("_")[0] || "-"}
                            <ArrowDownUp className="w-3 h-3" />
                            {deal.requested_receive_currency || deal.direction?.split("_")[1] || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {deal.status === "closed" && deal.actual_give_amount 
                            ? formatNum(deal.actual_give_amount) 
                            : formatNum(deal.requested_give_amount)
                          }
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {deal.status === "closed" && deal.actual_receive_amount 
                            ? formatNum(deal.actual_receive_amount) 
                            : formatNum(deal.requested_receive_amount)
                          }
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {deal.status === "closed" && deal.actual_rate
                            ? formatRate(deal.actual_rate)
                            : formatRate(deal.requested_rate)
                          }
                        </td>
                        <td className="p-3 text-sm font-medium">
                          {deal.curator_name || "-"}
                        </td>
                        <td className="p-3 text-right">
                          {deal.profit_total ? (
                            <span className={`font-mono font-medium text-sm ${parseFloat(deal.profit_total) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {parseFloat(deal.profit_total).toFixed(2)} EUR
                            </span>
                          ) : "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[150px] truncate">
                          {deal.note || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {deal.status === "pending" ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openCloseDealDialog(deal)}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Закрыть
                            </Button>
                          ) : (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Закрыта
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.deals.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                          Сделок пока нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Close Deal Dialog */}
          <Dialog open={!!closingDeal} onOpenChange={() => setClosingDeal(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Закрыть сделку</DialogTitle>
                <DialogDescription>
                  Выберите куратора, введите фактические суммы и закройте сделку
                </DialogDescription>
              </DialogHeader>
              {closingDeal && (
                <div className="space-y-4">
                  {/* Deal info */}
                  <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                    <div>Клиент: <span className="font-medium">{closingDeal.client_telegram || "-"}</span></div>
                    <div>Направление: <span className="font-medium">
                      {closingDeal.requested_give_currency || closingDeal.direction?.split("_")[0]} {" -> "} 
                      {closingDeal.requested_receive_currency || closingDeal.direction?.split("_")[1]}
                    </span></div>
                    <div>Запрос: <span className="font-medium">
                      {formatNum(closingDeal.requested_give_amount)} {closingDeal.requested_give_currency} {" -> "}
                      {formatNum(closingDeal.requested_receive_amount)} {closingDeal.requested_receive_currency}
                    </span></div>
                    <div>Курс заявки: <span className="font-medium">{formatRate(closingDeal.requested_rate)}</span></div>
                  </div>

                  {/* Curator select */}
                  <div>
                    <label className="text-sm font-medium">Куратор *</label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={closeForm.curatorId}
                      onChange={e => setCloseForm(prev => ({ ...prev, curatorId: e.target.value }))}
                    >
                      <option value="">Выберите куратора</option>
                      {data.curators.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (EUR: {formatNum(c.balance_eur)}, RUB: {formatNum(c.balance_rub)}, USDT: {formatNum(c.balance_usdt)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actual amounts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Факт. отдает клиент *</label>
                      <div className="flex gap-2">
                        <Input 
                          type="number"
                          value={closeForm.actualGiveAmount}
                          onChange={e => setCloseForm(prev => ({ ...prev, actualGiveAmount: e.target.value }))}
                          placeholder="100000"
                        />
                        <select 
                          className="w-24 p-2 border rounded-md bg-background shrink-0"
                          value={closeForm.actualGiveCurrency}
                          onChange={e => setCloseForm(prev => ({ ...prev, actualGiveCurrency: e.target.value }))}
                        >
                          <option value="RUB">RUB</option>
                          <option value="EUR">EUR</option>
                          <option value="USDT">USDT</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Факт. получает клиент *</label>
                      <div className="flex gap-2">
                        <Input 
                          type="number"
                          value={closeForm.actualReceiveAmount}
                          onChange={e => setCloseForm(prev => ({ ...prev, actualReceiveAmount: e.target.value }))}
                          placeholder="950"
                        />
                        <select 
                          className="w-24 p-2 border rounded-md bg-background shrink-0"
                          value={closeForm.actualReceiveCurrency}
                          onChange={e => setCloseForm(prev => ({ ...prev, actualReceiveCurrency: e.target.value }))}
                        >
                          <option value="EUR">EUR</option>
                          <option value="RUB">RUB</option>
                          <option value="USDT">USDT</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Курс продажи *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={closeForm.actualRate}
                        onChange={e => setCloseForm(prev => ({ ...prev, actualRate: e.target.value }))}
                        placeholder="0.0105"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Курс откупа (EUR cost) *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={closeForm.eurCostAtDeal}
                        onChange={e => setCloseForm(prev => ({ ...prev, eurCostAtDeal: e.target.value }))}
                        placeholder="0.0095"
                      />
                    </div>
                  </div>

                  {/* Profit preview */}
                  {closeProfit !== null && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${closeProfit >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                      Расчетная прибыль: {closeProfit.toFixed(2)} EUR
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Заметки</label>
                    <Input 
                      value={closeForm.note}
                      onChange={e => setCloseForm(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="Комментарий к закрытию"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setClosingDeal(null)}>Отмена</Button>
                <Button 
                  onClick={handleCloseDeal} 
                  disabled={isPending || !closeForm.curatorId || !closeForm.actualGiveAmount || !closeForm.actualReceiveAmount || !closeForm.actualRate}
                >
                  Закрыть сделку
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* === CURATORS TAB === */}
        <TabsContent value="curators" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Кураторы</h2>
            <Dialog open={showAddCurator} onOpenChange={setShowAddCurator}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить куратора
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый куратор</DialogTitle>
                  <DialogDescription>Добавьте нового куратора в систему</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Имя *</label>
                    <Input 
                      value={newCurator.name}
                      onChange={e => setNewCurator(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Имя куратора"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Telegram</label>
                    <Input 
                      value={newCurator.telegram}
                      onChange={e => setNewCurator(prev => ({ ...prev, telegram: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Телефон</label>
                    <Input 
                      value={newCurator.phone}
                      onChange={e => setNewCurator(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+382..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Заметки</label>
                    <Input 
                      value={newCurator.notes}
                      onChange={e => setNewCurator(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Комментарий"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddCurator(false)}>Отмена</Button>
                  <Button onClick={handleAddCurator} disabled={isPending || !newCurator.name}>
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.curators.map(curator => (
              <Card key={curator.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{curator.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={curator.is_active ? "default" : "secondary"} className="text-xs">
                        {curator.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCurator(curator)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCurator(curator.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {curator.telegram_username && (
                      <div className="text-muted-foreground">{curator.telegram_username}</div>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">EUR</div>
                        <div className="font-mono font-medium">{formatNum(curator.balance_eur)}</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">RUB</div>
                        <div className="font-mono font-medium">{formatNum(curator.balance_rub)}</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">USDT</div>
                        <div className="font-mono font-medium">{formatNum(curator.balance_usdt)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.curators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Кураторов пока нет
            </div>
          )}

          {/* Edit Curator Dialog */}
          <Dialog open={!!editingCurator} onOpenChange={() => setEditingCurator(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактировать куратора</DialogTitle>
                <DialogDescription>Измените данные куратора</DialogDescription>
              </DialogHeader>
              {editingCurator && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Имя</label>
                    <Input 
                      value={editingCurator.name}
                      onChange={e => setEditingCurator(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Telegram</label>
                    <Input 
                      value={editingCurator.telegram_username || ""}
                      onChange={e => setEditingCurator(prev => prev ? { ...prev, telegram_username: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Телефон</label>
                    <Input 
                      value={editingCurator.phone || ""}
                      onChange={e => setEditingCurator(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editingCurator.is_active}
                      onChange={e => setEditingCurator(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                    />
                    <label className="text-sm">Активен</label>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCurator(null)}>Отмена</Button>
                <Button onClick={handleUpdateCurator} disabled={isPending}>Сохранить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* === BUYBACKS TAB === */}
        <TabsContent value="buybacks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Откупы</h2>
            <Dialog open={showAddBuyback} onOpenChange={setShowAddBuyback}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить откуп
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый откуп</DialogTitle>
                  <DialogDescription>Покупка EUR за USDT у куратора</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Куратор *</label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={newBuyback.curatorId}
                      onChange={e => setNewBuyback(prev => ({ ...prev, curatorId: e.target.value }))}
                    >
                      <option value="">Выберите куратора</option>
                      {data.curators.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id}>{c.name} (EUR: {formatNum(c.balance_eur)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Сумма EUR (получаем) *</label>
                    <Input 
                      type="number"
                      value={newBuyback.eurAmount}
                      onChange={e => {
                        const eurAmount = e.target.value
                        const rate = newBuyback.rate
                        const usdtSpent = eurAmount && rate ? (parseFloat(eurAmount) * parseFloat(rate)).toFixed(2) : newBuyback.usdtSpent
                        setNewBuyback(prev => ({ ...prev, eurAmount, usdtSpent }))
                      }}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Курс (USDT за 1 EUR) *</label>
                    <Input 
                      type="number"
                      step="0.0001"
                      value={newBuyback.rate}
                      onChange={e => {
                        const rate = e.target.value
                        const eurAmount = newBuyback.eurAmount
                        const usdtSpent = eurAmount && rate ? (parseFloat(eurAmount) * parseFloat(rate)).toFixed(2) : newBuyback.usdtSpent
                        setNewBuyback(prev => ({ ...prev, rate, usdtSpent }))
                      }}
                      placeholder="1.08"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">USDT потрачено *</label>
                    <Input 
                      type="number"
                      value={newBuyback.usdtSpent}
                      onChange={e => setNewBuyback(prev => ({ ...prev, usdtSpent: e.target.value }))}
                      placeholder="1080"
                    />
                    {newBuyback.eurAmount && newBuyback.usdtSpent && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {newBuyback.eurAmount} EUR за {newBuyback.usdtSpent} USDT
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Заметки</label>
                    <Input 
                      value={newBuyback.notes}
                      onChange={e => setNewBuyback(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Комментарий"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddBuyback(false)}>Отмена</Button>
                  <Button 
                    onClick={handleAddBuyback} 
                    disabled={isPending || !newBuyback.curatorId || !newBuyback.eurAmount || !newBuyback.usdtSpent || !newBuyback.rate}
                  >
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <table className="w-full">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium">Дата</th>
                      <th className="p-3 text-left font-medium">Куратор</th>
                      <th className="p-3 text-right font-medium">EUR</th>
                      <th className="p-3 text-right font-medium">USDT</th>
                      <th className="p-3 text-right font-medium">Курс</th>
                      <th className="p-3 text-right font-medium">Ср. курс после</th>
                      <th className="p-3 text-left font-medium">Заметки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buybacks.map(buyback => (
                      <tr key={buyback.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 text-sm">
                          {new Date(buyback.created_at).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="p-3 font-medium">{buyback.curator_name}</td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatNum(buyback.eur_amount)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatNum(buyback.usdt_spent)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {formatRate(buyback.rate)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {formatRate(buyback.avg_rate_after)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {buyback.notes || "-"}
                        </td>
                      </tr>
                    ))}
                    {data.buybacks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Откупов пока нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === STATS TAB === */}
        <TabsContent value="stats" className="space-y-4">
          <h2 className="text-xl font-semibold">Статистика по кураторам</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {data.curators.map(curator => {
              const curatorDeals = data.deals.filter(d => d.curator_id === curator.id)
              const closedDeals = curatorDeals.filter(d => d.status === "closed")
              const curatorProfit = closedDeals.reduce((sum, d) => sum + parseFloat(d.profit_total || "0"), 0)
              const curatorBuybacks = data.buybacks.filter(b => b.curator_id === curator.id)
              const totalBuybackEur = curatorBuybacks.reduce((sum, b) => sum + parseFloat(b.eur_equivalent || "0"), 0)
              
              return (
                <Card key={curator.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{curator.name}</span>
                      <Badge variant={curator.is_active ? "default" : "secondary"}>
                        {curator.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Всего сделок</div>
                        <div className="text-2xl font-bold">{curatorDeals.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Закрыто</div>
                        <div className="text-2xl font-bold">{closedDeals.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Прибыль</div>
                        <div className="text-2xl font-bold text-green-600">{curatorProfit.toFixed(2)} EUR</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Откупы</div>
                        <div className="text-2xl font-bold">{totalBuybackEur.toFixed(2)} EUR</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {data.curators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Добавьте кураторов для просмотра статистики
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
