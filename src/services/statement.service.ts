import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';

import { Customer, StatementResponseDto, Transaction } from '../dtos';

@Injectable()
export class StatementService {
  constructor(private readonly pool: Pool) {}

  async getCustomerStatement(
    customerId: number,
  ): Promise<StatementResponseDto> {
    const {
      rows: [customer],
    } = await this.pool.query<Customer>(
      `
        SELECT c.id, c.name, c.account_limit, s.balance AS balance
        FROM customers c
        INNER JOIN balances s ON c.id = s.customer_id
        WHERE c.id = $1
      `,
      [customerId],
    );
    if (!customer) throw new NotFoundException('Customer not found');

    const { rows: transactions } = await this.pool.query<Transaction>(
      `
        SELECT
          amount,
          type,
          description,
          created_at
        FROM transactions
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        `,
      [customerId],
    );

    return {
      saldo: {
        total: customer.balance,
        limite: customer.account_limit,
        data_extrato: new Date(),
      },
      ultimas_transacoes: transactions.map((trx) => ({
        valor: trx.amount,
        tipo: trx.type,
        descricao: trx.description,
        realizada_em: trx.created_at,
      })),
    };
  }
}
