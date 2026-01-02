"use client"

import { Smartphone, Share, Plus, MoreVertical, Download } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-md space-y-8">
        <section className="space-y-3">
          <h1 className="text-lg font-medium">betterdex</h1>
          <p className="text-sm text-muted-foreground">
            A modern Pokedex web app built for Pokemon fans.
          </p>
        </section>

        <section className="space-y-4">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Install as App
          </label>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Smartphone className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">iPhone / iPad</p>
                <ol className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">1</span>
                    <span>Open this site in Safari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">2</span>
                    <span className="flex items-center gap-1">
                      Tap the Share button <Share className="size-3.5 inline" />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">3</span>
                    <span className="flex items-center gap-1">
                      Scroll down and tap "Add to Home Screen" <Plus className="size-3.5 inline" />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">4</span>
                    <span>Tap "Add" to confirm</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Smartphone className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Android</p>
                <ol className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">1</span>
                    <span>Open this site in Chrome</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">2</span>
                    <span className="flex items-center gap-1">
                      Tap the menu button <MoreVertical className="size-3.5 inline" />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">3</span>
                    <span className="flex items-center gap-1">
                      Tap "Install app" or "Add to Home screen" <Download className="size-3.5 inline" />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted text-foreground size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium">4</span>
                    <span>Tap "Install" to confirm</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p>
            data: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">pokeapi.co</a>
          </p>
          <p>pokemon is a trademark of nintendo</p>
        </section>
      </div>
    </div>
  )
}
