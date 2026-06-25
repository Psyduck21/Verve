import { TemplateLibrary } from "@/components/templates/TemplateLibrary"

export const metadata = {
    title: "Template Library | Verve",
    description: "Create and manage reusable task templates for common workflows and recurring task patterns.",
}

export default function TemplatesPage() {
    return (
        <div className="flex flex-col h-full w-full bg-transparent">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8">
                    <TemplateLibrary />
                </div>
            </div>
        </div>
    )
}
