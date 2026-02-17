export type Rule = {
  rule: string;
  type: RuleType;
};

export type RuleType = 'leve' | 'moderada' | 'grave' | 'desligamento';

export type RuleCode =
  | 'AN01'
  | 'AN02'
  | 'AN03'
  | 'AN04'
  | 'AN05'
  | 'AN06'
  | 'AN07'
  | 'AN08'
  | 'AN09'
  | 'AN10'
  | 'AN11'
  | 'AN12'
  | 'AN13'
  | 'AN14'
  | 'AN15'
  | 'AN16'
  | 'AN17'
  | 'AN18'
  | 'AN19'
  | 'AN20'
  | 'AN21'
  | 'AN22'
  | 'AN23'
  | 'AN24'
  | 'AN25'
  | 'AN26'
  | 'AN27'
  | 'AN28'
  | 'AN29'
  | 'AN30'
  | 'AN31';
