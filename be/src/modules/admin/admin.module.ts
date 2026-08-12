import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { CreditAccount } from '../billing/entities/credit-account.entity';
import { CreditTransaction } from '../billing/entities/credit-transaction.entity';
import { ServiceProduct } from '../billing/entities/service-product.entity';
import { ServiceUsage } from '../billing/entities/service-usage.entity';
import { CrawlerModule } from '../crawler/crawler.module';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { UserCv } from '../cv/entities/user-cv.entity';
import { User } from '../users/entities/user.entity';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ExternalQuotaService } from './external-quota.service';

@Module({
  imports: [AuthModule, ActivityModule, BillingModule, CrawlerModule, SystemSettingsModule, TypeOrmModule.forFeature([User, CreditAccount, CreditTransaction, ServiceProduct, ServiceUsage, CvResearchSession, UserCv])],
  controllers: [AdminController], providers: [AdminService, ExternalQuotaService],
})
export class AdminModule {}
