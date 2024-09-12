import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default {
  port: process.env.PORT || 5000,
  fetch: app.fetch,
}
