import {
  Controller,
  Get,
  Request,
  Post,
  UseGuards,
  HttpStatus,
  Body,
  HttpCode,
} from '@nestjs/common';
import {
  LocalAuthGuard,
  AuthService,
  // JwtAuthGuard,
  BasicAuthGuard,
} from './auth';
import { User } from './users';
import { AppRequest } from './shared';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private authService: AuthService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('test-db')
  async testConnection() {
    try {
      // Try to create a test record
      const result = await this.prismaService.testConnection.create({
        data: {},
      });
      return {
        status: 'Connected successfully!',
        testRecord: result,
      };
    } catch (error) {
      return {
        status: 'Connection failed',
        error: error.message,
      };
    }
  }

  @Get(['', 'ping'])
  healthCheck() {
    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
    };
  }

  @Post('api/auth/register')
  @HttpCode(HttpStatus.CREATED)
  // TODO ADD validation
  register(@Body() body: User) {
    return this.authService.register(body);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('api/auth/login')
  async login(@Request() req: AppRequest) {
    const token = this.authService.login(req.user, 'basic');

    return token;
  }

  @UseGuards(BasicAuthGuard)
  @Get('api/profile')
  async getProfile(@Request() req: AppRequest) {
    return {
      user: req.user,
    };
  }
}
