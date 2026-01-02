"use client"

import { MapPin } from "lucide-react"

export default function LocationsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="size-12 text-muted-foreground mb-4" strokeWidth={1} />
          <h1 className="text-lg font-medium mb-2">Locations</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Explore Pokemon locations and encounter areas. Coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
