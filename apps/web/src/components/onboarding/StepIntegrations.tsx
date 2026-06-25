"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Calendar, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const INTEGRATIONS = [
  {
    id: "google_calendar",
    title: "Google Calendar",
    description: "Sync your existing events and meetings",
    icon: Calendar,
    recommended: true,
  },
]

export function StepIntegrations() {
  const { collectedData, updateData } = useOnboarding()
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([])
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user returned from OAuth with success/error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const errorParam = urlParams.get('error')

    if (success === 'google_connected') {
      setConnectedIntegrations(['google_calendar'])
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (errorParam) {
      setError('Failed to connect Google Calendar. Please try again.')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleConnect = async (integrationId: string) => {
    setIsConnecting(integrationId)
    setError(null)

    try {
      // For Google Calendar, redirect to OAuth flow
      if (integrationId === 'google_calendar') {
        // Redirect directly to the OAuth endpoint with redirect_to parameter
        window.location.href = '/api/v1/integrations/google/auth?redirect_to=onboarding'
      }
    } catch (err) {
      setError('Failed to connect integration. Please try again.')
      setIsConnecting(null)
    }
  }

  const handleSkip = () => {
    updateData({ skipped_integrations: INTEGRATIONS.map(i => i.id) })
  }

  const isConnected = (id: string) => connectedIntegrations.includes(id)

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Connect Your Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Sync your existing events to avoid conflicts. This is optional — you can connect later in settings.
        </p>
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon
          const connected = isConnected(integration.id)
          const connecting = isConnecting === integration.id

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border transition-all ${
                connected
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-background border-border/50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    connected
                      ? "bg-green-500/20"
                      : "bg-muted"
                  }`}>
                    <Icon size={24} className={connected ? "text-green-500" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{integration.title}</span>
                      {integration.recommended && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block mt-1">
                      {integration.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connected ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 size={20} />
                      <span className="text-sm font-semibold">Connected</span>
                    </div>
                  ) : connecting ? (
                    <Button disabled size="sm" className="rounded-full">
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Connecting...
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnect(integration.id)}
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      Connect
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20"
        >
          {error}
        </motion.div>
      )}

      <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={16} className="text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm block">Why connect?</span>
            <span className="text-xs text-muted-foreground block mt-1">
              Verve will read your calendar events to prevent scheduling conflicts and find optimal time blocks for your tasks. Your data stays private and is never shared.
            </span>
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
