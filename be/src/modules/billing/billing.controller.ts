import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get('catalog') catalog() { return this.billing.getCatalog(); }
  @UseGuards(JwtAuthGuard)
  @Get('me') account(@Req() request: AuthenticatedRequest) { return this.billing.getAccount(request.user.id); }
  @UseGuards(JwtAuthGuard)
  @Get('me/transactions') transactions(@Req() request: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.billing.listTransactions(request.user.id, Number(limit) || 50);
  }
}
