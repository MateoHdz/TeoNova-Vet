import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule }          from './auth/auth.module';
import { UsersModule }         from './users/users.module';
import { ClinicsModule }       from './clinics/clinics.module';
import { CustomersModule }     from './customers/customers.module';
import { PetsModule }          from './pets/pets.module';
import { ProductsModule }      from './products/products.module';
import { ServicesModule }      from './services/services.module';
import { SalesModule }         from './sales/sales.module';
import { ReportsModule }       from './reports/reports.module';
import { AppointmentsModule }  from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExpensesModule }      from './expenses/expenses.module';

function validateEnv(config: ConfigService) {
  const required = ['JWT_SECRET', 'DB_HOST', 'DB_NAME'];
  for (const key of required) {
    if (!config.get(key)) {
      throw new Error(`Variable de entorno requerida no encontrada: ${key}. Revisa tu archivo .env`);
    }
  }
  if (config.get('JWT_SECRET') === 'CAMBIAR_POR_SECRETO_LARGO_Y_ALEATORIO_EN_PRODUCCION' &&
      config.get('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET no puede ser el valor por defecto en producción');
  }
}

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting: 120 requests / 60s por IP ──────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => [{
        ttl:   c.get<number>('THROTTLE_TTL',   60) * 1000,
        limit: c.get<number>('THROTTLE_LIMIT', 120),
      }],
    }),

    // ── Database ──────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => {
        validateEnv(c);
        return {
          type: 'mysql',
          host:     c.get('DB_HOST', 'localhost'),
          port:     c.get<number>('DB_PORT', 3306),
          username: c.get('DB_USERNAME', 'root'),
          password: c.get('DB_PASSWORD', ''),
          database: c.get('DB_NAME', 'veterinaria_pos'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: c.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
          timezone: c.get('DB_TIMEZONE', '-05:00'), // America/Bogota — alinea lectura/escritura con hora local
          extra: {
            connectionLimit:    c.get<number>('DB_CONNECTION_LIMIT', 10),
            waitForConnections: true,
            queueLimit:         0,
          },
        };
      },
    }),

    // ── Feature modules ───────────────────────────────────
    AuthModule,
    UsersModule,
    ClinicsModule,
    CustomersModule,
    PetsModule,
    ProductsModule,
    ServicesModule,
    SalesModule,
    ReportsModule,
    AppointmentsModule,
    NotificationsModule,
    ExpensesModule,
  ],
  providers: [
    // Apply rate limiting globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
