import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetIncident, getGetIncidentQueryKey,
  useUpdateIncident,
  useEscalateIncident,
  useListIncidentComments, getListIncidentCommentsQueryKey,
  useCreateIncidentComment,
  useListIncidentAudit, getListIncidentAuditQueryKey,
  useListUsers, getListUsersQueryKey,
  IncidentStatus, UserRole
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, SeverityBadge, TypeBadge } from "@/components/badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Loader2, Paperclip, Send, ShieldAlert, User as UserIcon, Activity } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { incidentStatusLabels } from "@/lib/labels";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const incidentId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [commentBody, setCommentBody] = useState("");

  const { data: incident, isLoading: isLoadingIncident } = useGetIncident(incidentId, {
    query: { enabled: !!incidentId, queryKey: getGetIncidentQueryKey(incidentId) }
  });

  const { data: comments, isLoading: isLoadingComments } = useListIncidentComments(incidentId, {
    query: { enabled: !!incidentId, queryKey: getListIncidentCommentsQueryKey(incidentId) }
  });

  const { data: auditLogs, isLoading: isLoadingAudit } = useListIncidentAudit(incidentId, {
    query: { enabled: !!incidentId, queryKey: getListIncidentAuditQueryKey(incidentId) }
  });

  const { data: users } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const updateMutation = useUpdateIncident();
  const escalateMutation = useEscalateIncident();
  const commentMutation = useCreateIncidentComment();

  const isAnalystOrAdmin = user?.role === UserRole.admin || user?.role === UserRole.analyst;
  const analystsAndAdmins = users?.filter(u => u.role === UserRole.admin || u.role === UserRole.analyst) || [];

  const handleStatusChange = (newStatus: IncidentStatus) => {
    if (!isAnalystOrAdmin) return;
    updateMutation.mutate(
      { id: incidentId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) });
          queryClient.invalidateQueries({ queryKey: getListIncidentAuditQueryKey(incidentId) });
          toast({ title: "Статус обновлен", description: `Новый статус: ${incidentStatusLabels[newStatus]}` });
        }
      }
    );
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    if (!isAnalystOrAdmin) return;
    const assigneeId = newAssigneeId === "none" ? null : Number(newAssigneeId);
    updateMutation.mutate(
      { id: incidentId, data: { assigneeId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) });
          queryClient.invalidateQueries({ queryKey: getListIncidentAuditQueryKey(incidentId) });
          toast({ title: "Исполнитель изменен" });
        }
      }
    );
  };

  const handleEscalate = () => {
    if (!isAnalystOrAdmin) return;
    escalateMutation.mutate(
      { id: incidentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) });
          queryClient.invalidateQueries({ queryKey: getListIncidentAuditQueryKey(incidentId) });
          toast({ title: "Инцидент эскалирован", variant: "destructive" });
        }
      }
    );
  };

  const handlePostComment = () => {
    if (!commentBody.trim()) return;
    commentMutation.mutate(
      { id: incidentId, data: { body: commentBody } },
      {
        onSuccess: () => {
          setCommentBody("");
          queryClient.invalidateQueries({ queryKey: getListIncidentCommentsQueryKey(incidentId) });
          toast({ title: "Комментарий добавлен" });
        }
      }
    );
  };

  if (isLoadingIncident) {
    return <div className="space-y-6"><Skeleton className="h-12 w-[300px]" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!incident) {
    return <div className="text-center py-12">Инцидент не найден</div>;
  }

  const canEscalate = isAnalystOrAdmin && incident.severity !== "critical" && incident.status !== "closed" && incident.status !== "resolved";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/incidents">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">INC-{incident.id}</span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          {canEscalate && (
            <Button variant="destructive" onClick={handleEscalate} disabled={escalateMutation.isPending}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              Эскалировать
            </Button>
          )}
          
          {isAnalystOrAdmin && (
            <Select value={incident.status} onValueChange={(v: any) => handleStatusChange(v)}>
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="Изменить статус" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(incidentStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} disabled={key === incident.status}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg">Описание инцидента</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{incident.description}</div>
              
              {incident.attachmentUrl && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border flex items-center gap-3">
                  <div className="bg-background p-2 rounded shrink-0">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{incident.attachmentName || "Вложение"}</p>
                    <a href={incident.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                      {incident.attachmentUrl}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                Обсуждение
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                Журнал действий
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="comments" className="mt-4 space-y-4">
              {isLoadingComments ? (
                <Skeleton className="h-32 w-full" />
              ) : comments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">Нет комментариев</div>
              ) : (
                <div className="space-y-4">
                  {comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comment.author?.name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(comment.createdAt), "dd MMM HH:mm", { locale: ru })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-start gap-4">
                <div className="flex-1">
                  <Textarea 
                    placeholder="Написать комментарий..." 
                    className="min-h-[100px] resize-y"
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                  />
                </div>
                <Button onClick={handlePostComment} disabled={!commentBody.trim() || commentMutation.isPending} className="shrink-0">
                  {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isLoadingAudit ? (
                    <div className="p-4 space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                  ) : auditLogs?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Нет записей</div>
                  ) : (
                    <div className="divide-y border-t-0">
                      {auditLogs?.map(log => (
                        <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                          <Activity className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{log.user?.name || "Система"}</span>
                              <span className="mx-1 text-muted-foreground">{log.action}</span>
                            </p>
                            {log.details && <p className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">{log.details}</p>}
                            <p className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss", { locale: ru })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Информация</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Исполнитель</span>
                {isAnalystOrAdmin ? (
                  <Select value={incident.assigneeId?.toString() || "none"} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Не назначен" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не назначен</SelectItem>
                      {analystsAndAdmins.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="font-medium">{incident.assignee?.name || "Не назначен"}</div>
                )}
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground block mb-1">Тип</span>
                <TypeBadge type={incident.type} />
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground block mb-1">Создатель</span>
                <div className="font-medium">{incident.reporter?.name}</div>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground block mb-1">Создано</span>
                <div className="font-medium">{format(new Date(incident.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground block mb-1">Обновлено</span>
                <div className="font-medium">{format(new Date(incident.updatedAt), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
