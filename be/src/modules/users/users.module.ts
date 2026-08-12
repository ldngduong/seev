import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { CreditAccount } from '../billing/entities/credit-account.entity';
import { CreditTransaction } from '../billing/entities/credit-transaction.entity';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    SystemSettingsModule,
    TypeOrmModule.forFeature([User, CreditAccount, CreditTransaction]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
