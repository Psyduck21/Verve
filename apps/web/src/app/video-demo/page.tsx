"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Check, CheckCircle2, GripVertical, AlertCircle, Calendar, Plus, Command, LayoutGrid, Inbox, Search, Bell, Settings, MoreHorizontal, ChevronRight, Mail, Reply, Forward, Star, Archive } from "lucide-react"
import { VerveLogo } from "@/components/ui/VerveLogo"

export default function VideoDemoPage() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        document.documentElement.classList.add('dark')

        const sequence = async () => {
            // Give layout time to mount
            await new Promise(r => setTimeout(r, 1000))

            // Step 1: Onboarding Welcome (0 - 3s)
            setStep(1)
            await new Promise(r => setTimeout(r, 3000))

            // Step 2: Onboarding AI Setup (3 - 6s)
            setStep(2)
            await new Promise(r => setTimeout(r, 3000))

            // Step 3: Gmail Integration (6 - 11s)
            setStep(3)
            await new Promise(r => setTimeout(r, 5000))

            // Step 4: Main App - Omniprompt Task Creation (11 - 16s)
            setStep(4)
            await new Promise(r => setTimeout(r, 5000))

            // Step 5: Main App - AI Rescheduling (16 - 21s)
            setStep(5)
            await new Promise(r => setTimeout(r, 5000))

            // Step 6: Main App - Unscheduled Drag Drop (21 - 27s)
            setStep(6)
            await new Promise(r => setTimeout(r, 6000))

            // Step 7: Main App - My Tasks (27 - 31s)
            setStep(7)
            await new Promise(r => setTimeout(r, 6000))
        }
        
        sequence()

        return () => {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-8 overflow-hidden text-foreground">
            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/20 blur-[150px] rounded-full pointer-events-none opacity-50" />

            {/* macOS Window Frame */}
            <div className="w-[1280px] h-[800px] bg-background/95 backdrop-blur-3xl rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border border-border/40 flex flex-col relative ring-1 ring-white/10">
                
                {/* Title Bar */}
                <div className="h-10 border-b border-border/30 flex items-center px-4 bg-background/60 backdrop-blur-md relative z-50">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/90 shadow-sm border border-black/10"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/90 shadow-sm border border-black/10"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/90 shadow-sm border border-black/10"></div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
                        {step === 3 ? <Mail className="h-3 w-3 text-muted-foreground" /> : <VerveLogo className="h-3 w-3 text-primary" />}
                        {step === 3 ? 'Mail' : 'Verve'}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative overflow-hidden flex bg-background">
                    <AnimatePresence mode="wait">
                        {step === 1 && <OnboardingWelcome key="step1" />}
                        {step === 2 && <OnboardingAISetup key="step2" />}
                        {step === 3 && <GmailIntegration key="step3" />}
                        {step >= 4 && step <= 7 && <MainApp layoutStep={step} key="mainapp" />}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

function OnboardingWelcome() {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background relative"
        >
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
            <div className="z-10 flex flex-col items-center">
                <div className="h-24 w-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                    <VerveLogo className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                    Welcome to Verve.
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                    Tell us about your schedule so we can set up your perfect workflow.
                </p>
                <div className="mt-12">
                    <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 0.95, 1] }}
                        transition={{ delay: 2.5, duration: 0.5 }}
                        className="h-12 px-8 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/25 cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                        Get Started
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

function OnboardingAISetup() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background relative"
        >
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="h-24 w-24 rounded-3xl flex items-center justify-center mb-10 bg-gradient-to-tr from-primary via-violet-500 to-pink-500 text-white shadow-2xl shadow-primary/30 p-1"
            >
                <div className="w-full h-full bg-background/90 rounded-[22px] flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="h-10 w-10 text-primary" />
                </div>
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">AI is analyzing your routine...</h1>
            <p className="text-muted-foreground max-w-md mb-10">
                Generating your personalized perfect schedule based on your goals.
            </p>
            <div className="w-80 h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-primary to-pink-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                />
            </div>
        </motion.div>
    )
}

