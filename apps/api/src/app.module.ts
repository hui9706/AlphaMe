import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { resolve } from 'node:path';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { CoinService } from './coin.service';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { ApiKeyPool } from './providers/api-key.pool';
import { SeedreamProvider } from './providers/seedream.provider';
import { AuthGuard } from './auth.guard';
import { StorageService } from './storage.service';
import { UploadsController } from './uploads.controller';
import { AssetsController } from './assets.controller';
import { GenerationQueue } from './generation.queue';
import { GenerationWorker } from './generation.worker';
import { ZaloIdentityProvider } from './zalo.identity';
import { CoinController } from './coin.controller';
import { MaintenanceService } from './maintenance.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { SecretsService } from './secrets.service';
import { VolcengineService } from './volcengine.service';
import { CheckInController } from './check-in.controller';
import { CheckInService } from './check-in.service';
import { PlazaController } from './plaza.controller';
import { PlazaService } from './plaza.service';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { RewardRiskService } from './reward-risk.service';
import { HomeController } from './home.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), 'apps/api/.env'), resolve(process.cwd(), '.env')],
      validate: (config) => {
        if (config.NODE_ENV === 'production' && (!config.DATABASE_URL || !config.JWT_SECRET || config.JWT_SECRET === 'development-only-secret' || !config.ADMIN_ENCRYPTION_KEY)) {
          throw new Error('DATABASE_URL, JWT_SECRET, and ADMIN_ENCRYPTION_KEY are required in production');
        }
        return config;
      },
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get('JWT_SECRET', 'development-only-secret') }),
    }),
  ],
  controllers: [HealthController, AuthController, TemplatesController, HomeController, GenerationsController, UploadsController, AssetsController, CoinController, CheckInController, PlazaController, ShareController, AdminController],
  providers: [PrismaService, AuthService, ZaloIdentityProvider, TemplatesService, CoinService, CheckInService, PlazaService, ShareService, RewardRiskService, GenerationsService, ApiKeyPool, SeedreamProvider, AuthGuard, StorageService, GenerationQueue, GenerationWorker, MaintenanceService, AdminGuard, AdminService, SecretsService, VolcengineService],
})
export class AppModule {}
