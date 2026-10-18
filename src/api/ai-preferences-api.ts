import requests from './core/requests';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getCurrentUser} from '@/utils/permission';

export type AIDisplayLevel = 'compact' | 'standard' | 'detailed';
export interface AIPreferences {
    displayLevel: AIDisplayLevel;
    includeCommandSnippets: boolean;
}
export const AI_DISPLAY_LEVELS: AIDisplayLevel[] = ['compact', 'standard', 'detailed'];

export function useAIPreferences(enabled = true) {
    const queryClient = useQueryClient();
    const queryKey = ['ai-preferences', getCurrentUser()?.id];
    const query = useQuery({
        queryKey,
        queryFn: async () => await requests.get('/ai/preferences') as AIPreferences,
        enabled,
    });
    const mutation = useMutation({
        mutationFn: async (values: AIPreferences) => await requests.put('/ai/preferences', values) as AIPreferences,
        onSuccess: data => queryClient.setQueryData(queryKey, data),
    });
    return {displayLevel: query.data?.displayLevel || 'standard', query, mutation};
}
