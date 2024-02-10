import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AppService } from './app.service';
import { StatementResponseDto } from './dtos/statement.dto';
import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from './dtos/transaction.dto';

@Controller('clientes')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post(':id/transacoes')
  @HttpCode(HttpStatus.OK)
  async createTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    return this.appService.createTransaction(id, body);
  }

  @Get(':id/extrato')
  async getStatement(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StatementResponseDto> {
    return this.appService.getCustomerStatement(id);
  }
}
