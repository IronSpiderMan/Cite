import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export function Markdown({ value }: { value: string }) {
  return (
    <div className="markdown select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-semibold tracking-tight mt-5 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold tracking-tight mt-5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold tracking-tight mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-7 my-2">{children}</p>,
          a: ({ children, href }) => (
            <a href={href} className="text-primary underline underline-offset-4">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1 text-sm">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 my-3 text-sm text-muted-foreground">{children}</blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="my-3 overflow-auto">
              <table className="w-full text-sm border border-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/30">{children}</thead>,
          th: ({ children }) => <th className="text-left font-medium p-2 border-b border-border">{children}</th>,
          td: ({ children }) => <td className="p-2 border-b border-border align-top">{children}</td>,
          code: (props: any) => {
            const { className, children, ...rest } = props || {}
            const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children ?? '')
            const isBlock = (typeof className === 'string' && className.includes('language-')) || text.includes('\n')
            if (isBlock) return <code className={className} {...rest}>{children}</code>
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[12px]" {...rest}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 p-3 rounded-md border border-border bg-muted/30 overflow-auto text-[12px] leading-6 font-mono">
              {children}
            </pre>
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}
