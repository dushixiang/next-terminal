import {Api} from "./core/api";
import requests from "./core/requests";

export interface NotificationChannel {
    type: string;
    enabled: boolean;
    config: Record<string, any>;
    secretConfig: Record<string, any>;
    createdAt: number;
    updatedAt: number;
}

export interface NotificationBinding {
 userId: string;
 channelId: string;
 corpId: string;
 address: string;
 enabled: boolean;
}
export interface NotificationRecipient {
 id: string;
 name: string;
 accessApprover: boolean;
 workOrderApprover: boolean;
 wecomAddress: string;
 wecomSource: string;
 binding?: NotificationBinding;
}
export const notificationRecipientApi = {
 getAll: async () => await requests.get<NotificationRecipient[]>('/admin/notifications/recipients'),
 setBinding: async (userId: string, values: {address: string; enabled: boolean}) =>
  await requests.put<void>(`/admin/notifications/bindings/${userId}`, values),
 test: async (channel: string, userId: string) =>
  await requests.post<string>(`/admin/notifications/channels/${channel}/test-personal`, {userId}),
};

export interface ApprovalNotificationSettings {
 enabled: boolean;
 accessSpecified: boolean;
 accessApproverIds: string[];
 workOrderSpecified: boolean;
 workOrderApproverIds: string[];
}
export interface ApprovalNotificationInfo {
 settings: ApprovalNotificationSettings;
 mailReady: boolean;
 wecomReady: boolean;
 legacyRules: NotificationRule[];
}
export const approvalNotificationApi = {
 get: async () => await requests.get<ApprovalNotificationInfo>('/admin/notifications/approval'),
 save: async (values: ApprovalNotificationSettings & {replaceLegacy?: boolean}) =>
  await requests.put<void>('/admin/notifications/approval', values),
};

export interface NotificationRule {
 deliveryTarget: 'channel' | 'personal';
 recipientMode: 'requester' | 'eligibleApprovers' | 'specifiedUsers' | '';
 recipientIds: string[];
    id: string;
    name: string;
    enabled: boolean;
    eventTypes: string[];
    channelIds: string[];
    conditions: Record<string, any>;
    quietMinutes: number;
    createdAt: number;
    updatedAt: number;
}

export interface NotificationDelivery {
    skipReason?: string;
    recipientId?: string;
    personalCategory?: string;
    nextRetryAt?: number;
    id: string;
    eventId: string;
    eventType: string;
    severity: string;
    channelId: string;
    request: Record<string, any>;
    result: string;
    error: string;
    retryCount: number;
    createdAt: number;
    sentAt: number;
}

class NotificationChannelApi extends Api<NotificationChannel> {
    constructor() {
        super("admin/notifications/channels");
    }

    test = async (id: string) => {
        return await requests.post(`/${this.group}/${id}/test`) as string;
    }
}

class NotificationRuleApi extends Api<NotificationRule> {
    constructor() {
        super("admin/notifications/rules");
    }
}

class NotificationDeliveryApi extends Api<NotificationDelivery> {
    constructor() {
        super("admin/notifications/deliveries");
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }
}

export const notificationChannelApi = new NotificationChannelApi();
export const notificationRuleApi = new NotificationRuleApi();
export const notificationDeliveryApi = new NotificationDeliveryApi();
