import { Module } from '@nestjs/common';
import { OrderService } from './services';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
