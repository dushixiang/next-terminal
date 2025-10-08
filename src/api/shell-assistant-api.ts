import { baseUrl, getToken } from "./core/requests";

export interface ShellAssistantRequest {
    question: string;
    useSnippets: boolean;
}

export interface StreamResponse {
    success: boolean;
    type?: 'start' | 'content' | 'end';
    content?: string;
    error?: string;
}

class ShellAssistantApi {
    group = "access/settings";

    askStream = async (
        request: ShellAssistantRequest,
        onMessage: (response: StreamResponse) => void,
        onError?: (error: Error) => void
    ): Promise<void> => {
        const url = `${baseUrl()}/${this.group}/shell-assistant`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': getToken() || '',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // 保留最后一行（可能是不完整的）
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onMessage(data as StreamResponse);
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            onError?.(error as Error);
        }
    }
}

const shellAssistantApi = new ShellAssistantApi();
export default shellAssistantApi;
