import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
  addCourseContent,
  addSchedule,
  deleteCourse,
  deleteCourseContent,
  deleteSchedule,
  editCourse,
  editCourseContent,
  getAllCourses,
  getContent,
  getCourse,
  getCourseInstrucotrs,
  getCourseMembers,
  getSchedules,
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
route.post('/insert/schedule', addSchedule)
route.post('/edit/content', editCourseContent)
route.post('/insert', insertCourse)
route.get('/all', getAllCourses)
route.post('/delete', deleteCourse)
route.post('/get', getCourse)
route.post('/getins', getCourseInstrucotrs)
route.post('/getmems', getCourseMembers)
route.post('/getcontents', getContent)
route.post('/getschedules', getSchedules)
route.post('/edit', editCourse)
route.post('delete_content', deleteCourseContent)
route.post('delete/schedule', deleteSchedule)

export default route
