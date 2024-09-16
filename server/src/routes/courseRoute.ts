import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { deleteCourse, getAllCourses, getCourse, getCourseInstrucotrs, insertCourse } from '../controllers/courseController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.post('/insert', insertCourse)
route.get('/all', getAllCourses)
route.post('/delete', deleteCourse)
route.post('/get', getCourse)
route.post('/getins', getCourseInstrucotrs)

export default route
