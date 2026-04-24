import React from "react";
import { Badge } from "@/components/ui/badge";
import { IncidentStatus, IncidentSeverity, IncidentType } from "@workspace/api-client-react";
import { incidentStatusLabels, incidentSeverityLabels, incidentTypeLabels } from "@/lib/labels";
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, Clock, Info, Shield, ShieldAlert, XCircle } from "lucide-react";

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = {
    [IncidentStatus.new]: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Circle },
    [IncidentStatus.in_progress]: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
    [IncidentStatus.resolved]: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    [IncidentStatus.closed]: { color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: XCircle },
  };
  const { color, icon: Icon } = config[status];
  
  return (
    <Badge variant="outline" className={`${color} gap-1.5 pr-2.5 font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {incidentStatusLabels[status]}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const config = {
    [IncidentSeverity.low]: { color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: Info },
    [IncidentSeverity.medium]: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle },
    [IncidentSeverity.high]: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: AlertCircle },
    [IncidentSeverity.critical]: { color: "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse", icon: ShieldAlert },
  };
  const { color, icon: Icon } = config[severity];
  
  return (
    <Badge variant="outline" className={`${color} gap-1.5 pr-2.5 font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {incidentSeverityLabels[severity]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: IncidentType }) {
  return (
    <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground font-medium flex items-center gap-1.5">
      <Shield className="w-3 h-3 text-muted-foreground" />
      {incidentTypeLabels[type]}
    </Badge>
  );
}
