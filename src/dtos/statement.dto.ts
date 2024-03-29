import { TransactionTypeEnum } from '../enums';

class Balance {
  total: number;
  data_extrato: Date;
  limite: number;
}

export class StatementTransactionsReponseDto {
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}

export class StatementResponseDto {
  saldo: Balance;
  ultimas_transacoes: StatementTransactionsReponseDto[];
}
