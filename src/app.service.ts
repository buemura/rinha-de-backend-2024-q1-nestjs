import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { StatementResponseDto } from './dtos/statement.dto';
import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
  Transaction,
} from './dtos/transaction.dto';
import { TransactionTypeEnum } from './enums/transaction-type.enum';
import { Customer } from './interfaces/customer';

type Balance = {
  id: number;
  cliente_id: number;
  valor: number;
};

@Injectable()
export class AppService {
  private pool: Pool;
  private db: NodePgDatabase;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.db = drizzle(this.pool);
  }

  async getCustomerStatement(
    customerId: number,
  ): Promise<StatementResponseDto> {
    const {
      rows: [customerBalance],
    } = await this.pool.query<Customer>(
      `
      SELECT c.id, c.nome, c.limite, s.valor AS saldo
			FROM clientes c
			INNER JOIN saldos s ON c.id = s.cliente_id
			WHERE c.id = $1
      `,
      [customerId],
    );
    if (!customerBalance) throw new NotFoundException('Cliente not found');

    const { rows: transacoes } = await this.pool.query<Transaction>(
      `
      SELECT
        valor,
        tipo,
        descricao,
        realizada_em
      FROM transacoes
      WHERE cliente_id = $1
      order by realizada_em desc
      limit 10
      `,
      [customerId],
    );

    return {
      saldo: {
        total: customerBalance.saldo,
        limite: customerBalance.limite,
        data_extrato: new Date(),
      },
      ultimas_transacoes: transacoes.map((trx) => ({
        valor: trx.valor,
        tipo: trx.tipo,
        descricao: trx.descricao,
        realizada_em: trx.realizada_em,
      })),
    };
  }

  async createTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const client = await this.pool.connect();

    const {
      rows: [customer],
    } = await client.query<Customer>(
      `
      SELECT c.id, c.nome, c.limite, s.valor AS saldo
			FROM clientes c
			INNER JOIN saldos s ON c.id = s.cliente_id
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
        SELECT id, cliente_id, valor
        FROM saldos
        WHERE cliente_id = $1
        FOR UPDATE
        `,
        [customerId],
      );

      let balance = customerBalnce.valor;

      if (input.tipo === TransactionTypeEnum.CREDIT) {
        balance += input.valor;
      }
      if (input.tipo === TransactionTypeEnum.DEBIT) {
        balance -= input.valor;
      }
      if (customer.limite + balance < 0) {
        throw new UnprocessableEntityException(
          'Cliente does not have enough limit',
        );
      }

      await client.query(`UPDATE saldos SET valor = $1 WHERE cliente_id = $2`, [
        balance,
        customerId,
      ]);

      await client.query(
        `INSERT INTO transacoes (cliente_id, valor, tipo, descricao, realizada_em) VALUES ($1, $2, $3, $4, $5)`,
        [customerId, input.valor, input.tipo, input.descricao, new Date()],
      );

      await client.query('COMMIT');

      return {
        limite: customer.limite,
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
