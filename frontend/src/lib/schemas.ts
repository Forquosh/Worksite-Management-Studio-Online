import { z } from 'zod'

export const WorkerSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(50, { message: 'Name must be at most 50 characters.' }),
  age: z.coerce
    .number()
    .min(18, { message: 'Age must be at least 18.' })
    .max(100, { message: 'Age must be at most 100.' })
    .int({ message: 'Age must be an integer.' }),
  position: z
    .string()
    .min(2, { message: 'Position must be at least 2 characters.' })
    .max(50, { message: 'Position must be at most 50 characters.' }),
  salary: z.coerce
    .number()
    .min(0, { message: 'Salary must be at least 0.' })
    .int({ message: 'Salary must be an integer.' }),
  user_id: z.number().optional() // Will be set by the backend
})

export const ProjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(100, { message: 'Name must be at most 100 characters.' }),
  description: z
    .string()
    .min(10, { message: 'Description must be at least 10 characters.' })
    .max(500, { message: 'Description must be at most 500 characters.' }),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: active, completed, on_hold, cancelled' })
  }),
  start_date: z.string(),
  end_date: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  user_id: z.number().optional(), // Will be set by the backend
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().nullable().optional()
})
