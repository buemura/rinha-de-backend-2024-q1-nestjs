import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from '../dtos';
import { TransactionTypeEnum } from '../enums';
import { TransactionService } from '../services';

@Controller('clientes')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post(':id/transacoes')
  @HttpCode(HttpStatus.OK)
  async createTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    if (body.tipo === TransactionTypeEnum.CREDIT) {
      return this.transactionService.createCreditTransaction(id, body);
    }
    return this.transactionService.createDebitTransaction(id, body);
  }
}
