import * as Dialog from "@radix-ui/react-dialog";
import { Command, FileText, Search, X } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui";

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const navigate = useNavigate();
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const submit = () => { if (!term.trim()) return; navigate(`/acompanhamento?q=${encodeURIComponent(term.trim())}`); setOpen(false); };
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild>
      <button className={compact ? "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" : "group hidden h-10 w-full max-w-[620px] items-center gap-3 rounded-xl border border-border/90 bg-card/90 px-3.5 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:shadow-soft md:flex"}>
        <Search className="h-4 w-4" /><span className={compact ? "sr-only" : "flex-1 truncate"}>Pesquise solicitação, ORC, OS, pedido, NF, prefixo...</span>{!compact && <kbd className="flex items-center gap-1 rounded-md border border-border bg-muted/70 px-2 py-1 text-[11px]"><Command className="h-3 w-3" />K</kbd>}
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[#07111a]/45 backdrop-blur-sm data-[state=open]:animate-in" />
      <Dialog.Content className="fixed left-1/2 top-[15%] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4"><Search className="h-5 w-5 text-muted-foreground" /><Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="h-14 border-0 bg-transparent px-0 shadow-none focus:ring-0" placeholder="Digite ORC, OS, pedido, NF, fornecedor ou equipamento" /><Dialog.Close className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></Dialog.Close></div>
        <div className="p-3"><button onClick={submit} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"><div className="rounded-xl bg-primary-subtle p-2 text-primary"><FileText className="h-4 w-4" /></div><div><p className="text-sm font-medium">Buscar em Acompanhamento</p><p className="text-xs text-muted-foreground">Pesquisa global em todos os campos rastreáveis</p></div></button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
