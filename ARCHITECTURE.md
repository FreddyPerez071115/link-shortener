# 🏗️ Arquitectura del Proyecto

## Patrón de diseño: Clean Architecture + Repository Pattern

Este proyecto implementa una arquitectura en capas que separa responsabilidades y facilita el mantenimiento, testing y escalabilidad.

---

## 📂 Estructura de Capas

```
src/
├── actions/           # Capa de Presentación (API)
├── services/          # Capa de Lógica de Negocio
├── repositories/      # Capa de Acceso a Datos
├── types/             # Tipos compartidos (DTOs e Interfaces)
└── db/                # Configuración de Base de Datos
```

---

## 🔄 Flujo de Datos

```
Usuario
   ↓
[Actions Layer]        → Validación de entrada + Mapeo de errores
   ↓
[Service Layer]        → Lógica de negocio + Reglas + Orquestación
   ↓
[Repository Layer]     → Operaciones CRUD en DB
   ↓
Base de Datos (Turso)
```

---

## 📋 Responsabilidades por Capa

### 1. **Actions Layer** (`src/actions/`)
**Responsabilidad:** Capa delgada de presentación

- ✅ Validación de entrada con Zod schemas
- ✅ Mapeo de errores del servicio a ActionError
- ✅ NO contiene lógica de negocio
- ✅ NO accede directamente a la base de datos

**Ejemplo:**
```typescript
// src/actions/index.ts
export const server = {
  createLink: defineAction({
    input: createLinkSchema,
    handler: async (input) => {
      const link = await linkService.createLink(input);
      return link;
    },
  }),
};
```

---

### 2. **Service Layer** (`src/services/`)
**Responsabilidad:** Lógica de negocio y reglas

- ✅ Validaciones de negocio (URLs duplicadas, códigos en uso)
- ✅ Orquestación de múltiples operaciones
- ✅ Generación de códigos únicos
- ✅ Manejo de errores de negocio personalizados
- ✅ NO accede directamente a Drizzle/DB

**Ejemplo:**
```typescript
// src/services/linkService.ts
export class LinkService {
  async createLink(data: CreateLinkDTO): Promise<Link> {
    // 1. Validar que la URL no exista
    const exists = await linkRepository.findByOriginalUrl(data.originalUrl);
    if (exists) throw new LinkServiceError('URL duplicada', 'CONFLICT');
    
    // 2. Generar o validar shortCode
    const shortCode = data.shortCode || await this.generateUniqueShortCode();
    
    // 3. Crear en DB
    return await linkRepository.create({ ...data, shortCode });
  }
}
```

---

### 3. **Repository Layer** (`src/repositories/`)
**Responsabilidad:** Acceso a datos (CRUD)

- ✅ Operaciones CRUD puras
- ✅ Abstracción de Drizzle ORM
- ✅ Queries optimizadas
- ✅ NO contiene lógica de negocio
- ✅ Retorna tipos tipados

**Ejemplo:**
```typescript
// src/repositories/linkRepository.ts
export class LinkRepository {
  async findByOriginalUrl(url: string): Promise<Link | null> {
    const result = await db
      .select()
      .from(links)
      .where(eq(links.originalUrl, url))
      .limit(1);
    return result[0] || null;
  }
  
  async create(data: CreateLinkDTO): Promise<Link> {
    const [link] = await db.insert(links).values(data).returning();
    return link;
  }
}
```

---

### 4. **Types Layer** (`src/types/`)
**Responsabilidad:** Contratos compartidos

- ✅ Interfaces de dominio
- ✅ DTOs (Data Transfer Objects)
- ✅ Tipos reutilizables

**Ejemplo:**
```typescript
// src/types/link.ts
export interface Link {
  id: number;
  originalUrl: string;
  shortCode: string;
}

export interface CreateLinkDTO {
  originalUrl: string;
  shortCode?: string;
}
```

---

## ✨ Beneficios de esta Arquitectura

### 🧪 **Testabilidad**
```typescript
// Puedes mockear el repository fácilmente
const mockRepo = {
  findByOriginalUrl: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(mockLink),
};

const service = new LinkService(mockRepo);
await service.createLink({ originalUrl: 'https://test.com' });
```

