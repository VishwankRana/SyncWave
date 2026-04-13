import { Router } from 'express'

const router = Router()

router.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'musicyfy-server',
    now: Date.now(),
  })
})

export default router
