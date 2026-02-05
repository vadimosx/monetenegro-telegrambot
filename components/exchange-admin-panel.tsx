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
  createDeal,
  closeDeal,
  refreshData
} from "@/app/exchange/actions"

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
  currency: string
  amount: string
  rate: string
  eur_equivalent: string
  notes: string | null
  created_at: string
}

interface Deal {
  id: number
  curator_id: number
  curator_name: string
  currency_from: string
  currency_to: string
  amount_from: string
  amount_to: string
  buyback_rate: string
  sell_rate: string
  profit_eur: string
  profit_percent: string
  status: string
  notes: string | null
  created_at: string
  closed_at: string | null
}

interface Rate {
  id: number
  currency_pair: string
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
  
  // Buyback form state
  const [newBuyback, setNewBuyback] = useState({ 
    curatorId: "", 
    currency: "RUB", 
    amount: "", 
    rate: "",
    notes: ""
  })
  const [showAddBuyback, setShowAddBuyback] = useState(false)
  
  // Deal form state
  const [newDeal, setNewDeal] = useState({
    curatorId: "",
    currencyFrom: "RUB",
    currencyTo: "EUR",
    amountFrom: "",
    buybackRate: "",
    sellRate: "",
    notes: ""
  })
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [closingDeal, setClosingDeal] = useState<Deal | null>(null)
  const [closeData, setCloseData] = useState({ sellRate: "", notes: "" })

  const refresh = () => {
    startTransition(async () => {
      const result = await refreshData()
      if (result.success && result.data) {
        setData(result.data)
      }
    })
  }

