import { Injectable, NotFoundException } from '@nestjs/common';
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
  }: CreateOrderPayload): Promise<Order> {
    const id = randomUUID() as string;

    const order = await this.prisma.$transaction(async (prisma) => {
      const newOrder = await prisma.order.create({
        data: {
          id,
          userId,
          cartId,
          status: OrderStatus.Open,
          delivery: address,
          total,
          comments: address.comment,
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.Open,
          comment: 'Order created',
          timestamp: new Date(),
        },
      });

      return newOrder;
    });

    return this.findById(order.id);
  }

  async findById(orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
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
        statusHistory: {
          orderBy: {
            timestamp: 'asc',
          },
          select: {
            status: true,
            comment: true,
            timestamp: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      userId: order.userId,
      cartId: order.cartId,
      address: order.delivery as Address,
      items: order.cart.cartItems.map((item) => ({
        productId: item.productId,
        count: item.count,
      })),
      statusHistory: order.statusHistory.map((history) => ({
        status: history.status as OrderStatus,
        timestamp: history.timestamp,
        comment: history.comment,
      })),
    };
  }

  async updateStatus(
    orderId: string,
    userId: string,
    newStatus: OrderStatus,
    comment: string,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          comment,
          timestamp: new Date(),
        },
      });

      return this.findById(orderId);
    });

    return updatedOrder;
  }

  async delete(orderId: string, userId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.order.delete({
      where: {
        id: orderId,
      },
    });
  }
}
