"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

const cities = [{ id: "belgrade", name: "Белград (Belgrade)", flag: "🏛️" }]

export function LocationSwitcher() {
  return (
    <Select defaultValue="belgrade">
      <SelectTrigger className="w-full bg-black/50 border-gray-600 text-white h-12">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-black border-gray-600">
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.id} className="text-white hover:bg-gray-800">
            <div className="flex items-center gap-2">
              <span>{city.flag}</span>
              <span>{city.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
