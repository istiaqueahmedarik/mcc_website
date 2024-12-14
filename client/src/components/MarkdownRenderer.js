import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs/docco'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

// Custom iframe component for enhanced styling
const Iframe = ({ node, ...props }) => {
  if (node.tagName === 'iframe') {
    return (
      <div className="aspect-w-16 aspect-h-9">
        <iframe
          {...props}
          className="w-full aspect-video"
        />
      </div>
    )
  }
  return null
}

const MarkdownRender = ({ content }) => {
  return (
    <div className="prose dark:prose-invert w-[90vw] max-w-5xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]} // Add rehypeRaw for raw HTML
        components={{
          iframe: Iframe,
          code(props) {
            const { children, className, node, ...rest } = props
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <SyntaxHighlighter
                {...rest}
                PreTag="div"
                children={String(children).replace(/\n$/, '')}
                language={match[1]}
                style={docco}
                showLineNumbers={true}
              />
            ) : (
              <code
                {...rest}
                className={className}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRender
