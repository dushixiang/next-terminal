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
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const text = await response.text();
                    if (text) {
                        try {
                            const parsed = JSON.parse(text) as { error?: string; message?: string };
                            errorMessage = parsed.error || parsed.message || text || errorMessage;
                        } catch {
                            errorMessage = text;
                        }
                    }
                } catch {
                    // keep default errorMessage
                }
                throw new Error(errorMessage);
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
                            const parsed = data as StreamResponse;
                            onMessage(parsed);
                            if (parsed.success === false) {
                                return;
                            }
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
