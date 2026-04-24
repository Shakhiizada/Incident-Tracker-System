import React from "react";
import { useLocation } from "wouter";
import { useCreateIncident, useListUsers, getListUsersQueryKey, IncidentType, IncidentSeverity, UserRole } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { incidentTypeLabels, incidentSeverityLabels } from "@/lib/labels";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  title: z.string().min(3, "Название должно содержать минимум 3 символа"),
  description: z.string().min(5, "Описание должно содержать минимум 5 символов"),
  type: z.nativeEnum(IncidentType, { errorMap: () => ({ message: "Выберите тип" }) }),
  severity: z.nativeEnum(IncidentSeverity, { errorMap: () => ({ message: "Выберите критичность" }) }),
  assigneeId: z.string().optional().transform(val => val ? Number(val) : undefined),
  attachmentUrl: z.string().url("Введите корректный URL").optional().or(z.literal("")),
  attachmentName: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewIncident() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateIncident();

  const { data: users } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const analystsAndAdmins = users?.filter(u => u.role === UserRole.admin || u.role === UserRole.analyst) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined as any,
      severity: undefined as any,
      assigneeId: undefined as any,
      attachmentUrl: "",
      attachmentName: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    // If URL is provided but name is not, use domain as name
    let attachmentData = {};
    if (data.attachmentUrl && data.attachmentUrl !== "") {
      try {
        const url = new URL(data.attachmentUrl);
        const name = data.attachmentName && data.attachmentName !== "" ? data.attachmentName : url.hostname;
        attachmentData = { attachmentUrl: data.attachmentUrl, attachmentName: name };
      } catch (e) {
        // Invalid URL handled by zod
      }
    }

    createMutation.mutate(
      { 
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          severity: data.severity,
          assigneeId: data.assigneeId || null,
          ...attachmentData
        } 
      },
      {
        onSuccess: (incident) => {
          queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          toast({
            title: "Инцидент зарегистрирован",
            description: `Инцидент INC-${incident.id} успешно создан.`,
          });
          setLocation(`/incidents/${incident.id}`);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: err.message || "Не удалось создать инцидент",
          });
        }
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/incidents")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Новый инцидент</h1>
          <p className="text-muted-foreground">Регистрация нового инцидента безопасности</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Детали инцидента</CardTitle>
              <CardDescription>Заполните всю известную информацию об инциденте. Поля, отмеченные звездочкой, обязательны.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Краткое описание (Заголовок) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Обнаружено ВПО на рабочей станции бухгалтера" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип угрозы *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(incidentTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Оценка критичности *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите критичность" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(incidentSeverityLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подробное описание *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Укажите затронутые системы, IP-адреса, время обнаружения и другие важные детали..." 
                        className="min-h-[150px] resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Назначить аналитика</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не назначен (в общую очередь)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Не назначен</SelectItem>
                        {analystsAndAdmins.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Вы можете сразу назначить инцидент на специалиста, если он известен.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вложение (URL)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." type="url" {...field} />
                      </FormControl>
                      <FormDescription>Ссылка на логи, скриншот или дамп.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attachmentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название вложения</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: Дамп памяти" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-4 bg-muted/20 border-t border-border p-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/incidents")}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохранение...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Зарегистрировать</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
