import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { OrderModule } from '../order/order.module';

import { CartController } from './cart.controller';
import { CartService } from './services';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    OrderModule,
    HttpModule.register({ timeout: 5000, maxRedirects: 5 }),
  ],
  providers: [CartService, PrismaService],
  controllers: [CartController],
})
export class CartModule {}
