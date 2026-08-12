import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRealtimeGateway } from './admin-realtime.gateway';

@Module({ imports: [AuthModule], providers: [AdminRealtimeGateway], exports: [AdminRealtimeGateway] })
export class AdminRealtimeModule {}
