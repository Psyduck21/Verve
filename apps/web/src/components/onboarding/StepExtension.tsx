"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Puzzle, Download, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

export function StepExtension() {
  const { updateData, skipStep } = useOnboarding()
  const [installed, setInstalled] = useState(false)

  const handleInstall = () => {
    window.open("https://github.com/Psyduck21/Verve/releases/latest", "_blank")
    setInstalled(true)
    updateData({ extension_installed: true })
  }

  const handleSkip = () => {
    updateData({ extension_installed: false })
    skipStep(4)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border transition-all ${
            installed
              ? "bg-green-500/10 border-green-500/30"
              : "bg-background border-border/50"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                installed ? "bg-green-500/20" : "bg-primary/10"
              }`}>
                <Puzzle size={24} className={installed ? "text-green-500" : "text-primary"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Verve Chrome Extension</span>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                    Recommended
                  </span>
                </div>
                <span className="text-xs text-muted-foreground block mt-1">
                  Access your schedule from any tab and capture tasks instantly.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {installed ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-semibold">Installed</span>
                </div>
              ) : (
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="rounded-full"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Install
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm block mb-2">Manual Installation Instructions</span>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click <strong>Install</strong> above to download the latest `.zip` from GitHub.</li>
              <li>Extract the `.zip` file to a folder on your computer.</li>
              <li>Open Chrome and navigate to <code className="bg-background px-1 py-0.5 rounded">chrome://extensions</code></li>
              <li>Enable <strong>Developer mode</strong> in the top right corner.</li>
              <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
      </div>
    </div>
  )
}
