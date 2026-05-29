# 🐾 TeoNova-Vet

Este es el primer desarrollo de TeoNova para la gestión de inventarios, enfocado en las necesidades de veterinarias.

Sistema POS completo para veterinaria: ventas, inventario, clientes, mascotas, servicios y reportes.

## Requisitos
- Node.js v18+
- XAMPP (MySQL)

## Instalación

### 1. Base de datos
- Abre phpMyAdmin → crea DB `veterinaria_pos` → importa `database/schema.sql`

### 2. Backend
```bash
cd backend
cp .env.example .env   # ajusta DB_PASSWORD si tienes contraseña
npm install
```

### 3. Crear usuario admin
```bash
cd ..   # raíz del proyecto
npm install bcrypt mysql2 dotenv
node setup-admin.js
```

### 4. Iniciar
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

Abre → http://localhost:5173  
Login → admin@veterinaria.com / Admin1234!

