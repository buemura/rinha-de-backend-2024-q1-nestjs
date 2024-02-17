import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';

import {
  Balance,
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from '../dtos';
import { TransactionTypeEnum } from '../enums';

@Injectable()
export class TransactionService {
  constructor(private readonly pool: Pool) {}

  async createTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        rows: [customerBalnce],
      } = await client.query<Balance>(
        `
          SELECT b.id, b.customer_id, b.balance, c.account_limit
          FROM balances b
          INNER JOIN customers c ON b.customer_id = c.id
          WHERE customer_id = $1
          FOR UPDATE
          `,
        [customerId],
      );
      if (!customerBalnce) throw new NotFoundException('Cliente not found');

      let balance = customerBalnce.balance;
      if (input.tipo === TransactionTypeEnum.CREDIT) balance += input.valor;
      if (input.tipo === TransactionTypeEnum.DEBIT) balance -= input.valor;
      if (customerBalnce.account_limit + balance < 0) {
        throw new UnprocessableEntityException(
          'Cliente does not have enough limit',
        );
      }

      await client.query(
        `UPDATE balances SET balance = $1 WHERE customer_id = $2`,
        [balance, customerId],
      );
      await client.query(
        `INSERT INTO transactions (customer_id, amount, type, description, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [customerId, input.valor, input.tipo, input.descricao, new Date()],
      );
      await client.query('COMMIT');

      return {
        limite: customerBalnce.account_limit ?? 0,
        saldo: balance,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    } finally {
      client.release();
    }
  }
}
