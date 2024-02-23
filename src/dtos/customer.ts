import { TransactionTypeEnum } from '../enums';

export class Customer {
  id: number;
  account_limit: number;
  account_balance: number;
}

export class CustomerStatement {
  total: number;
  limite: number;
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}
