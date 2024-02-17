import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { TransactionService } from '../services/transaction.service';
import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from '../dtos/transaction.dto';

@Controller('clientes')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post(':id/transacoes')
  @HttpCode(HttpStatus.OK)
  async createTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    return this.transactionService.createTransaction(id, body);
  }
}
