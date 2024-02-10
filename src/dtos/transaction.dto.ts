import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TransactionTypeEnum } from 'src/enums/transaction-type.enum';

export class Transaction {
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}

export class CreateTransactionRequestDto {
  @IsNotEmpty()
  @IsInt()
  valor: number;

  @IsNotEmpty()
  @IsEnum(TransactionTypeEnum)
  tipo: TransactionTypeEnum;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  descricao: string;
}

export class CreateTransactionResponseDto {
  limite: number;
  saldo: number;
}