### 🔄 **Reutilización**
```typescript
// El mismo servicio se puede usar en Actions, API Routes, etc.
// src/pages/api/links.ts
export async function POST(request) {
  const data = await request.json();
  return await linkService.createLink(data); // ✅ Mismo servicio
}
```

### 🔧 **Mantenibilidad**
```typescript
// Si cambias de Drizzle a Prisma, solo modificas el Repository
// El Service y Actions NO cambian
export class LinkRepository {
  async findByOriginalUrl(url: string): Promise<Link | null> {
    // return await db.select()... // ❌ Drizzle
    return await prisma.link.findUnique({ where: { url } }); // ✅ Prisma
  }
}
```

### 📈 **Escalabilidad**
```typescript
// Agregar features es fácil y ordenado
export class LinkService {
  async incrementClickCount(shortCode: string): Promise<void> {
    const link = await linkRepository.findByShortCode(shortCode);
    if (!link) throw new LinkServiceError('Not found', 'NOT_FOUND');
    
    await linkRepository.update(link.id, { 
      clickCount: link.clickCount + 1 
    });
  }
}
```

---

## 🎯 Principios SOLID Aplicados

### ✅ Single Responsibility Principle (SRP)
- Cada capa tiene UNA responsabilidad
- Actions: Validación
- Services: Lógica de negocio
- Repositories: Acceso a datos

### ✅ Open/Closed Principle (OCP)
- Abierto a extensión (agregar nuevos métodos)
- Cerrado a modificación (no rompes código existente)

### ✅ Dependency Inversion Principle (DIP)
- Services dependen de abstracciones (interfaces), no de implementaciones concretas
- Repositories son intercambiables

---

## 🚀 Ejemplo de Flujo Completo

```typescript
// 1. Usuario envía formulario
<form action={actions.createLink}>
  <input name="originalUrl" value="https://example.com" />
</form>

// 2. Actions valida y delega
const link = await linkService.createLink({
  originalUrl: "https://example.com"
});

// 3. Service aplica lógica de negocio
const exists = await linkRepository.findByOriginalUrl(url);
if (exists) throw new LinkServiceError(...);
const shortCode = await this.generateUniqueShortCode();

// 4. Repository guarda en DB
const [newLink] = await db.insert(links).values({...}).returning();

// 5. Retorna al usuario
return newLink; // { id: 1, shortCode: "abc123", ... }
```

---

## 📝 Guía de Extensión

### Agregar nueva feature: "Eliminar Link"

#### 1. Repository (Acceso a datos)
```typescript
// src/repositories/linkRepository.ts
async deleteById(id: number): Promise<boolean> {
  const result = await db.delete(links).where(eq(links.id, id));
  return result.rowsAffected > 0;
}
```

#### 2. Service (Lógica de negocio)
```typescript
// src/services/linkService.ts
async deleteLink(id: number): Promise<void> {
  const deleted = await linkRepository.deleteById(id);
  if (!deleted) {
    throw new LinkServiceError('Link no encontrado', 'NOT_FOUND');
  }
}
```

#### 3. Action (API)
```typescript
// src/actions/index.ts
deleteLink: defineAction({
  input: z.object({ id: z.number() }),
  handler: async ({ id }) => {
    await linkService.deleteLink(id);
    return { success: true };
  },
}),
```

---

## 🛠️ Testing Strategy

```typescript
// Unit Tests: Testear Service con Repository mockeado
describe('LinkService', () => {
  it('should throw error if URL exists', async () => {
    const mockRepo = {
      findByOriginalUrl: jest.fn().mockResolvedValue(existingLink),
    };
    
    const service = new LinkService(mockRepo);
    await expect(service.createLink(data)).rejects.toThrow('URL duplicada');
  });
});

// Integration Tests: Testear Repository con DB de prueba
describe('LinkRepository', () => {
  it('should create link', async () => {
    const link = await linkRepository.create(data);
    expect(link.id).toBeDefined();
  });
});

// E2E Tests: Testear Actions completo
describe('Actions', () => {
  it('should create link via form', async () => {
    const result = await actions.createLink.safe({ originalUrl: 'https://test.com' });
    expect(result.data.shortCode).toBeDefined();
  });
});
```

---

## 📚 Referencias

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)

---

**✨ Esta arquitectura te permite escalar, testear y mantener el código fácilmente!**
