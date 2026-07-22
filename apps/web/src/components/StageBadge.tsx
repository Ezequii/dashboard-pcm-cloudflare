import { AlertTriangle, CheckCircle2, CircleDashed, FileClock, ReceiptText } from "lucide-react";
import type { Stage } from "@/types";
import { Badge } from "@/components/ui";
import { stageLabel } from "@/lib/utils";

export function StageBadge({ stage }: { stage: Stage }) {
  const config = {
    SEM_LANCAMENTO: { icon: CircleDashed, variant: "neutral" as const },
    SEM_PEDIDO: { icon: FileClock, variant: "default" as const },
    SEM_NF: { icon: ReceiptText, variant: "warning" as const },
    CONCLUIDO: { icon: CheckCircle2, variant: "success" as const },
    INCONSISTENTE: { icon: AlertTriangle, variant: "danger" as const }
  }[stage];
  const Icon = config.icon;
  return <Badge variant={config.variant}><Icon className="h-3.5 w-3.5" />{stageLabel(stage)}</Badge>;
}
