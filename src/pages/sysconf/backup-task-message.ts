import type {TFunction} from 'i18next';
import type {BackupTask} from '@/api/backup-api';

export const backupTaskMessage = (task: Pick<BackupTask, 'message' | 'status'>, t: TFunction): string => {
    const text = task.message || '';
    switch (text) {
        case 'another backup or restore task is running':
            return t('settings.backup.task_busy');
        case 'backing up PostgreSQL database':
            return t('settings.backup.task_backing_up');
        case 'creating safety backup before restore':
            return t('settings.backup.task_safety_backup');
        case 'restoring PostgreSQL database':
            return t('settings.backup.task_restoring');
        case 'backup completed':
            return t('settings.backup.task_backup_completed');
        case 'restore completed, restart the service before continuing':
            return t('settings.backup.task_restore_completed');
    }
    const warningPrefix = 'backup completed, ';
    if (text.startsWith(warningPrefix)) {
        return t('settings.backup.task_backup_warnings', {details: text.slice(warningPrefix.length)});
    }
    const safetyErrorPrefix = 'failed to create safety backup before restore: ';
    if (text.startsWith(safetyErrorPrefix)) {
        return t('settings.backup.task_safety_failed', {details: text.slice(safetyErrorPrefix.length)});
    }
    if (text) return text;
    switch (task.status) {
        case 'pending': return t('settings.backup.task_pending');
        case 'running': return t('settings.backup.task_running');
        case 'success': return t('general.success');
        case 'failed': return t('settings.backup.task_failed');
    }
};
