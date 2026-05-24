import { Injectable } from '@nestjs/common';
import { MessageService } from '../message/message.service';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt';
  value: any;
}

export interface AlertAction {
  type: 'message' | 'log' | 'webhook';
  config: Record<string, any>;
}

@Injectable()
export class AuditAlertService {
  private rules: AlertRule[] = [
    {
      id: '1',
      name: '敏感操作告警',
      description: '检测到删除管理员、修改权限等敏感操作',
      enabled: true,
      conditions: [
        { field: 'action', operator: 'equals', value: 'DELETE' },
        { field: 'isSensitive', operator: 'equals', value: true },
      ],
      actions: [
        {
          type: 'message',
          config: {
            title: '敏感操作告警',
            template: '检测到敏感操作：{action} {path}',
          },
        },
      ],
    },
    {
      id: '2',
      name: '登录异常告警',
      description: '短时间内多次登录失败',
      enabled: true,
      conditions: [
        { field: 'action', operator: 'equals', value: 'POST' },
        { field: 'path', operator: 'contains', value: 'login' },
        { field: 'statusCode', operator: 'equals', value: 401 },
      ],
      actions: [
        {
          type: 'log',
          config: { level: 'warn', message: '登录异常 detected' },
        },
      ],
    },
    {
      id: '3',
      name: '权限变更告警',
      description: '角色或权限发生变更',
      enabled: true,
      conditions: [
        { field: 'path', operator: 'contains', value: 'permission' },
        { field: 'action', operator: 'equals', value: 'PUT' },
      ],
      actions: [
        {
          type: 'message',
          config: { title: '权限变更通知', template: '权限发生变更：{path}' },
        },
      ],
    },
  ];

  constructor(private readonly messageService: MessageService) {}

  async evaluate(auditData: {
    userId?: number;
    action: string;
    module: string;
    path: string;
    statusCode?: number;
    isSensitive?: boolean;
    ip?: string;
    username?: string;
  }) {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const matched = this.evaluateConditions(rule.conditions, auditData);
      if (matched) {
        await this.executeActions(rule.actions, auditData);
      }
    }
  }

  private evaluateConditions(
    conditions: AlertCondition[],
    data: Record<string, any>,
  ): boolean {
    return conditions.every((condition) => {
      const value = data[condition.field];
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'regex':
          return new RegExp(condition.value).test(String(value));
        case 'gt':
          return Number(value) > Number(condition.value);
        case 'lt':
          return Number(value) < Number(condition.value);
        default:
          return false;
      }
    });
  }

  private async executeActions(
    actions: AlertAction[],
    data: Record<string, any>,
  ) {
    for (const action of actions) {
      switch (action.type) {
        case 'message':
          // 发送站内信给管理员（userId=1 假设为管理员）
          if (data.userId) {
            await this.messageService.send(null, {
              receiverId: 1, // 发送给管理员
              title: this.replaceTemplate(action.config.title, data),
              content: this.replaceTemplate(action.config.template, data),
              type: 'system',
            });
          }
          break;
        case 'log':
          console.warn(`[AuditAlert] ${action.config.message}`, data);
          break;
        case 'webhook':
          // TODO: 实现 webhook 推送
          break;
      }
    }
  }

  private replaceTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  getRules(): AlertRule[] {
    return this.rules;
  }

  addRule(rule: AlertRule) {
    this.rules.push(rule);
  }

  updateRule(id: string, updates: Partial<AlertRule>) {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  deleteRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
  }
}
