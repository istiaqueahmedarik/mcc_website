import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
  addCourseContent,
  deleteCourse,
  deleteCourseContent,
  editCourse,
  editCourseContent,
  getAllCourses,
  getContent,
  getCourse,
  getCourseInstrucotrs,
  getCourseMembers,
  insertCourse,
} from '../controllers/courseController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.post('/insert/content', addCourseContent)
route.post('/edit/content', editCourseContent)
route.post('/insert', insertCourse)
route.get('/all', getAllCourses)
route.post('/delete', deleteCourse)
route.post('/get', getCourse)
route.post('/getins', getCourseInstrucotrs)
route.post('/getmems', getCourseMembers)
route.post('/getcontents', getContent)
route.post('/edit', editCourse)
route.post('delete_content', deleteCourseContent)

export default route
