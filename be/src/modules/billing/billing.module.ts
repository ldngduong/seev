import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditAccount } from './entities/credit-account.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { ServiceProduct } from './entities/service-product.entity';
import { ServiceUsage } from './entities/service-usage.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CreditAccount, CreditTransaction, ServiceProduct, ServiceUsage])],
  controllers: [BillingController], providers: [BillingService], exports: [BillingService],
})
export class BillingModule {}
