import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { cn } from "@cozystack/ui"

export function TenantSelector() {
  const { tenants, selectedTenant, selectTenant, isLoading } = useTenantContext()
  const [open, setOpen] = useState(false)

  if (isLoading && !tenants.length) {
    return <div className="text-xs text-slate-400">loading tenants…</div>
  }
  if (!tenants.length) {
    return <div className="text-xs text-amber-600">no tenants found</div>
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50"
      >
        <span className="text-slate-500">Tenant:</span>
        <span className="font-medium text-slate-900">{selectedTenant ?? "—"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {tenants.map((t) => {
              const selected = t.metadata.name === selectedTenant
              return (
                <button
                  key={t.metadata.name}
                  type="button"
                  onClick={() => {
                    selectTenant(t.metadata.name)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50",
                    selected ? "font-medium text-slate-900" : "text-slate-600",
                  )}
                >
                  <span className="truncate">{t.metadata.name}</span>
                  {selected && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
