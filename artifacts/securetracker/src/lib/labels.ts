import { IncidentSeverity, IncidentStatus, IncidentType, UserRole } from "@workspace/api-client-react";

export const incidentTypeLabels: Record<IncidentType, string> = {
  [IncidentType.data_leak]: "Утечка данных",
  [IncidentType.ddos]: "DDoS-атака",
  [IncidentType.malware]: "Вредоносное ПО",
  [IncidentType.phishing]: "Фишинг",
  [IncidentType.unauthorized_access]: "Несанкционированный доступ",
  [IncidentType.insider_threat]: "Внутренняя угроза",
  [IncidentType.social_engineering]: "Социальная инженерия",
  [IncidentType.other]: "Прочее",
};

export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  [IncidentSeverity.low]: "Низкая",
  [IncidentSeverity.medium]: "Средняя",
  [IncidentSeverity.high]: "Высокая",
  [IncidentSeverity.critical]: "Критическая",
};

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  [IncidentStatus.new]: "Новый",
  [IncidentStatus.in_progress]: "В работе",
  [IncidentStatus.resolved]: "Решён",
  [IncidentStatus.closed]: "Закрыт",
};

export const userRoleLabels: Record<UserRole, string> = {
  [UserRole.admin]: "Администратор",
  [UserRole.analyst]: "Аналитик",
  [UserRole.employee]: "Сотрудник",
};