function GmailIntegration() {
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => {
            setSaved(true)
        }, 2000)
        return () => clearTimeout(t)
    }, [])

    return (
        <motion.div 
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex bg-[#121212] w-full h-full text-zinc-300 font-sans"
        >
            {/* Sidebar */}
            <div className="w-64 border-r border-zinc-800 p-4">
                <div className="h-10 mb-6 flex items-center text-xl font-medium text-zinc-100 gap-3">
                    <Mail className="text-zinc-400" />
                    Mail
                </div>
                <div className="bg-zinc-800/50 text-red-300 rounded-full py-2 px-4 mb-4 text-sm font-bold flex items-center justify-between cursor-pointer">
                    Inbox
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">1</span>
                </div>
                <div className="py-2 px-4 mb-1 text-sm flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 rounded-full"><Star size={16}/> Starred</div>
                <div className="py-2 px-4 mb-1 text-sm flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 rounded-full"><Archive size={16}/> Archive</div>
            </div>

            {/* Email Content */}
            <div className="flex-1 flex flex-col bg-[#1a1a1a]">
                <div className="h-16 border-b border-zinc-800 flex items-center px-6 gap-4">
                    <div className="h-10 flex-1 bg-zinc-800/50 rounded-full flex items-center px-4 border border-zinc-700/50 text-zinc-400 text-sm">
                        <Search size={16} className="mr-3" />
                        Search mail
                    </div>
                </div>
                <div className="p-8 max-w-4xl">
                    <h1 className="text-2xl font-normal text-zinc-100 mb-6">Review Q3 Marketing Strategy</h1>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                            S
                        </div>
                        <div>
                            <div className="font-bold text-zinc-100 text-sm">Sarah Jenkins <span className="text-zinc-500 font-normal ml-2">&lt;sarah@company.com&gt;</span></div>
                            <div className="text-xs text-zinc-500">to me, team</div>
                        </div>
                    </div>

                    <div className="text-sm text-zinc-300 space-y-4 max-w-2xl leading-relaxed">
                        <p>Hi Team,</p>
                        <p>The draft for the Q3 Marketing Strategy is ready for review. Please take a look at the attached documents and add your comments by EOD Friday.</p>
                        <p>We need to finalize the budget allocations for the upcoming campaigns.</p>
                        <p>Best,<br/>Sarah</p>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <div className="border border-zinc-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 cursor-pointer">
                            <Reply size={16} /> Reply
                        </div>
                        <div className="border border-zinc-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 cursor-pointer">
                            <Forward size={16} /> Forward
                        </div>
                        
                        {/* Verve Extension Button */}
                        <motion.div
                            animate={saved ? { scale: 1 } : { scale: [1, 0.95, 1] }}
                            transition={{ scale: { delay: 1.5, duration: 0.5 } }}
                            className="ml-auto border border-primary/40 bg-primary/10 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-primary transition-colors relative overflow-hidden"
                        >
                            {saved ? (
                                <>
                                    <CheckCircle2 size={16} className="text-primary" />
                                    <span>Saved to Inbox</span>
                                </>
                            ) : (
                                <>
                                    <VerveLogo className="w-4 h-4 text-primary" />
                                    <span>Save to Verve</span>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {saved && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-100 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-zinc-700 text-sm font-medium"
                    >
                        <VerveLogo className="w-5 h-5 text-primary" />
                        Added "Review Q3 Marketing Strategy" to your Verve Inbox.
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function MainApp({ layoutStep }: { layoutStep: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8 }}
            className="flex-1 flex w-full h-full bg-background"
        >
            {/* Sidebar */}
            <div className="w-64 border-r border-border/40 bg-card/30 p-4 flex flex-col gap-2 relative z-10 backdrop-blur-xl">
                <div className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                        <VerveLogo className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Verve</span>
                </div>
                
                <div className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">Views</div>
                <SidebarItem icon={<Calendar size={18} />} label="Calendar" active={layoutStep !== 7} />
                <SidebarItem icon={<Inbox size={18} />} label="My Tasks" active={layoutStep === 7} badge="3" />
                <SidebarItem icon={<LayoutGrid size={18} />} label="Projects" />
                
                <div className="mt-8 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">Filters</div>
                <SidebarItem icon={<div className="w-3 h-3 rounded-full bg-blue-500" />} label="Work" />
                <SidebarItem icon={<div className="w-3 h-3 rounded-full bg-pink-500" />} label="Personal" />
                
                <div className="mt-auto flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                        JS
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium truncate">John Smith</div>
                        <div className="text-xs text-muted-foreground truncate">Pro Plan</div>
                    </div>
                    <Settings size={16} className="text-muted-foreground" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative bg-background">
                {/* Topbar */}
                <div className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-20">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold tracking-tight">{layoutStep !== 7 ? 'Today' : 'Inbox'}</h2>
                        {layoutStep !== 7 && (
                            <div className="px-3 py-1 bg-muted/40 rounded-full text-xs font-medium text-muted-foreground border border-border/50">
                                October 24, 2026
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-64 h-9 bg-muted/40 rounded-lg border border-border/50 flex items-center px-3 text-muted-foreground text-sm">
                            <Search size={14} className="mr-2 opacity-50" />
                            Search...
                            <div className="ml-auto flex gap-1">
                                <kbd className="px-1.5 bg-background rounded text-[10px] font-mono border border-border/50">⌘</kbd>
                                <kbd className="px-1.5 bg-background rounded text-[10px] font-mono border border-border/50">K</kbd>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground">
                            <Bell size={18} />
                        </div>
                        {layoutStep !== 7 && (
                            <motion.div 
                                animate={layoutStep === 5 ? { scale: [1, 1.05, 1], boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" } : {}}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="h-9 px-4 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 font-medium text-sm shadow-lg shadow-primary/20 relative overflow-hidden group"
                            >
                                <Sparkles size={14} className="relative z-10" />
                                <span className="relative z-10">AI Optimize</span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {layoutStep !== 7 ? (
                    <>
                        <div className="flex-1 p-6 flex gap-6 overflow-hidden relative z-10">
                            {/* Calendar Grid Mock */}
                            <div className="flex-1 relative border border-border/40 rounded-2xl bg-card/20 overflow-hidden shadow-sm flex flex-col">
                                <div className="flex border-b border-border/40 bg-card/40">
                                    <div className="w-16 border-r border-border/40"></div>
                                    <div className="flex-1 py-3 text-center text-sm font-medium">Monday <span className="text-muted-foreground ml-1">24</span></div>
                                </div>
                                <div className="flex-1 relative overflow-hidden bg-grid-white/[0.02] bg-[length:100%_12.5%]">
                                    <div className="absolute top-0 left-0 w-16 h-full border-r border-border/40 bg-card/40 flex flex-col text-[11px] font-medium text-muted-foreground">
                                        {[9, 10, 11, 12, 1, 2, 3, 4].map(h => (
                                            <div key={h} className="flex-1 flex items-start justify-center pt-2">{h} {h === 12 ? 'PM' : h < 9 ? 'PM' : 'AM'}</div>
                                        ))}
                                    </div>
                                    <div className="absolute top-0 left-16 right-0 h-full">
                                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                            <div key={i} className="w-full h-[12.5%] border-b border-border/20" />
                                        ))}
                                        
                                        <motion.div 
                                            animate={layoutStep === 5 ? { top: "37.5%" } : { top: "12.5%" }}
                                            transition={{ duration: 1, ease: "easeInOut", delay: 1 }}
                                            className="absolute left-3 right-3 h-[22%] bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 backdrop-blur-sm shadow-sm flex flex-col"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="text-sm font-bold text-blue-400">Deep Work: Architecture</div>
                                                <MoreHorizontal size={14} className="text-blue-400/50" />
                                            </div>
                                            <div className="text-xs text-blue-400/70 mt-1 flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" /> Focus time
                                            </div>
                                        </motion.div>

                                        <motion.div 
                                            animate={layoutStep === 5 ? { top: "12.5%", height: "22%" } : { top: "50%", height: "12%" }}
                                            transition={{ duration: 1, ease: "easeInOut", delay: 1.1 }}
                                            className="absolute left-3 right-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 backdrop-blur-sm shadow-sm flex flex-col"
                                        >
                                            <div className="text-sm font-bold text-purple-400">Team Standup</div>
                                            <div className="text-xs text-purple-400/70 mt-1">Google Meet</div>
                                        </motion.div>

                                        <AnimatePresence>
                                            {layoutStep >= 6 && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.8, top: "75%", left: "100%" }}
                                                    animate={{ opacity: 1, scale: 1, top: "62.5%", left: "0.75rem" }}
                                                    transition={{ duration: 1.5, ease: "easeInOut", delay: 1.5 }}
                                                    className="absolute right-3 h-[12%] bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-3 shadow-lg shadow-emerald-500/10 backdrop-blur-sm"
                                                >
                                                    <div className="text-sm font-bold text-emerald-400">Review Q3 Marketing Strategy</div>
                                                    <div className="text-xs text-emerald-400/70 mt-0.5 flex gap-1 items-center">
                                                        <Mail size={10} /> Saved from Gmail
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Unscheduled Panel */}
                            <AnimatePresence>
                                {layoutStep >= 6 && (
                                    <motion.div 
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 320, opacity: 1 }}
                                        className="h-full bg-card/40 border border-border/40 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-md"
                                    >
                                        <div className="p-4 border-b border-border/40 bg-background/50 flex justify-between items-center">
                                            <h3 className="font-bold flex items-center gap-2 text-sm tracking-tight">
                                                <AlertCircle size={16} className="text-primary" />
                                                Unscheduled Tasks
                                            </h3>
                                            <div className="text-xs bg-muted/50 px-2 py-0.5 rounded-full font-medium">3</div>
                                        </div>
                                        <div className="p-4 flex flex-col gap-3 overflow-y-auto relative">
                                            {/* Dragged item (simulated drag) */}
                                            <motion.div 
                                                initial={{ opacity: 0, x: -50 }}
                                                animate={{ opacity: [0, 1, 1, 0], x: [-50, 0, 0, -200], scale: [1, 1, 1.05, 0.9] }}
                                                transition={{ 
                                                    opacity: { times: [0, 0.2, 0.8, 1], duration: 3, delay: 0.5 },
                                                    x: { times: [0, 0.2, 0.8, 1], duration: 3, delay: 0.5 },
                                                    scale: { times: [0, 0.2, 0.8, 1], duration: 3, delay: 0.5 }
                                                }}
                                                className="p-3 border border-border/60 rounded-xl bg-background/80 flex gap-3 items-start shadow-sm relative z-20"
                                            >
                                                <GripVertical size={16} className="text-muted-foreground mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-foreground">Review Q3 Marketing Strategy</div>
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium border border-border/50 flex items-center gap-1"><Mail size={10}/> Gmail</div>
                                                        <div className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-medium border border-emerald-400/20">High</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                            
                                            <motion.div 
                                                initial={{ y: 0 }}
                                                animate={{ y: -80 }}
                                                transition={{ delay: 3, duration: 0.5 }}
                                                className="p-3 border border-border/60 rounded-xl bg-background/80 flex gap-3 items-start shadow-sm"
                                            >
                                                <GripVertical size={16} className="text-muted-foreground mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-foreground">Write blog post</div>
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium border border-border/50">30m</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    // My Tasks View
                    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                        <div className="p-8 max-w-4xl w-full mx-auto flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold tracking-tight">Inbox</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Tasks waiting to be scheduled</p>
                                </div>
                                <div className="h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                                    <Plus size={18} />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {/* The Gmail task being completed */}
                                <motion.div 
                                    initial={{ opacity: 1, x: 0, height: 72 }}
                                    animate={{ opacity: 0, x: 50, height: 0, marginBottom: 0, padding: 0, border: 0 }}
                                    transition={{ delay: 2.5, duration: 0.5 }}
                                    className="p-4 bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm flex items-center gap-4 overflow-hidden"
                                >
                                    <motion.div
                                        initial={{ borderColor: "rgba(255,255,255,0.2)" }}
                                        animate={{ borderColor: "#10b981" }}
                                        transition={{ delay: 1.5, duration: 0.2 }}
                                        className="h-5 w-5 rounded-md border-2 flex items-center justify-center text-white"
                                    >
                                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.7 }}>
                                            <Check size={14} strokeWidth={3} />
                                        </motion.div>
                                    </motion.div>
                                    <div className="flex-1">
                                        <span className="font-medium">
                                            Review Q3 Marketing Strategy
                                        </span>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Mail size={12} /> Source: Gmail
                                        </div>
                                    </div>
                                    <div className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">High Priority</div>
                                </motion.div>
                                
                                <div className="p-4 bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm flex items-center gap-4">
                                    <div className="h-5 w-5 rounded-md border-2 border-muted-foreground/50" />
                                    <span className="font-medium flex-1">Update landing page design</span>
                                    <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/50">Today</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Omniprompt Overlay */}
                <AnimatePresence>
                    {layoutStep === 4 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-start justify-center pt-48"
                        >
                            <motion.div 
                                initial={{ y: -30, scale: 0.9, opacity: 0 }}
                                animate={{ y: 0, scale: 1, opacity: 1 }}
                                exit={{ y: 30, scale: 0.9, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.5 }}
                                className="w-[680px] bg-card/80 border border-border/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl ring-1 ring-white/10"
                            >
                                <div className="flex items-center p-5 border-b border-border/40 gap-4">
                                    <Command className="text-primary" size={24} />
                                    <div className="text-xl font-medium flex-1 text-foreground">
                                        <TypewriterText text="Design new landing page tomorrow at 2 PM" delay={1000} />
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/20 text-xs text-muted-foreground flex justify-between items-center px-5">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-primary"/> AI parsing active</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span>Create task</span>
                                        <kbd className="px-2 py-1 bg-background/50 border border-border/50 rounded font-mono text-[10px] text-foreground">Enter ↵</kbd>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* AI Reschedule Toast */}
                <AnimatePresence>
                    {layoutStep === 5 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", delay: 2.5 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-sm z-50 ring-1 ring-white/20"
                        >
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <Sparkles size={14} className="text-primary" />
                            </div>
                            Rescheduled 3 tasks to maximize your deep work blocks.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

function SidebarItem({ icon, label, active = false, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
    return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-primary/10 text-primary shadow-sm border border-primary/20" : "text-muted-foreground"}`}>
            <div className={active ? "text-primary" : "text-muted-foreground"}>{icon}</div>
            <span className="flex-1">{label}</span>
            {badge && (
                <div className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {badge}
                </div>
            )}
        </div>
    )
}


function TypewriterText({ text, delay = 0 }: { text: string, delay?: number }) {
    const [displayed, setDisplayed] = useState("")
    const [start, setStart] = useState(false)
    
    useEffect(() => {
        const t = setTimeout(() => setStart(true), delay)
        return () => clearTimeout(t)
    }, [delay])

    useEffect(() => {
        if (!start) return;
        let i = 0
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.substring(0, i + 1))
                i++
            } else {
                clearInterval(interval)
            }
        }, 40)
        return () => clearInterval(interval)
    }, [text, start])

    // Highlight "tomorrow at 2 PM"
    const highlightTarget = "tomorrow at 2 PM"
    if (displayed.includes(highlightTarget)) {
        const parts = displayed.split(highlightTarget)
        return (
            <span>
                {parts[0]}
                <span className="text-primary bg-primary/15 rounded-md px-1.5 py-0.5 border border-primary/30 mx-1">{highlightTarget}</span>
                {parts[1]}
            </span>
        )
    }

    return <span>{displayed}<span className="animate-pulse text-primary ml-0.5">|</span></span>
}
