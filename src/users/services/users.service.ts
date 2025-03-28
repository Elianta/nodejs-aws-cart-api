import { Injectable } from '@nestjs/common';
import { User } from '../models';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(name: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { name } });
  }

  async createOne({ name, password }: Omit<User, 'id'>): Promise<User> {
    return this.prisma.user.create({
      data: {
        name,
        password, // Note: In production, ensure password is hashed before storing
      },
    });
  }
}
