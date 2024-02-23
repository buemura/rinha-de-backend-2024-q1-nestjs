import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';

import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
  Customer,
} from '../dtos';

@Injectable()
export class TransactionService {
  constructor(private readonly pool: Pool) {}

  async createCreditTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const {
      rows: [customer],
    } = await this.pool.query<Customer>(
      `
      UPDATE customers
      SET account_balance = account_balance + $1 
      WHERE id = $2
      RETURNING account_limit, account_balance
      `,
      [input.valor, customerId],
    );
    await this.pool.query(
      `INSERT INTO transactions (customer_id, amount, type, description, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [customerId, input.valor, input.tipo, input.descricao, new Date()],
    );
    return {
      limite: customer.account_limit,
      saldo: customer.account_balance,
    };
  }

  async createDebitTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        rows: [customer],
      } = await client.query<Customer>(
        `
        SELECT id, account_limit, account_balance
        FROM customers
        WHERE id = $1
        FOR UPDATE
        `,
        [customerId],
      );
      if (!customer) throw new NotFoundException('Cliente not found');

      const balance = customer.account_balance - input.valor;
      if (customer.account_limit + balance < 0) {
        throw new UnprocessableEntityException();
      }

      await client.query(
        `UPDATE customers SET account_balance = $1 WHERE id = $2`,
        [balance, customerId],
      );
      await client.query(
        `INSERT INTO transactions (customer_id, amount, type, description, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [customerId, input.valor, input.tipo, input.descricao, new Date()],
      );
      await client.query('COMMIT');

      return {
        limite: customer.account_limit,
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
