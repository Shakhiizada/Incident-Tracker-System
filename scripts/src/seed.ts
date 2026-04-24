import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  incidentsTable,
  commentsTable,
  auditTable,
  pool,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding SecureTracker database...");

  const seedUsers = [
    {
      email: "admin@company.com",
      name: "Иван Орлов",
      password: "admin123",
      role: "admin" as const,
    },
    {
      email: "analyst@company.com",
      name: "Мария Смирнова",
      password: "analyst123",
      role: "analyst" as const,
    },
    {
      email: "employee@company.com",
      name: "Алексей Кузнецов",
      password: "employee123",
      role: "employee" as const,
    },
  ];

  const userIds: Record<string, number> = {};
  for (const u of seedUsers) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, u.email))
      .limit(1);
    if (existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await db
        .update(usersTable)
        .set({ name: u.name, role: u.role, passwordHash: hash })
        .where(eq(usersTable.id, existing.id));
      userIds[u.role] = existing.id;
      console.log(`  updated user: ${u.email}`);
    } else {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const [created] = await db
        .insert(usersTable)
        .values({
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
        })
        .returning();
      userIds[u.role] = created.id;
      console.log(`  inserted user: ${u.email}`);
    }
  }

  const existingIncidents = await db.select().from(incidentsTable).limit(1);
  if (existingIncidents.length > 0) {
    console.log("Incidents already seeded, skipping incident seed.");
    await pool.end();
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  type SeedIncident = {
    title: string;
    description: string;
    type: IncidentType;
    severity: IncidentSeverity;
    status: IncidentStatus;
    reporterRole: "admin" | "analyst" | "employee";
    assigneeRole: "admin" | "analyst" | "employee" | null;
    createdAgoDays: number;
    resolvedAgoDays?: number;
    comments?: Array<{ role: "admin" | "analyst" | "employee"; body: string }>;
  };

  const seedIncidents: SeedIncident[] = [
    {
      title: "Подозрение на утечку клиентской базы",
      description:
        "Менеджер обнаружил выгрузку 12 000 записей CRM на личный почтовый ящик. Требуется блокировка учётной записи и анализ DLP-логов за последние 14 дней.",
      type: "data_leak",
      severity: "critical",
      status: "in_progress",
      reporterRole: "employee",
      assigneeRole: "analyst",
      createdAgoDays: 1,
      comments: [
        { role: "analyst", body: "Учётная запись заблокирована, начинаю разбор журналов DLP." },
        { role: "admin", body: "Подключаю юридический отдел и службу комплаенса." },
      ],
    },
    {
      title: "DDoS-атака на платёжный шлюз",
      description:
        "Зафиксирован всплеск трафика 12 Гбит/с с 4 800 уникальных IP. Включено облачное смягчение, шлюз стабилен, расследуем источник.",
      type: "ddos",
      severity: "high",
      status: "resolved",
      reporterRole: "analyst",
      assigneeRole: "analyst",
      createdAgoDays: 3,
      resolvedAgoDays: 2,
      comments: [
        { role: "analyst", body: "Подключили Cloudflare Magic Transit, атака отбита за 8 минут." },
      ],
    },
    {
      title: "Фишинговая рассылка от имени HR",
      description:
        "Сотрудники получили письма с поддельной ссылкой на портал кадров. 3 человека ввели учётные данные. Сбрасываю их пароли и включаю обязательный 2FA.",
      type: "phishing",
      severity: "high",
      status: "in_progress",
      reporterRole: "employee",
      assigneeRole: "analyst",
      createdAgoDays: 2,
      comments: [
        { role: "employee", body: "Перенаправил оригиналы писем в SOC." },
      ],
    },
    {
      title: "Обнаружено вредоносное ПО на ноутбуке маркетинга",
      description:
        "EDR заблокировал запуск нагрузки Cobalt Strike. Машина изолирована, образ снят для расследования.",
      type: "malware",
      severity: "high",
      status: "new",
      reporterRole: "analyst",
      assigneeRole: null,
      createdAgoDays: 0,
    },
    {
      title: "Неавторизованный вход в админ-панель",
      description:
        "Из неизвестной геолокации совершено 14 неудачных попыток входа в админ-панель CRM. IP добавлен в блок-лист.",
      type: "unauthorized_access",
      severity: "medium",
      status: "in_progress",
      reporterRole: "analyst",
      assigneeRole: "admin",
      createdAgoDays: 4,
    },
    {
      title: "Социальная инженерия по телефону",
      description:
        "Звонок «из ИТ-поддержки» с просьбой назвать одноразовый код. Сотрудник код не выдал, инцидент задокументирован.",
      type: "social_engineering",
      severity: "low",
      status: "closed",
      reporterRole: "employee",
      assigneeRole: "analyst",
      createdAgoDays: 8,
      resolvedAgoDays: 7,
    },
    {
      title: "Подозрительная активность учётной записи разработчика",
      description:
        "В 03:14 обнаружено массовое скачивание репозиториев с нетипичного IP. Требуется проверка не была ли украдена сессия.",
      type: "insider_threat",
      severity: "high",
      status: "new",
      reporterRole: "analyst",
      assigneeRole: "analyst",
      createdAgoDays: 0,
    },
    {
      title: "Незашифрованный USB-носитель найден в переговорной",
      description:
        "На носителе обнаружены презентации с пометкой «для служебного пользования». Носитель изолирован, проводится опрос.",
      type: "data_leak",
      severity: "medium",
      status: "resolved",
      reporterRole: "employee",
      assigneeRole: "admin",
      createdAgoDays: 6,
      resolvedAgoDays: 5,
    },
    {
      title: "Сбой MFA для критичной системы расчётов",
      description:
        "Поставщик MFA не подтверждает push-запросы. Включён резервный TOTP-режим, инцидент эскалирован поставщику.",
      type: "other",
      severity: "medium",
      status: "in_progress",
      reporterRole: "analyst",
      assigneeRole: "analyst",
      createdAgoDays: 1,
    },
    {
      title: "Подозрительный POST-запрос к API биллинга",
      description:
        "WAF зафиксировал попытки SSRF к /api/billing/invoice. Запросы заблокированы, добавлено правило в WAF.",
      type: "unauthorized_access",
      severity: "low",
      status: "new",
      reporterRole: "analyst",
      assigneeRole: null,
      createdAgoDays: 0,
    },
  ];

  for (const seed of seedIncidents) {
    const reporterId = userIds[seed.reporterRole];
    const assigneeId = seed.assigneeRole ? userIds[seed.assigneeRole] : null;
    const createdAt = new Date(now - seed.createdAgoDays * day);
    const resolvedAt =
      seed.resolvedAgoDays !== undefined
        ? new Date(now - seed.resolvedAgoDays * day)
        : null;

    const [incident] = await db
      .insert(incidentsTable)
      .values({
        title: seed.title,
        description: seed.description,
        type: seed.type,
        severity: seed.severity,
        status: seed.status,
        reporterId,
        assigneeId,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
        resolvedAt,
      })
      .returning();

    await db.insert(auditTable).values({
      incidentId: incident.id,
      userId: reporterId,
      action: "incident.created",
      details: `Создан инцидент: ${incident.title}`,
      createdAt,
    });

    if (assigneeId != null) {
      await db.insert(auditTable).values({
        incidentId: incident.id,
        userId: reporterId,
        action: "incident.assigned",
        details: `Назначен ответственный (ID ${assigneeId})`,
        createdAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
      });
    }

    if (seed.status !== "new") {
      await db.insert(auditTable).values({
        incidentId: incident.id,
        userId: assigneeId ?? reporterId,
        action: "incident.status_changed",
        details: `Статус: new → ${seed.status}`,
        createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
      });
    }

    if (seed.comments) {
      for (let i = 0; i < seed.comments.length; i++) {
        const c = seed.comments[i];
        const at = new Date(createdAt.getTime() + (i + 1) * 60 * 60 * 1000);
        await db.insert(commentsTable).values({
          incidentId: incident.id,
          authorId: userIds[c.role],
          body: c.body,
          createdAt: at,
        });
        await db.insert(auditTable).values({
          incidentId: incident.id,
          userId: userIds[c.role],
          action: "comment.added",
          details: `Добавлен комментарий`,
          createdAt: at,
        });
      }
    }
  }

  console.log(`  inserted ${seedIncidents.length} incidents`);
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
