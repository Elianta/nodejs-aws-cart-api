import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Param,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BasicAuthGuard } from '../auth';
import { Order, OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';
import { calculateCartTotal } from './models-rules';
import { CartService } from './services';
import { CartItem, CartStatuses } from './models';
import {
  CreateOrderDto,
  PutCartPayload,
  UpdateOrderStatusDto,
} from '../order/type';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/profile/cart')
export class CartController {
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private prisma: PrismaService,
  ) {}

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserCart(@Req() req: AppRequest): Promise<CartItem[]> {
    const cart = await this.cartService.findOrCreateByUserId(
      getUserIdFromRequest(req),
    );

    return cart.items;
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart(
    @Req() req: AppRequest,
    @Body() body: PutCartPayload,
  ): Promise<CartItem[]> {
    // TODO: validate body payload...
    const cart = await this.cartService.updateByUserId(
      getUserIdFromRequest(req),
      body,
    );

    return cart.items;
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearUserCart(@Req() req: AppRequest) {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put('order')
  async checkout(
    @Req() req: AppRequest,
    @Body() body: CreateOrderDto,
  ): Promise<{ order: Order }> {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findByUserId(userId);

    if (!(cart && cart.items.length)) {
      throw new BadRequestException('Cart is empty');
    }

    const { id: cartId, items } = cart;
    const total = calculateCartTotal(items);

    try {
      const result = await this.prisma.$transaction(async () => {
        const order = await this.orderService.create({
          userId,
          cartId,
          items: items.map(({ product, count }) => ({
            productId: product.id,
            count,
          })),
          address: body.address,
          total,
        });

        await this.cartService.updateStatus(cartId, CartStatuses.ORDERED);

        return order;
      });

      return { order: result };
    } catch (error) {
      throw new BadRequestException('Failed to create order: ' + error.message);
    }
  }

  @UseGuards(BasicAuthGuard)
  @Get('order')
  async getOrder(@Req() req: AppRequest): Promise<Order[]> {
    const userId = getUserIdFromRequest(req);
    return this.orderService.getAll(userId);
  }

  @UseGuards(BasicAuthGuard)
  @Get('order/:id')
  async getOrderById(
    @Param('id') orderId: string,
    @Req() req: AppRequest,
  ): Promise<Order> {
    const userId = getUserIdFromRequest(req);
    const order = await this.orderService.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify the order belongs to the user
    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  @UseGuards(BasicAuthGuard)
  @Put('order/:id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() { status, comment }: UpdateOrderStatusDto,
    @Req() req: AppRequest,
  ): Promise<Order> {
    const userId = getUserIdFromRequest(req);
    return this.orderService.updateStatus(orderId, userId, status, comment);
  }

  @UseGuards(BasicAuthGuard)
  @Delete('order/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(
    @Param('id') orderId: string,
    @Req() req: AppRequest,
  ): Promise<void> {
    const userId = getUserIdFromRequest(req);
    await this.orderService.delete(orderId, userId);
  }
}
