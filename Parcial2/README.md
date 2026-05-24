# Pokémon Battle Rooms

Aplicación web de batallas Pokémon 1P vs 1P mediante salas con código.

## Stack Tecnológico

- **Frontend**: Vanilla JS + Clerk Auth
- **Backend**: Hono
- **Runtime**: Bun
- **Base de datos**: MongoDB
- **Datos externos**: PokéAPI
- **Pagos**: Stripe
- **Autenticación**: Clerk
- **Contenedores**: Docker / Docker Compose

## Requisitos Previos

- Bun instalado
- Docker y Docker Compose instalados
- Cuenta de Clerk (https://clerk.com)
- Cuenta de Stripe (https://stripe.com)

## Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

- **Clerk**: Crea un proyecto en https://clerk.com y obtén las keys
- **Stripe**: Obtén las keys de https://dashboard.stripe.com/test/apikeys

### 2. Iniciar MongoDB

```bash
docker-compose up -d
```

### 3. Instalar Dependencias

```bash
bun install
```

### 4. Importar Datos desde PokéAPI

```bash
bun run import
```

Este script importa:
- 300 Pokémon desde PokéAPI (con sprites normales y shiny)
- Movimientos asociados
- Relaciones de daño entre tipos

### 5. Ejecutar la Aplicación

```bash
bun run dev
```

La aplicación estará disponible en `http://localhost:3001`

## Cómo Jugar

1. **Autenticación (opcional)**: Haz clic en "Sign In" para usar Clerk.
2. **Crear una sala**: Haz clic en "Create Room", ingresa tu nombre y genera un código.
3. **Unirse a una sala**: Ingresa el código de sala proporcionado por el creador.
4. **Seleccionar equipo**: Cada jugador selecciona hasta 6 Pokémon.
5. **Iniciar batalla**: Cuando ambos jugadores están listos, el creador inicia la partida.
6. **Combate**: En cada turno puedes:
   - Usar uno de los 4 movimientos del Pokémon activo
   - Cambiar a otro Pokémon vivo de tu equipo

## Pokémon Shiny

Los Pokémon shiny son versiones especiales con colores diferentes. Para desbloquearlos:

1. Inicia sesión con Clerk
2. Activa el toggle "Show Shiny Pokemon" en el lobby
3. Los Pokémon shiny desbloqueados muestran un badge ✨
4. Los Pokémon shiny bloqueados muestran un badge 🔒 con precio ($5)
5. Haz clic en el badge 🔒 para comprar con Stripe
6. Después del pago, el shiny se desbloquea permanentemente

## Reglas Implementadas

### Daño

La fórmula de daño utiliza:

- Nivel fijo: 50
- IVs aleatorios (0-31) generados al inicio
- STAB (x1.5 si el tipo del movimiento coincide con el atacante)
- Efectividad por tipo (x2, x0.5, x0) obtenida desde PokéAPI
- Factor aleatorio (85-100)
- Golpe crítico (x1.5, probabilidad 1/24)
- Modificador por quemadura (x0.5 si atacante quemado y movimiento físico)

### Estados Temporales

- Los estados duran 3 turnos
- Quemadura y veneno: 5% del HP máximo por turno
- Parálisis: 25% de probabilidad de no poder moverse, velocidad reducida
- Al cambiar de Pokémon, los estados se eliminan

### Orden de Acciones

- Coin flip para decidir qué Pokémon actúa primero (versión base)
- Opcional: prioridad del movimiento + velocidad efectiva

### Victoria

La partida termina cuando todos los Pokémon de un jugador quedan debilitados.

## Fuente de Datos

Todos los datos se obtienen desde **PokéAPI** (https://pokeapi.co/api/v2):

- Lista de Pokémon: `/pokemon?limit=300&offset=0`
- Detalle de Pokémon: `/pokemon/{id}`
- Detalle de movimientos: `/move/{id}`
- Relaciones de tipo: `/type/{id}`

Los datos se persisten en MongoDB para evitar llamadas externas durante la batalla.

## Endpoints de la API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/pokemon` | - | Lista todos los Pokémon |
| GET | `/api/moves` | - | Lista todos los movimientos |
| GET | `/api/type-relations` | - | Mapa de efectividad por tipo |
| GET | `/api/user` | Clerk | Obtener usuario actual |
| GET | `/api/user/shiny` | Clerk | Obtener shiny desbloqueados |
| POST | `/api/rooms` | - | Crear una nueva sala |
| GET | `/api/rooms/:code` | - | Obtener estado de una sala |
| POST | `/api/rooms/:code/join` | - | Unirse a una sala |
| POST | `/api/rooms/:code/ready` | - | Confirmar equipo listo |
| POST | `/api/rooms/:code/start` | - | Iniciar batalla |
| GET | `/api/battles/:code` | - | Obtener estado de batalla |
| POST | `/api/battles/:code/action` | - | Ejecutar acción de turno |
| POST | `/api/stripe/create-checkout` | Clerk | Crear sesión de pago |
| POST | `/api/stripe/webhook` | Stripe | Webhook de Stripe |

## Limitaciones Conocidas

- Clerk requiere configuración manual de keys
- Stripe está en modo test (pagos simulados)
- No hay reconexión si se refresca el navegador
- No se implementaron objetos ni clima/campo
- El orden de turno usa coin flip (prioridad/velocidad es opcional)

## Demo

Para la demo en clase:

1. Levantar el proyecto con `docker-compose up -d` y `bun run dev`
2. Crear una sala y copiar el código
3. Unir un segundo jugador desde otro navegador
4. Iniciar la partida
5. Demostrar:
   - Movimientos y daño por tipo
   - Estado temporal de 3 turnos
   - Cambio de Pokémon y eliminación de estado
   - Victoria/derrota
