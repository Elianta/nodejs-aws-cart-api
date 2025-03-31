import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Cart, CartStatuses } from '../models';
import { PutCartPayload } from 'src/order/type';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CartStatus, CartItem as PrismaCartItem } from '@prisma/client';

@Injectable()
export class CartService {
  private readonly productsApiUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.productsApiUrl = this.configService.get<string>('PRODUCTS_API_URL');
  }

  private async getProductDetails(productId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.productsApiUrl}/products/${productId}`),
      );
      return data;
    } catch (error) {
      console.error(
        `Failed to fetch product details for ID ${productId}:`,
        error,
      );
      return null;
    }
  }

  private async enrichCartItemsWithProducts(cartItems: PrismaCartItem[]) {
    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await this.getProductDetails(item.productId);
        return {
          product,
          count: item.count,
        };
      }),
    );

    return enrichedItems.filter((item) => item.product !== null);
  }

  async findByUserId(userId: string): Promise<Cart> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatuses.OPEN,
      },
      include: {
        cartItems: true,
      },
    });

    if (!cart) return null;

    const enrichedItems = await this.enrichCartItemsWithProducts(
      cart.cartItems,
    );

    return {
      id: cart.id,
      user_id: cart.userId,
      created_at: cart.createdAt,
      updated_at: cart.updatedAt,
      status: cart.status as CartStatuses,
      items: enrichedItems,
    };
  }

  async createByUserId(userId: string): Promise<Cart> {
    const cart = await this.prisma.cart.create({
      data: {
        userId,
        status: 'OPEN',
      },
    });

    return {
      id: cart.id,
      user_id: cart.userId,
      created_at: cart.createdAt,
      updated_at: cart.updatedAt,
      status: cart.status as CartStatuses,
      items: [],
    };
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    const cart = await this.findOrCreateByUserId(userId);

    // Find if the product already exists in the cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: payload.product.id,
      },
    });

    if (existingItem) {
      if (payload.count === 0) {
        // Remove the item if count is 0
        await this.prisma.cartItem.delete({
          where: {
            cartId_productId: {
              cartId: existingItem.cartId,
              productId: existingItem.productId,
            },
          },
        });
      } else {
        // Update existing item count
        await this.prisma.cartItem.update({
          where: {
            cartId_productId: {
              cartId: existingItem.cartId,
              productId: existingItem.productId,
            },
          },
          data: {
            count: payload.count,
          },
        });
      }
    } else if (payload.count > 0) {
      // Add new item only if count is greater than 0
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: payload.product.id,
          count: payload.count,
        },
      });
    }

    const updatedCart = await this.prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        updatedAt: new Date(),
      },
      include: {
        cartItems: true,
      },
    });

    const enrichedItems = await this.enrichCartItemsWithProducts(
      updatedCart.cartItems,
    );

    return {
      id: updatedCart.id,
      user_id: updatedCart.userId,
      created_at: updatedCart.createdAt,
      updated_at: updatedCart.updatedAt,
      status: updatedCart.status as CartStatuses,
      items: enrichedItems,
    };
  }

  async removeByUserId(userId): Promise<void> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
      },
    });

    if (cart) {
      await this.prisma.cart.delete({
        where: {
          id: cart.id,
        },
      });
    }
  }

  async updateStatus(cartId: string, status: CartStatuses) {
    await this.prisma.cart.update({
      where: {
        id: cartId,
      },
      data: {
        status: status as CartStatus,
      },
    });
  }
}
