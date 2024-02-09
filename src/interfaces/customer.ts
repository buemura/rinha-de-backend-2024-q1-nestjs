import { TransactionTypeEnum } from 'src/enums/transaction-type.enum';

export interface CustomerBalance {
  id: number;
  cliente_id: number;
  valor: number;
  nome: string;
  limite: number;
}

export interface CustomerStatement {
  total: number;
  limite: number;
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}
