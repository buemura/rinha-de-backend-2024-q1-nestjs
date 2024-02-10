import {
  Injectable,
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
    const {
      rows: [customer],
    } = await this.pool.query<Customer>(
      `
      SELECT c.id, c.nome, c.limite, s.valor AS saldo
			FROM clientes c
			INNER JOIN saldos s ON c.id = s.cliente_id
			WHERE c.id = $1
      `,
      [customerId],
    );

    if (!customer) throw new NotFoundException('Cliente not found');

    const balance =
      input.tipo === TransactionTypeEnum.DEBIT
        ? this.debitTransaction(input.valor, customer.saldo, customer.limite)
        : this.creditTransaction(input.valor, customer.saldo);

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO transacoes (cliente_id, valor, tipo, descricao, realizada_em) VALUES (${customerId}, ${
          input.valor
        }, ${input.tipo}, ${input.descricao}, ${new Date()})`,
      );
      await tx.execute(
        sql`UPDATE saldos SET valor = ${balance} WHERE cliente_id = ${customerId}`,
      );
    });

    return {
      limite: customer.limite,
      saldo: balance,
    };
  }

  private creditTransaction(
    transactionAmount: number,
    customerBalance: number,
  ): number {
    return customerBalance + transactionAmount;
  }

  private debitTransaction(
    transactionAmount: number,
    customerBalance: number,
    customerLimit: number,
  ): number {
    if ((customerBalance - transactionAmount) * -1 > customerLimit) {
      throw new UnprocessableEntityException(
        'Cliente does not have enough limit',
      );
    }

    return customerBalance - transactionAmount;
  }
}
