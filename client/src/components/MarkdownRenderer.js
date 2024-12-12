import 'highlight.js/styles/github.css'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

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
    <div className="prose dark:prose-invert w-screen max-w-5xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]} // Add rehypeRaw for raw HTML
        components={{
          iframe: Iframe, // Handle iframe rendering
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRender
