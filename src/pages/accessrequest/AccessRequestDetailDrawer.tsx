import {accessRequestReason} from "./access-request-text";
import {App, Button, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Result, Segmented, Spin, Tag} from 'antd';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import dayjs from 'dayjs';
import {accessRequestAdminApi, type AccessRequest, type ApproveAccessRequestRequest} from '@/api/access-request-api';

const ApprovalForm = ({request, onSuccess}: {request: AccessRequest; onSuccess: () => Promise<void>}) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<ApproveAccessRequestRequest & {rejectReason?: string}>();
    const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
    const approveMutation = useMutation({
        mutationFn: (values: ApproveAccessRequestRequest) => accessRequestAdminApi.approve(request.id, values),
        onSuccess: async () => {
            message.success(t('general.success'));
            await onSuccess();
        },
    });
    const rejectMutation = useMutation({
        mutationFn: ({reason}: {reason: string}) => accessRequestAdminApi.reject(request.id, reason.trim()),
        onSuccess: async () => {
            message.success(t('general.success'));
            await onSuccess();
        },
    });
    const submitting = approveMutation.isPending || rejectMutation.isPending;

    return (
        <section className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="mb-5 flex items-center justify-between gap-4">
                <span className="font-medium">{t('access_request.review')}</span>
                <Segmented value={decision} disabled={submitting}
                    options={[
                        {value: 'approve', label: t('access_request.decision_approve')},
                        {value: 'reject', label: t('access_request.decision_reject')},
                    ]}
                    onChange={(value) => setDecision(value as 'approve' | 'reject')} />
            </div>
            <Form form={form} layout="vertical" disabled={submitting}
                initialValues={{durationMinutes: request.durationMinutes, startAt: request.requestedStartAt || undefined}}
                onFinish={(values) => {
                    if (decision === 'approve') {
                        approveMutation.mutate({durationMinutes: values.durationMinutes, startAt: values.startAt ?? 0, reason: values.reason});
                    } else {
                        rejectMutation.mutate({reason: values.rejectReason || ''});
                    }
                }}>
                {decision === 'approve' && <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item label={t('access_request.effective_at')} name="startAt"
                        getValueProps={(value?: number) => ({value: value ? dayjs(value) : undefined})}
                        normalize={(value?: dayjs.Dayjs) => value?.valueOf()}>
                        <DatePicker showTime placeholder={t('access_request.start_immediately')} style={{width: '100%'}}
                            disabledDate={(date) => date.isBefore(dayjs(), 'day')} />
                    </Form.Item>
                    <Form.Item label={t('access_request.approved_duration_minutes')} name="durationMinutes"
                        rules={[{required: true}, {type: 'integer', min: 1, max: 1440}]}>
                        <InputNumber min={1} max={1440} precision={0} style={{width: '100%'}} />
                    </Form.Item>
                </div>}
                <Form.Item label={decision === 'approve' ? t('general.remark') : t('access_request.rejection_reason')}
                    name={decision === 'approve' ? 'reason' : 'rejectReason'} rules={decision === 'reject' ? [{required: true, whitespace: true}] : []}>
                    <Input.TextArea rows={3} placeholder={decision === 'reject' ? t('access_request.reject_reason') : undefined} />
                </Form.Item>
                <div className="flex justify-end">
                    <Button type="primary" danger={decision === 'reject'} htmlType="submit" loading={submitting}>
                        {decision === 'approve' ? t('access_request.approve') : t('access_request.confirm_reject')}
                    </Button>
                </div>
            </Form>
        </section>
    );
};

const AccessRequestDetailDrawer = ({id, onClose}: {id?: string; onClose: () => void}) => {
    const {t, i18n} = useTranslation();
    const queryClient = useQueryClient();
    const detailQuery = useQuery({
        queryKey: ['admin-access-request', id],
        queryFn: () => accessRequestAdminApi.getById(id!),
        enabled: !!id,
    });
    const request = detailQuery.data;
    const date = (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
    const resourceLabels = {
        asset: t('access_request.resource_type_asset'),
        database: t('access_request.resource_type_database'),
        website: t('access_request.resource_type_website'),
    };
    const statusColors: Record<string, string> = {pending: 'processing', approved: 'green', rejected: 'red', cancelled: 'default', closed: 'blue'};
    const refresh = async () => {
        await Promise.all([
            detailQuery.refetch(),
            queryClient.invalidateQueries({queryKey: ['admin-access-requests']}),
        ]);
    };

    return (
        <Drawer title={t('access_request.detail_title')} open={!!id} onClose={onClose} size="min(720px, 100vw)">
            {detailQuery.isPending && id ? <div className="flex justify-center py-12"><Spin /></div> :
                detailQuery.isError || !request ? <Result status="error" title={t('access_request.detail_load_failed')}
                    extra={<Button onClick={() => detailQuery.refetch()}>{t('actions.retry')}</Button>} /> :
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="mb-2 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="mb-1 text-sm text-gray-500">{resourceLabels[request.resourceType] || request.resourceType}</div>
                                    <div className="break-words text-lg font-semibold">{request.resourceName || '-'}</div>
                                </div>
                                <Tag color={statusColors[request.status] || 'default'}>
                                    {i18n.exists(`access_request.status.${request.status}`)
                                        ? t(`access_request.status.${request.status}`)
                                        : t('access_request.unknown_status', {status: request.status})}
                                </Tag>
                            </div>
                            <div className="break-all text-xs text-gray-500">{t('access_request.request_no')}：{request.requestNo || '-'}</div>
                        </div>
                        <Descriptions column={2} layout="vertical" size="small" items={[
                            {key: 'requester', label: t('access_request.requester'), children: request.requesterName || '-'},
                            {key: 'createdAt', label: t('general.created_at'), children: date(request.createdAt)},
                            {key: 'requestedStartAt', label: t('access_request.start_at_label'), children: (request.startAt || request.requestedStartAt) ? date(request.startAt || request.requestedStartAt) : t('access_request.start_immediately')},
                            {key: 'duration', label: t('access_request.duration_minutes'), children: request.durationMinutes},
                        ]} />
                        <section>
                            <div className="mb-2 text-sm text-gray-500">{t('access_request.request_reason')}</div>
                            <div className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-800">
                                {request.requestReason || '-'}
                            </div>
                        </section>
                        {request.status === 'pending' ? <ApprovalForm key={request.id} request={request} onSuccess={refresh} /> :
                            (request.approvedAt > 0 || request.reason) && <section className="border-t border-gray-200 pt-6 dark:border-gray-700">
                                <div className="mb-4 font-medium">{t('access_request.review_result')}</div>
                                <Descriptions column={2} layout="vertical" size="small" items={[
                                    ...(request.approverName ? [{key: 'approver', label: t('access_request.approver'), children: request.approverName}] : []),
                                    ...(request.approvedAt ? [{key: 'approvedAt', label: t('access_request.approved_at'), children: date(request.approvedAt)}] : []),
                                    ...(request.startAt ? [{key: 'startAt', label: t('access_request.effective_at'), children: date(request.startAt)}] : []),
                                    ...(request.expiredAt ? [{key: 'expiredAt', label: t('general.expired_at'), children: date(request.expiredAt)}] : []),
                                    ...(request.approvedDurationMinutes ? [{key: 'approvedDuration', label: t('access_request.approved_duration_minutes'), children: request.approvedDurationMinutes}] : []),
                                    ...(request.reason ? [{key: 'reason', label: request.status === 'rejected' ? t('access_request.rejection_reason') : request.status === 'closed' ? t('access_request.review_comments') : t('general.remark'), children: <div className="whitespace-pre-wrap break-words">{accessRequestReason(request.status, request.reason, t)}</div>, span: 2}] : []),
                                ]} />
                            </section>}
                    </div>}
        </Drawer>
    );
};

export default AccessRequestDetailDrawer;
