import React from "react";
import { useListAudit, getListAuditQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Activity, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLog() {
  const { data: auditLogs, isLoading } = useListAudit({
    query: { queryKey: getListAuditQueryKey({ limit: 100 }) }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Журнал аудита</h1>
        <p className="text-muted-foreground">Глобальный лог действий в системе SecureTracker</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Последние 100 событий
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Дата и время</TableHead>
                <TableHead className="w-[150px]">Пользователь</TableHead>
                <TableHead className="w-[100px]">INC ID</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead className="hidden md:table-cell">Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : auditLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Записи отсутствуют
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs?.map(log => (
                  <TableRow key={log.id} className="text-sm hover:bg-muted/30">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.user?.name || "Система"}
                    </TableCell>
                    <TableCell>
                      {log.incidentId ? (
                        <Link href={`/incidents/${log.incidentId}`} className="font-mono text-primary hover:underline">
                          INC-{log.incidentId}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground max-w-[300px] truncate">
                      {log.details || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
