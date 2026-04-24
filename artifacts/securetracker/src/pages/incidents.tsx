import React, { useState } from "react";
import { Link } from "wouter";
import { useListIncidents, getListIncidentsQueryKey, IncidentStatus, IncidentSeverity, IncidentType } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, SeverityBadge, TypeBadge } from "@/components/badges";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Plus, FilterX, AlertCircle } from "lucide-react";
import { incidentStatusLabels, incidentSeverityLabels, incidentTypeLabels } from "@/lib/labels";
import { useDebounce } from "@/hooks/use-debounce";
import { motion } from "framer-motion";

export default function Incidents() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [severity, setSeverity] = useState<IncidentSeverity | "all">("all");
  const [type, setType] = useState<IncidentType | "all">("all");

  const { data: incidents, isLoading } = useListIncidents(
    {
      search: debouncedSearch || undefined,
      status: status !== "all" ? status : undefined,
      severity: severity !== "all" ? severity : undefined,
      type: type !== "all" ? type : undefined,
    },
    {
      query: {
        queryKey: getListIncidentsQueryKey({
          search: debouncedSearch || undefined,
          status: status !== "all" ? status : undefined,
          severity: severity !== "all" ? severity : undefined,
          type: type !== "all" ? type : undefined,
        })
      }
    }
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setSeverity("all");
    setType("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Инциденты</h1>
          <p className="text-muted-foreground">Реестр инцидентов информационной безопасности</p>
        </div>
        <Button asChild>
          <Link href="/incidents/new">
            <Plus className="w-4 h-4 mr-2" />
            Зарегистрировать инцидент
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или описанию..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(incidentStatusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={severity} onValueChange={(val: any) => setSeverity(val)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Критичность" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любая критичность</SelectItem>
                  {Object.entries(incidentSeverityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип инцидента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {Object.entries(incidentTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || status !== "all" || severity !== "all" || type !== "all") && (
                <Button variant="ghost" onClick={resetFilters} className="px-3">
                  <FilterX className="w-4 h-4 mr-2" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="rounded-md border-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Критичность</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Исполнитель</TableHead>
                <TableHead className="text-right">Создан</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-64 bg-muted animate-pulse rounded"></div></TableCell>
                    <TableCell><div className="h-6 w-24 bg-muted animate-pulse rounded-full"></div></TableCell>
                    <TableCell><div className="h-6 w-24 bg-muted animate-pulse rounded-full"></div></TableCell>
                    <TableCell><div className="h-6 w-24 bg-muted animate-pulse rounded-full"></div></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded"></div></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : incidents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
                      <p>Инциденты не найдены</p>
                      <p className="text-sm mt-1">Попробуйте изменить параметры фильтрации</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                incidents?.map((incident, i) => (
                  <TableRow key={incident.id} className="group hover:bg-muted/30 cursor-pointer transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                      <Link href={`/incidents/${incident.id}`}>
                        <span className="absolute inset-0 z-10" />
                        INC-{incident.id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate" title={incident.title}>
                      {incident.title}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={incident.status} />
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={incident.type} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {incident.assignee?.name || <span className="text-muted-foreground italic">Не назначен</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(incident.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
