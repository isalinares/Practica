import { rootRoute } from './routes/__root'
import { homeRoute } from './routes/index'
import { loginRoute } from './routes/login'
import { gameIndexRoute } from './routes/game/index'
import { gameIdRoute } from './routes/game/$id'
import { rankingRoute } from './routes/ranking'
import { skinsRoute } from './routes/skins'

export const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  gameIndexRoute,
  gameIdRoute,
  rankingRoute,
  skinsRoute,
])
