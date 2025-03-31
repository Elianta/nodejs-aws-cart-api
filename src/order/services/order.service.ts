import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Order } from '../models';
import { Address, CreateOrderPayload, OrderStatus } from '../type';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async getAll(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        cart: {
          include: {
            cartItems: {
              select: {
                productId: true,
                count: true,
              },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      cartId: order.userId,
      address: order.delivery as Address,
      items: order.cart.cartItems.map((item) => ({
        productId: item.productId,
        count: item.count,
      })),
      statusHistory: [
        {
          comment: '',
          status: OrderStatus.Open,
          timestamp: order.createdAt,
        },
      ],
    }));
  }

  async create({
    userId,
    cartId,
    total,
    address,
    items,
  }: CreateOrderPayload): Promise<Order> {
    const id = randomUUID() as string;

    await this.prisma.order.create({
      data: {
        id,
        userId,
        cartId,
        status: OrderStatus.Open,
        total,
        delivery: address,
        comments: address.comment,
      },
    });

    return {
      id,
      userId,
      cartId,
      address,
      items,
      statusHistory: [
        {
          comment: '',
          status: OrderStatus.Open,
          timestamp: new Date(),
        },
      ],
    };
  }
}
