import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          setLocation("/");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Ошибка авторизации",
            description: error.message || "Проверьте email и пароль",
          });
        },
      }
    );
  };

  const fillTestAccount = (email: string, pass: string) => {
    form.setValue("email", email);
    form.setValue("password", pass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center space-y-2"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SecureTracker</h1>
          <p className="text-muted-foreground font-medium">Система управления инцидентами ИБ</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl">Вход в систему</CardTitle>
              <CardDescription>Введите ваши учетные данные для доступа</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@company.com" type="email" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              className="bg-background pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Вход...
                      </>
                    ) : (
                      "Войти"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary font-semibold uppercase tracking-wider">Тестовые аккаунты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div 
                className="flex items-center justify-between p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                onClick={() => fillTestAccount("admin@company.com", "admin123")}
              >
                <span className="font-medium">Админ</span>
                <span className="text-muted-foreground font-mono text-xs">admin@company.com / admin123</span>
              </div>
              <div 
                className="flex items-center justify-between p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                onClick={() => fillTestAccount("analyst@company.com", "analyst123")}
              >
                <span className="font-medium">Аналитик</span>
                <span className="text-muted-foreground font-mono text-xs">analyst@company.com / analyst123</span>
              </div>
              <div 
                className="flex items-center justify-between p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                onClick={() => fillTestAccount("employee@company.com", "employee123")}
              >
                <span className="font-medium">Сотрудник</span>
                <span className="text-muted-foreground font-mono text-xs">employee@company.com / employee123</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
