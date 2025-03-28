import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Cart, CartStatuses } from '../models';
import { PutCartPayload } from 'src/order/type';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CartItem as PrismaCartItem } from '@prisma/client';

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
        const product = await this.getProductDetails(item.product_id);
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
        user_id: userId,
        status: CartStatuses.OPEN,
      },
      include: {
        cart_items: true,
      },
    });

    if (!cart) return null;

    const enrichedItems = await this.enrichCartItemsWithProducts(
      cart.cart_items,
    );

    return {
      id: cart.id,
      user_id: cart.user_id,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
      status: cart.status as CartStatuses,
      items: enrichedItems,
    };
  }

  async createByUserId(userId: string): Promise<Cart> {
    const cart = await this.prisma.cart.create({
      data: {
        user_id: userId,
        status: 'OPEN',
      },
    });

    return {
      id: cart.id,
      user_id: cart.user_id,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
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
        cart_id: cart.id,
        product_id: payload.product.id,
      },
    });

    if (existingItem) {
      if (payload.count === 0) {
        // Remove the item if count is 0
        await this.prisma.cartItem.delete({
          where: {
            cart_id_product_id: {
              cart_id: existingItem.cart_id,
              product_id: existingItem.product_id,
            },
          },
        });
      } else {
        // Update existing item count
        await this.prisma.cartItem.update({
          where: {
            cart_id_product_id: {
              cart_id: existingItem.cart_id,
              product_id: existingItem.product_id,
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
          cart_id: cart.id,
          product_id: payload.product.id,
          count: payload.count,
        },
      });
    }

    const updatedCart = await this.prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        updated_at: new Date(),
      },
      include: {
        cart_items: true,
      },
    });

    const enrichedItems = await this.enrichCartItemsWithProducts(
      updatedCart.cart_items,
    );

    return {
      id: updatedCart.id,
      user_id: updatedCart.user_id,
      created_at: updatedCart.created_at,
      updated_at: updatedCart.updated_at,
      status: updatedCart.status as CartStatuses,
      items: enrichedItems,
    };
  }

  async removeByUserId(userId): Promise<void> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        user_id: userId,
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
}
