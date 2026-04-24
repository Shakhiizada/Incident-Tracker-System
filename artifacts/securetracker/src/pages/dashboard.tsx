import React from "react";
import { Link } from "wouter";
import { 
  useGetStatsSummary, getGetStatsSummaryQueryKey,
  useGetStatsByType, getGetStatsByTypeQueryKey,
  useGetStatsBySeverity, getGetStatsBySeverityQueryKey,
  useGetStatsTimeline, getGetStatsTimelineQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
  useListIncidents, getListIncidentsQueryKey,
  UserRole
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Activity, Shield, ArrowUpRight, Inbox, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { incidentTypeLabels, incidentSeverityLabels, incidentStatusLabels } from "@/lib/labels";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, SeverityBadge } from "@/components/badges";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.admin;
  const isAnalyst = user?.role === UserRole.analyst;
  const isStaff = isAdmin || isAnalyst;

  if (!user) return null;

  if (isStaff) {
    return <StaffDashboard role={user.role} />;
  }
  return <EmployeeDashboard userId={user.id} />;
}

function StaffDashboard({ role }: { role: string }) {
  const { data: summary, isLoading: isLoadingSummary } = useGetStatsSummary({
    query: { queryKey: getGetStatsSummaryQueryKey() }
  });
  const { data: typeStats, isLoading: isLoadingType } = useGetStatsByType({
    query: { queryKey: getGetStatsByTypeQueryKey() }
  });
  const { data: severityStats, isLoading: isLoadingSeverity } = useGetStatsBySeverity({
    query: { queryKey: getGetStatsBySeverityQueryKey() }
  });
  const { data: timeline, isLoading: isLoadingTimeline } = useGetStatsTimeline({
    query: { queryKey: getGetStatsTimelineQueryKey({ days: 14 }) }
  });
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) }
  });
  const { data: assignedToMe } = useListIncidents(
    { assigneeId: "me" } as any,
    { query: { queryKey: getListIncidentsQueryKey({ assigneeId: "me" } as any) } }
  );

  const COLORS = {
    primary: "hsl(var(--primary))",
    critical: "hsl(var(--destructive))",
    high: "hsl(var(--chart-4))",
    medium: "hsl(var(--chart-3))",
    low: "hsl(var(--chart-2))",
  };
  const severityColors: Record<string, string> = {
    critical: COLORS.critical,
    high: COLORS.high,
    medium: COLORS.medium,
    low: COLORS.low,
  };

  const myOpenAssigned = (assignedToMe ?? []).filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-muted-foreground">
            {role === "admin"
              ? "Сводка по всем инцидентам ИБ организации"
              : "Аналитика и оперативная работа с инцидентами"}
          </p>
        </div>
        <Button asChild>
          <Link href="/incidents/new">Зарегистрировать инцидент</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard
          to="/incidents"
          title="Всего инцидентов"
          value={summary?.total}
          icon={<Shield className="w-4 h-4 text-muted-foreground" />}
          isLoading={isLoadingSummary}
          delay={0}
        />
        <KpiCard
          to="/incidents?severity=critical"
          title="Критические"
          value={summary?.critical}
          icon={<ShieldAlert className="w-4 h-4 text-destructive" />}
          trend={summary?.critical && summary.critical > 0 ? "Требует внимания" : "Стабильно"}
          trendColor="text-destructive"
          isLoading={isLoadingSummary}
          delay={0.1}
        />
        <KpiCard
          to="/incidents?status=new"
          title="Новые"
          value={summary?.new}
          icon={<AlertTriangle className="w-4 h-4 text-blue-500" />}
          isLoading={isLoadingSummary}
          delay={0.2}
        />
        <KpiCard
          to="/incidents?status=in_progress"
          title="В работе"
          value={summary?.inProgress}
          icon={<Activity className="w-4 h-4 text-amber-500" />}
          isLoading={isLoadingSummary}
          delay={0.3}
        />
        <KpiCard
          to="/incidents?assigneeId=me"
          title="Назначены мне"
          value={myOpenAssigned}
          icon={<UserCheck className="w-4 h-4 text-primary" />}
          isLoading={false}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Динамика инцидентов</CardTitle>
            <CardDescription>Количество новых инцидентов по дням</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTimeline ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => format(new Date(val), "dd MMM", { locale: ru })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      labelFormatter={(val) => format(new Date(val), "dd MMMM yyyy", { locale: ru })}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    />
                    <Area type="monotone" dataKey="count" name="Инциденты" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>По критичности</CardTitle>
            <CardDescription>Распределение за последние 14 дней</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSeverity ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityStats?.map((s) => ({ ...s, name: incidentSeverityLabels[s.severity] }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {severityStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={severityColors[entry.severity] || COLORS.primary} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {severityStats?.map((s) => (
                    <Link
                      key={s.severity}
                      href={`/incidents?severity=${s.severity}`}
                      className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: severityColors[s.severity] }}></div>
                      <span>{incidentSeverityLabels[s.severity]}: <strong>{s.count}</strong></span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Типы инцидентов</CardTitle>
            <CardDescription>Распределение по категориям</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingType ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeStats?.map((t) => ({ ...t, name: incidentTypeLabels[t.type] }))} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={120} />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    />
                    <Bar dataKey="count" name="Количество" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Последняя активность</CardTitle>
              <CardDescription>Журнал действий в системе</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/audit">Все логи <ArrowUpRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="w-full h-12" />)}
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Нет активности</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity?.map((activity, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={activity.id}
                    className="flex items-start gap-3 border-b border-border/50 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {activity.user?.name || "Система"}{" "}
                        <span className="font-normal text-muted-foreground">{activity.action}</span>
                        {activity.incidentId && (
                          <Link href={`/incidents/${activity.incidentId}`} className="ml-1 text-primary hover:underline">
                            INC-{activity.incidentId}
                          </Link>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.createdAt), "dd MMM yyyy, HH:mm", { locale: ru })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard({ userId: _userId }: { userId: number }) {
  const { data: myIncidents, isLoading } = useListIncidents(
    { reporterId: "me" } as any,
    { query: { queryKey: getListIncidentsQueryKey({ reporterId: "me" } as any) } },
  );

  const all = myIncidents ?? [];
  const total = all.length;
  const newCnt = all.filter((i) => i.status === "new").length;
  const inProgress = all.filter((i) => i.status === "in_progress").length;
  const resolved = all.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const recent = [...all]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Мой кабинет</h1>
          <p className="text-muted-foreground">Сводка по вашим заявкам об инцидентах ИБ</p>
        </div>
        <Button asChild>
          <Link href="/incidents/new">Сообщить об инциденте</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          to="/incidents?reporterId=me"
          title="Всего моих инцидентов"
          value={isLoading ? undefined : total}
          icon={<Inbox className="w-4 h-4 text-muted-foreground" />}
          isLoading={isLoading}
          delay={0}
        />
        <KpiCard
          to="/incidents?reporterId=me&status=new"
          title="Новые"
          value={isLoading ? undefined : newCnt}
          icon={<AlertTriangle className="w-4 h-4 text-blue-500" />}
          isLoading={isLoading}
          delay={0.1}
        />
        <KpiCard
          to="/incidents?reporterId=me&status=in_progress"
          title="В работе"
          value={isLoading ? undefined : inProgress}
          icon={<Activity className="w-4 h-4 text-amber-500" />}
          isLoading={isLoading}
          delay={0.2}
        />
        <KpiCard
          to="/incidents?reporterId=me&status=resolved"
          title="Закрытые"
          value={isLoading ? undefined : resolved}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          isLoading={isLoading}
          delay={0.3}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Последние мои заявки</CardTitle>
            <CardDescription>5 самых свежих инцидентов, которые вы зарегистрировали</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/incidents?reporterId=me">Все мои <ArrowUpRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="mb-4">Вы ещё не сообщали об инцидентах</p>
              <Button asChild>
                <Link href="/incidents/new">Сообщить об инциденте</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">INC-{incident.id}</span>
                      <StatusBadge status={incident.status} />
                      <SeverityBadge severity={incident.severity} />
                    </div>
                    <p className="text-sm font-medium truncate">{incident.title}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {format(new Date(incident.createdAt), "dd MMM HH:mm", { locale: ru })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Что важно знать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Любую подозрительную активность следует регистрировать как можно скорее.</p>
          <p>• После регистрации заявка попадает к аналитику ИБ — вы получите её обработку в журнале действий.</p>
          <p>• Вы можете обсуждать инцидент в комментариях — это видно ответственным сотрудникам.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, icon, trend, trendColor, isLoading, delay, to }: { title: string; value?: number; icon: React.ReactNode; trend?: string; trendColor?: string; isLoading: boolean; delay: number; to?: string }) {
  const inner = (
    <Card className={to ? "transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer h-full" : "h-full"}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value !== undefined ? value : "—"}</div>
            {trend && <p className={`text-xs mt-1 ${trendColor || "text-muted-foreground"}`}>{trend}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {to ? <Link href={to}>{inner}</Link> : inner}
    </motion.div>
  );
}
