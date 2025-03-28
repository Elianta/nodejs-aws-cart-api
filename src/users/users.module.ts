import { Module } from '@nestjs/common';

import { UsersService } from './services';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