  const handleAddCurator = () => {
    startTransition(async () => {
      const result = await addCurator(newCurator)
      if (result.success) {
        setNewCurator({ name: "", telegram: "", phone: "", notes: "" })
        setShowAddCurator(false)
        refresh()
      }
    })
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
        refresh()
      }
    })
  }

  const handleDeleteCurator = (id: number) => {
    if (!confirm("Удалить куратора?")) return
    startTransition(async () => {
      await deleteCurator(id)
      refresh()
    })
  }

  const handleAddBuyback = () => {
    startTransition(async () => {
      const result = await addBuyback({
        curatorId: parseInt(newBuyback.curatorId),
        currency: newBuyback.currency,
        amount: parseFloat(newBuyback.amount),
        rate: parseFloat(newBuyback.rate),
        notes: newBuyback.notes
      })
      if (result.success) {
        setNewBuyback({ curatorId: "", currency: "RUB", amount: "", rate: "", notes: "" })
        setShowAddBuyback(false)
        refresh()
      }
    })
  }

  const handleCreateDeal = () => {
    startTransition(async () => {
      const result = await createDeal({
        curatorId: parseInt(newDeal.curatorId),
        currencyFrom: newDeal.currencyFrom,
        currencyTo: newDeal.currencyTo,
        amountFrom: parseFloat(newDeal.amountFrom),
        buybackRate: parseFloat(newDeal.buybackRate),
        sellRate: parseFloat(newDeal.sellRate),
        notes: newDeal.notes
      })
      if (result.success) {
        setNewDeal({ curatorId: "", currencyFrom: "RUB", currencyTo: "EUR", amountFrom: "", buybackRate: "", sellRate: "", notes: "" })
        setShowAddDeal(false)
        refresh()
      }
    })
  }

  const handleCloseDeal = () => {
    if (!closingDeal) return
    startTransition(async () => {
      const result = await closeDeal(closingDeal.id, {
        sellRate: parseFloat(closeData.sellRate),
        notes: closeData.notes
      })
      if (result.success) {
        setClosingDeal(null)
        setCloseData({ sellRate: "", notes: "" })
        refresh()
      }
    })
  }

  // Calculate stats
  const totalProfit = data.deals
    .filter(d => d.status === "closed")
    .reduce((sum, d) => sum + parseFloat(d.profit_eur || "0"), 0)
  
  const avgProfitPercent = data.deals.filter(d => d.status === "closed").length > 0
    ? data.deals
        .filter(d => d.status === "closed")
        .reduce((sum, d) => sum + parseFloat(d.profit_percent || "0"), 0) / 
      data.deals.filter(d => d.status === "closed").length
    : 0

  const openDeals = data.deals.filter(d => d.status === "open").length
  const totalBuybacks = data.buybacks.reduce((sum, b) => sum + parseFloat(b.eur_equivalent || "0"), 0)

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Учет обменника</h1>
          <Button onClick={refresh} disabled={isPending} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Прибыль
              </div>
              <div className="text-2xl font-bold text-green-600">{totalProfit.toFixed(2)} EUR</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calculator className="w-4 h-4" />
                Средний %
              </div>
              <div className="text-2xl font-bold">{avgProfitPercent.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="w-4 h-4" />
                Открытые сделки
              </div>
              <div className="text-2xl font-bold text-yellow-600">{openDeals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wallet className="w-4 h-4" />
                Всего откупов
              </div>
              <div className="text-2xl font-bold">{totalBuybacks.toFixed(2)} EUR</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="curators" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="curators">Кураторы</TabsTrigger>
            <TabsTrigger value="buybacks">Откупы</TabsTrigger>
            <TabsTrigger value="deals">Сделки</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          {/* Curators Tab */}
          <TabsContent value="curators" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Управление кураторами</h2>
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
                    <DialogDescription>Добавьте информацию о новом кураторе</DialogDescription>
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
                        placeholder="Дополнительная информация"
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
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {curator.name}
                      </CardTitle>
                      <Badge variant={curator.is_active ? "default" : "secondary"}>
                        {curator.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {curator.telegram_username && (
                        <div className="text-muted-foreground">TG: {curator.telegram_username}</div>
                      )}
                      {curator.phone && (
                        <div className="text-muted-foreground">Тел: {curator.phone}</div>
                      )}
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">EUR:</span>
                          <span className="font-medium">{parseFloat(curator.balance_eur).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RUB:</span>
                          <span className="font-medium">{parseFloat(curator.balance_rub).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">USDT:</span>
                          <span className="font-medium">{parseFloat(curator.balance_usdt).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingCurator(curator)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Изменить
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCurator(curator.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.curators.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Кураторы не добавлены
                </div>
              )}
            </div>

            {/* Edit Curator Dialog */}
            <Dialog open={!!editingCurator} onOpenChange={() => setEditingCurator(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактировать куратора</DialogTitle>
                  <DialogDescription>Измените информацию о кураторе</DialogDescription>
                </DialogHeader>
                {editingCurator && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Имя *</label>
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

          {/* Buybacks Tab */}
          <TabsContent value="buybacks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">История откупов</h2>
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
                    <DialogDescription>Зафиксируйте откуп у куратора</DialogDescription>
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
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Валюта *</label>
                      <select 
                        className="w-full p-2 border rounded-md bg-background"
                        value={newBuyback.currency}
                        onChange={e => setNewBuyback(prev => ({ ...prev, currency: e.target.value }))}
                      >
                        <option value="RUB">RUB</option>
                        <option value="EUR">EUR</option>
                        <option value="USDT">USDT</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Сумма *</label>
                      <Input 
                        type="number"
                        value={newBuyback.amount}
                        onChange={e => setNewBuyback(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Курс к EUR *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={newBuyback.rate}
                        onChange={e => setNewBuyback(prev => ({ ...prev, rate: e.target.value }))}
                        placeholder="0.0095"
                      />
                      {newBuyback.amount && newBuyback.rate && (
                        <div className="text-sm text-muted-foreground mt-1">
                          = {(parseFloat(newBuyback.amount) * parseFloat(newBuyback.rate)).toFixed(2)} EUR
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
                      disabled={isPending || !newBuyback.curatorId || !newBuyback.amount || !newBuyback.rate}
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
                        <th className="p-3 text-right font-medium">Сумма</th>
                        <th className="p-3 text-right font-medium">Курс</th>
                        <th className="p-3 text-right font-medium">EUR</th>
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
                          <td className="p-3 text-right font-mono">
                            {parseFloat(buyback.amount).toLocaleString()} {buyback.currency}
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {parseFloat(buyback.rate).toFixed(4)}
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {parseFloat(buyback.eur_equivalent).toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {buyback.notes || "-"}
                          </td>
                        </tr>
                      ))}
                      {data.buybacks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
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

          {/* Deals Tab */}
          <TabsContent value="deals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Сделки</h2>
              <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Новая сделка
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создать сделку</DialogTitle>
                    <DialogDescription>Зафиксируйте новую сделку обмена</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Куратор *</label>
                      <select 
                        className="w-full p-2 border rounded-md bg-background"
                        value={newDeal.curatorId}
                        onChange={e => setNewDeal(prev => ({ ...prev, curatorId: e.target.value }))}
                      >
                        <option value="">Выберите куратора</option>
                        {data.curators.filter(c => c.is_active).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Из валюты</label>
                        <select 
                          className="w-full p-2 border rounded-md bg-background"
                          value={newDeal.currencyFrom}
                          onChange={e => setNewDeal(prev => ({ ...prev, currencyFrom: e.target.value }))}
                        >
                          <option value="RUB">RUB</option>
                          <option value="EUR">EUR</option>
                          <option value="USDT">USDT</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">В валюту</label>
                        <select 
                          className="w-full p-2 border rounded-md bg-background"
                          value={newDeal.currencyTo}
                          onChange={e => setNewDeal(prev => ({ ...prev, currencyTo: e.target.value }))}
                        >
                          <option value="EUR">EUR</option>
                          <option value="RUB">RUB</option>
                          <option value="USDT">USDT</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Сумма (откупа) *</label>
                      <Input 
                        type="number"
                        value={newDeal.amountFrom}
                        onChange={e => setNewDeal(prev => ({ ...prev, amountFrom: e.target.value }))}
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Курс откупа (к EUR) *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={newDeal.buybackRate}
                        onChange={e => setNewDeal(prev => ({ ...prev, buybackRate: e.target.value }))}
                        placeholder="0.0095"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Курс продажи (к EUR) *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={newDeal.sellRate}
                        onChange={e => setNewDeal(prev => ({ ...prev, sellRate: e.target.value }))}
                        placeholder="0.0105"
                      />
                      {newDeal.amountFrom && newDeal.buybackRate && newDeal.sellRate && (
                        <div className="text-sm mt-2 space-y-1">
                          <div className="text-muted-foreground">
                            Откуп: {(parseFloat(newDeal.amountFrom) * parseFloat(newDeal.buybackRate)).toFixed(2)} EUR
                          </div>
                          <div className="text-muted-foreground">
                            Продажа: {(parseFloat(newDeal.amountFrom) * parseFloat(newDeal.sellRate)).toFixed(2)} EUR
                          </div>
                          <div className="font-medium text-green-600">
                            Прибыль: {(
                              parseFloat(newDeal.amountFrom) * parseFloat(newDeal.sellRate) - 
                              parseFloat(newDeal.amountFrom) * parseFloat(newDeal.buybackRate)
                            ).toFixed(2)} EUR (
                            {(
                              ((parseFloat(newDeal.sellRate) - parseFloat(newDeal.buybackRate)) / parseFloat(newDeal.buybackRate)) * 100
                            ).toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Заметки</label>
                      <Input 
                        value={newDeal.notes}
                        onChange={e => setNewDeal(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Комментарий"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDeal(false)}>Отмена</Button>
                    <Button 
                      onClick={handleCreateDeal} 
                      disabled={isPending || !newDeal.curatorId || !newDeal.amountFrom || !newDeal.buybackRate || !newDeal.sellRate}
                    >
                      Создать
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
                        <th className="p-3 text-left font-medium">Направление</th>
                        <th className="p-3 text-right font-medium">Сумма</th>
                        <th className="p-3 text-right font-medium">Откуп</th>
                        <th className="p-3 text-right font-medium">Продажа</th>
                        <th className="p-3 text-right font-medium">Прибыль</th>
                        <th className="p-3 text-center font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deals.map(deal => (
                        <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            {new Date(deal.created_at).toLocaleDateString("ru-RU")}
                          </td>
                          <td className="p-3 font-medium">{deal.curator_name}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1">
                              {deal.currency_from}
                              <ArrowDownUp className="w-3 h-3" />
                              {deal.currency_to}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {parseFloat(deal.amount_from).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {parseFloat(deal.buyback_rate).toFixed(4)}
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {deal.sell_rate ? parseFloat(deal.sell_rate).toFixed(4) : "-"}
                          </td>
                          <td className="p-3 text-right">
                            {deal.profit_eur ? (
                              <span className={`font-mono font-medium ${parseFloat(deal.profit_eur) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {parseFloat(deal.profit_eur).toFixed(2)} EUR
                                <span className="text-xs ml-1">
                                  ({parseFloat(deal.profit_percent).toFixed(2)}%)
                                </span>
                              </span>
                            ) : "-"}
                          </td>
                          <td className="p-3 text-center">
                            {deal.status === "open" ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setClosingDeal(deal)
                                  setCloseData({ sellRate: deal.sell_rate || "", notes: "" })
                                }}
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
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Закрыть сделку</DialogTitle>
                  <DialogDescription>Укажите финальный курс продажи</DialogDescription>
                </DialogHeader>
                {closingDeal && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                      <div>Куратор: <span className="font-medium">{closingDeal.curator_name}</span></div>
                      <div>Направление: <span className="font-medium">{closingDeal.currency_from} → {closingDeal.currency_to}</span></div>
                      <div>Сумма: <span className="font-medium">{parseFloat(closingDeal.amount_from).toLocaleString()} {closingDeal.currency_from}</span></div>
                      <div>Курс откупа: <span className="font-medium">{parseFloat(closingDeal.buyback_rate).toFixed(4)}</span></div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Курс продажи *</label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={closeData.sellRate}
                        onChange={e => setCloseData(prev => ({ ...prev, sellRate: e.target.value }))}
                        placeholder="0.0105"
                      />
                      {closeData.sellRate && (
                        <div className="text-sm mt-2 font-medium text-green-600">
                          Прибыль: {(
                            parseFloat(closingDeal.amount_from) * parseFloat(closeData.sellRate) - 
                            parseFloat(closingDeal.amount_from) * parseFloat(closingDeal.buyback_rate)
                          ).toFixed(2)} EUR
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Заметки</label>
                      <Input 
                        value={closeData.notes}
                        onChange={e => setCloseData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Комментарий"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClosingDeal(null)}>Отмена</Button>
                  <Button onClick={handleCloseDeal} disabled={isPending || !closeData.sellRate}>
                    Закрыть сделку
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <h2 className="text-xl font-semibold">Статистика по кураторам</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {data.curators.map(curator => {
                const curatorDeals = data.deals.filter(d => d.curator_id === curator.id)
                const closedDeals = curatorDeals.filter(d => d.status === "closed")
                const curatorProfit = closedDeals.reduce((sum, d) => sum + parseFloat(d.profit_eur || "0"), 0)
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
    </div>
  )
}
