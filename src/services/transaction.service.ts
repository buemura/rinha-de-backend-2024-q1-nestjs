import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';

import { Balance } from '../dtos/balance';
import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from '../dtos/transaction.dto';
import { TransactionTypeEnum } from '../enums/transaction-type.enum';
import { Customer } from '../dtos/customer';

@Injectable()
export class TransactionService {
  constructor(private readonly pool: Pool) {}

  async createTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const client = await this.pool.connect();

    const {
      rows: [customer],
    } = await client.query<Customer>(
      `
        SELECT c.id, c.name, c.account_limit, s.balance AS balance
        FROM customers c
        INNER JOIN balances s ON c.id = s.customer_id
        WHERE c.id = $1
      `,
      [customerId],
    );
    if (!customer) throw new NotFoundException('Cliente not found');

    try {
      await client.query('BEGIN');

      const {
        rows: [customerBalnce],
      } = await client.query<Balance>(
        `
          SELECT id, customer_id, balance
          FROM balances
          WHERE customer_id = $1
          FOR UPDATE
          `,
        [customerId],
      );

      let balance = customerBalnce.balance;

      if (input.tipo === TransactionTypeEnum.CREDIT) {
        balance += input.valor;
      }
      if (input.tipo === TransactionTypeEnum.DEBIT) {
        balance -= input.valor;
      }
      if (customer.account_limit + balance < 0) {
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

      console.log(customer);

      return {
        limite: customer.account_limit ?? 0,
        saldo: balance,
      };
    } catch (error) {
      console.log(error);

      await client.query('ROLLBACK');
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    } finally {
      client.release();
    }
  }
}
