import { Rule } from '../types/code-of-conduct';

export const rules = {
  AN01: {
    rule: 'Não responder documentos internos ou respondê-los fora do prazo',
    type: 'leve'
  },
  AN02: {
    rule: 'Uso indiscriminado de aparelhos eletrônicos ou outro material que tire a atenção individual ou alheia durante qualquer reunião interna',
    type: 'leve'
  },
  AN03: {
    rule: 'Perturbar a paz dentro do ambiente de trabalho',
    type: 'leve'
  },
  AN04: {
    rule: 'Chegar após o tempo de tolerância de 15 minutos em qualquer atividadere ferente à empresa',
    type: 'leve'
  },
  AN05: {
    rule: 'Não buscar informar-se das decisões tomadas nas reuniões faltadas',
    type: 'leve'
  },
  AN06: {
    rule: 'Desarrumar e não reorganizar o ambiente da sala no seu expediente',
    type: 'leve'
  },
  AN07: {
    rule: 'Sair antes do horário previsto em reuniões e/ou não completar atividades ou rotina de sala sem justificativa prévia',
    type: 'leve'
  },
  AN08: {
    rule: 'Consumir alimentos dentro do ambiente de trabalho',
    type: 'leve'
  },
  AN09: {
    rule: 'Utilizar vestimentas inadequadas no ambiente de trabalho',
    type: 'leve'
  },
  AN10: {
    rule: 'Linguagem inapropriada/ofensiva ou difamação ao companheiro no ambiente de trabalho',
    type: 'moderada'
  },
  AN11: {
    rule: 'Não comparecer a alguma atividade referente à empresa com justificativas não aceitas, ou não justificadas',
    type: 'moderada'
  },
  AN12: {
    rule: 'Fazer mal-uso de todo material e espaço físico pertencente à empresa',
    type: 'moderada'
  },
  AN13: {
    rule: 'Não cumprir a rotina de sala sem justificativa prévia',
    type: 'moderada'
  },
  AN14: {
    rule: 'Retirar ou liberar a retirada de material da empresa e não comunicar aos responsáveis pelo controle desses materiais',
    type: 'moderada'
  },
  AN15: {
    rule: 'Não entregar tarefa por irresponsabilidade ou entregá-la malfeita',
    type: 'moderada'
  },
  AN16: {
    rule: 'Faltas em reuniões gerais e setoriais',
    type: 'moderada'
  },
  AN17: {
    rule: 'Falsificar assinaturas em atas de qualquer evento relacionado à Watt',
    type: 'grave'
  },
  AN18: {
    rule: 'Atrapalhar, intencionalmente ou por irresponsabilidade, de alguma forma a realização das atividades da empresa',
    type: 'grave'
  },
  AN19: {
    rule: 'Se atrasar mais que 15 minutos em compromissos com clientes e parceiros da Watt',
    type: 'grave'
  },
  AN20: {
    rule: 'Desrespeitar a hierarquia da empresa',
    type: 'grave'
  },
  AN21: {
    rule: 'Utilizar o uniforme da empresa para realizar atividades pessoais que possam de alguma forma denegrir a imagem da mesma, mediante prova',
    type: 'grave'
  },
  AN22: {
    rule: 'Utilizar uniforme inapropriado em visitas presenciais ao cliente',
    type: 'grave'
  },
  AN23: {
    rule: 'Compartilhar documentos da empresa com não membros sem autorização da diretoria',
    type: 'desligamento'
  },
  AN24: {
    rule: 'Mentir ou omitir (comprovadamente) para a diretoria para ganhar tempo, vantagem ou evitar punição',
    type: 'desligamento'
  },
  AN25: {
    rule: 'Assédio de qualquer natureza com um companheiro de trabalho',
    type: 'desligamento'
  },
  AN26: {
    rule: 'Atrapalhar intencionalmente de alguma forma a realização das atividades da empresa',
    type: 'desligamento'
  },
  AN27: {
    rule: 'Discriminar pessoas por cor/raça, etnia, sexo, idade, origem regional, condição econômica, social, condição física ou mental, orientação política, religiosa ou sexual ou por qualquer outra condição.',
    type: 'desligamento'
  },
  AN28: {
    rule: 'Trabalhar sob efeito de álcool ou drogas ilícitas',
    type: 'desligamento'
  },
  AN29: {
    rule: 'Furtar material da empresa (inclui dinheiro)',
    type: 'desligamento'
  },
  AN30: {
    rule: 'Agredir fisicamente qualquer indivíduo quando estiver em serviço ou dentro do ambiente da empresa',
    type: 'desligamento'
  },
  AN31: {
    rule: 'Abandonar um projeto em andamento',
    type: 'desligamento'
  }
} satisfies Record<string, Rule>;

export type RuleCode = keyof typeof rules;
