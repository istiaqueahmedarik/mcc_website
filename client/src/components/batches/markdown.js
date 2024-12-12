import MarkdownRender from '../MarkdownRenderer'

const Markdown = () => {
  const a =
    'This is *italic* and this is **bold** \n---\n```js\nconst a = 1;\n```'

  return (
    <div>
      <h1>My Markdown Page</h1>
      <MarkdownRender content={a} />
    </div>
  )
}

export default Markdown
