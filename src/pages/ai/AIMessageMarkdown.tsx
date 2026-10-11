import {isValidElement, memo, type ReactNode} from 'react';
import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import copy from 'copy-to-clipboard';
import {CopyIcon} from 'lucide-react';
import {App, Tooltip} from 'antd';
import {useTranslation} from 'react-i18next';

const remarkPlugins = [remarkGfm];

const codeText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(codeText).join('');
    if (isValidElement<{children?: ReactNode}>(node)) return codeText(node.props.children);
    return '';
};

const CodeBlock = ({children}: {children: ReactNode}) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const text = codeText(children).replace(/\n$/, '');
    return <div className="group/code relative my-1.5 w-full min-w-0 max-w-full rounded bg-black/[0.04] dark:bg-white/[0.06]">
        <Tooltip title={t('actions.copy')}>
            <button type="button" aria-label={t('actions.copy')} className="absolute right-1.5 top-1.5 z-10 rounded p-1 text-gray-500 opacity-70 hover:opacity-100 focus-visible:opacity-100 group-hover/code:opacity-100" onClick={() => {if (copy(text)) message.success(t('general.copy_success'));}}><CopyIcon className="h-3.5 w-3.5"/></button>
        </Tooltip>
        <pre className="w-full min-w-0 max-w-full overflow-x-auto px-2 py-1.5 pr-9 font-mono text-xs [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0">{children}</pre>
    </div>;
};

const components: Components = {
    p: ({children}) => <p className="my-1.5 whitespace-pre-wrap">{children}</p>,
    ul: ({children}) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
    ol: ({children}) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
    li: ({children}) => <li className="leading-snug">{children}</li>,
    h1: ({children}) => <h1 className="my-2 text-base font-semibold">{children}</h1>,
    h2: ({children}) => <h2 className="my-2 text-sm font-semibold">{children}</h2>,
    h3: ({children}) => <h3 className="my-2 text-sm font-semibold">{children}</h3>,
    h4: ({children}) => <h4 className="my-1.5 text-sm font-semibold">{children}</h4>,
    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
    em: ({children}) => <em className="italic">{children}</em>,
    a: ({href, children}) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-500 underline underline-offset-2">{children}</a>,
    blockquote: ({children}) => <blockquote className="my-1.5 border-l-2 border-gray-400 pl-2 text-gray-500">{children}</blockquote>,
    code: ({className, children, ...props}) => <code className={`rounded bg-black/[0.04] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/[0.06] ${className || ''}`} {...props}>{children}</code>,
    pre: ({children}) => <CodeBlock>{children}</CodeBlock>,
    hr: () => <hr className="my-2 border-gray-300 dark:border-white/20"/>,
    table: ({children}) => <div className="my-2 w-full min-w-0 max-w-full overflow-x-auto"><table className="w-full min-w-max border-collapse text-xs">{children}</table></div>,
    th: ({children}) => <th className="whitespace-nowrap border border-gray-300 px-2 py-1 text-left font-medium dark:border-white/20">{children}</th>,
    td: ({children}) => <td className="whitespace-nowrap border border-gray-300 px-2 py-1 align-top dark:border-white/20">{children}</td>,
};

export const AIMessageMarkdown = memo(function AIMessageMarkdown({text}: {text: string}) {
    return <div className="w-full min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere] text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>{text}</ReactMarkdown>
    </div>;
});
