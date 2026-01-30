"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

const cities = [
  { id: "budva", name: "Будва" },
  { id: "tivat", name: "Тиват" },
  { id: "herceg-novi", name: "Херцег-Нови" },
  { id: "bar", name: "Бар" },
  { id: "podgorica", name: "Подгорица" },
  { id: "other", name: "Другой город" },
]

interface LocationSwitcherProps {
  value?: string
  onChange?: (value: string) => void
}

export function LocationSwitcher({ value = "budva", onChange }: LocationSwitcherProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-black/50 border-gray-600 text-white h-12">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-black border-gray-600">
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.id} className="text-white hover:bg-gray-800">
            <span>{city.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function getCityName(cityId: string): string {
  const city = cities.find(c => c.id === cityId)
  return city ? city.name : cityId
}
