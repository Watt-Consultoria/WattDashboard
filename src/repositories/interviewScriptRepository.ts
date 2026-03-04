import type IInterviewScriptRepository from '@/types/interview/interview-script';
import type { InterviewQuestion } from '@/types/interview/interview-script';

/**
 * Repositório estático do roteiro de entrevista da Watt Consultoria.
 *
 * Responsabilidade única: fornecer os dados brutos das perguntas.
 * Nenhuma regra de negócio deve residir aqui.
 */
class InterviewScriptRepository implements IInterviewScriptRepository {
  private readonly questions: InterviewQuestion[] = [
    // ── APRESENTAÇÃO DO CANDIDATO ───────────────────────────────────────────
    {
      id: 'q-01',
      section: 'APRESENTAÇÃO DO CANDIDATO',
      order: 1,
      question: 'Poderia se apresentar e me contar um pouco sobre você?',
      tipsForInterviewer: [
        'Deixe o candidato começar de forma livre e observe o que ele escolhe destacar primeiro.',
        'Perceba clareza, espontaneidade e segurança ao falar de si.',
        'Use essa resposta como base para comparar coerência com o restante da entrevista.'
      ],
      whatToObserve:
        'Comunicação inicial, autopercepção, clareza de apresentação e postura.',
      exampleFollowUps: [
        'O que você considera mais marcante na sua trajetória até aqui?',
        'Que experiências mais te formaram até agora?'
      ]
    },

    // ── DINÂMICA BREVE ──────────────────────────────────────────────────────
    {
      id: 'q-02',
      section: 'DINÂMICA BREVE',
      order: 2,
      question:
        'Me diga um personagem com o qual você se identifica. Por que você se identifica com ele? Quais são suas principais características?',
      tipsForInterviewer: [
        'Observe se a escolha faz sentido com a justificativa apresentada.',
        'Avalie a facilidade do candidato em traduzir traços abstratos em características concretas.',
        'Perceba se ele consegue se expressar com clareza e espontaneidade.'
      ],
      whatToObserve:
        'Comunicação clara e assertiva, autoconhecimento e capacidade de associação.',
      exampleFollowUps: [
        'Em que situações essas características aparecem em você?',
        'Tem alguma dessas características que você considera mais forte hoje?'
      ]
    },

    // ── PERFIL DO CANDIDATO ────────────────────────────────────────────────
    {
      id: 'q-03',
      section: 'PERFIL DO CANDIDATO',
      order: 3,
      question:
        'Qual é a sua familiaridade com o meio empresarial? Você já trabalhou antes?',
      tipsForInterviewer: [
        'Entenda se a vivência vem de estágio, empresa júnior, projeto, negócio próprio ou outro contexto.',
        'Caso não tenha experiência formal, observe como ele construiu repertório mesmo assim.',
        'Avalie maturidade ao falar de experiências e aprendizados.'
      ],
      whatToObserve:
        'Responsabilidade, repertório profissional e familiaridade com contextos organizacionais.',
      exampleFollowUps: [
        'O que você aprendeu com essa experiência?',
        'Como essa vivência influenciou sua forma de trabalhar?'
      ]
    },
    {
      id: 'q-04',
      section: 'PERFIL DO CANDIDATO',
      order: 4,
      question: 'Qual sua(s) área(s) de interesse dentro do seu curso?',
      tipsForInterviewer: [
        'Observe se o candidato já demonstra algum direcionamento ou curiosidade genuína.',
        'Avalie se ele consegue explicar o porquê do interesse, e não apenas citar áreas.',
        'Perceba o nível de reflexão sobre a própria formação.'
      ],
      whatToObserve:
        'Interesses acadêmicos, maturidade de escolha e potencial de conexão com a empresa.',
      exampleFollowUps: [
        'O que te atrai nessas áreas especificamente?',
        'Você já buscou algo prático relacionado a isso?'
      ]
    },
    {
      id: 'q-05',
      section: 'PERFIL DO CANDIDATO',
      order: 5,
      question:
        'Como você costuma trabalhar/estudar? Por qual motivo você utiliza esse(s) método(s)?',
      tipsForInterviewer: [
        'Peça exemplos concretos de rotina, ferramentas ou estratégias usadas.',
        'Observe se o método faz sentido com os resultados que ele busca.',
        'Perceba se há consciência sobre o próprio funcionamento.'
      ],
      whatToObserve:
        'Organização pessoal, autoconhecimento operacional e disciplina.',
      exampleFollowUps: [
        'Esse método funciona bem em grupo também?',
        'Você já precisou adaptar sua forma de estudar ou trabalhar?'
      ]
    },
    {
      id: 'q-06',
      section: 'PERFIL DO CANDIDATO',
      order: 6,
      question:
        'Como você lida com prazos atualmente? Utiliza alguma ferramenta de gestão de tempo, como Google Agenda, planner físico ou estratégias próprias?',
      tipsForInterviewer: [
        'Observe se existe método real de organização ou apenas intenção.',
        'Respostas com exemplos concretos tendem a revelar maior maturidade.',
        'Avalie também a capacidade de priorização.'
      ],
      whatToObserve:
        'Planejamento, organização, responsabilidade com entregas e gestão do tempo.',
      exampleFollowUps: [
        'O que você faz quando percebe que não vai conseguir cumprir um prazo?',
        'Qual ferramenta ou estratégia mais funciona para você hoje?'
      ]
    },

    // ── WATT ────────────────────────────────────────────────────────────────
    {
      id: 'q-07',
      section: 'WATT',
      order: 7,
      question:
        'O que te motivou a escolher a Watt dentre tantas opções disponíveis de EJs, atividades de extensão e outros?',
      tipsForInterviewer: [
        'Observe se existe motivação genuína ou resposta muito genérica.',
        'Perceba se o candidato conhece minimamente a empresa.',
        'Aprofunde se ele trouxer respostas vagas como “aprender” ou “crescer”.'
      ],
      whatToObserve:
        'Motivação, alinhamento com a empresa e clareza de escolha.',
      exampleFollowUps: [
        'O que chamou mais sua atenção na Watt?',
        'Houve algo específico que te fez se inscrever?'
      ]
    },
    {
      id: 'q-08',
      section: 'WATT',
      order: 8,
      question:
        'O que te motivaria a continuar trabalhando diariamente mesmo sem um incentivo financeiro?',
      tipsForInterviewer: [
        'Avalie motivação intrínseca, propósito e visão de desenvolvimento.',
        'Observe se a resposta vai além de frases prontas.',
        'Perceba se ele entende a lógica de empresa júnior.'
      ],
      whatToObserve: 'Comprometimento, propósito e motivação não financeira.',
      exampleFollowUps: [
        'Você já viveu alguma experiência parecida sem remuneração?',
        'O que mais te engaja em um ambiente de trabalho?'
      ]
    },
    {
      id: 'q-09',
      section: 'WATT',
      order: 9,
      question:
        'Quais são as suas expectativas em relação à Watt? O que você espera vivenciar aqui?',
      tipsForInterviewer: [
        'Observe se as expectativas são realistas e compatíveis com o que a empresa oferece.',
        'Atenção a idealizações excessivas ou respostas muito amplas.',
        'Use a resposta para medir alinhamento.'
      ],
      whatToObserve:
        'Alinhamento de expectativas, maturidade profissional e visão sobre a experiência.',
      exampleFollowUps: [
        'O que você espera aprender nos primeiros meses?',
        'Que tipo de desafio você gostaria de viver aqui?'
      ]
    },
    {
      id: 'q-10',
      section: 'WATT',
      order: 10,
      question:
        'De que forma você acredita que pode contribuir com a Watt a partir dos seus conhecimentos acadêmicos?',
      tipsForInterviewer: [
        'Observe se o candidato consegue transformar conhecimento em contribuição prática.',
        'Não espere domínio técnico completo; avalie potencial e clareza de raciocínio.',
        'Perceba se ele tem noção de valor agregado.'
      ],
      whatToObserve:
        'Conhecimento técnico, proatividade intelectual e noção de contribuição.',
      exampleFollowUps: [
        'Tem algum conteúdo ou habilidade que você acredita que pode aplicar logo no início?',
        'Como isso poderia gerar valor para a equipe?'
      ]
    },
    {
      id: 'q-11',
      section: 'WATT',
      order: 11,
      question:
        'Com qual perfil profissional você se imagina quando estiver saindo da Watt?',
      tipsForInterviewer: [
        'Observe visão de futuro e nível de reflexão sobre desenvolvimento profissional.',
        'A resposta não precisa ser fechada, mas deve mostrar direção.',
        'Veja se a expectativa combina com a proposta da empresa.'
      ],
      whatToObserve:
        'Visão de futuro, ambição saudável e intenção de desenvolvimento.',
      exampleFollowUps: [
        'Que competências você espera ter desenvolvido até lá?',
        'Como a Watt entra nessa construção?'
      ]
    },
    {
      id: 'q-12',
      section: 'WATT',
      order: 12,
      question:
        'De que modo você pretende aplicar os conhecimentos adquiridos na Watt futuramente em um outro contexto de atuação?',
      tipsForInterviewer: [
        'Observe se o candidato enxerga transferência de aprendizado para outros cenários.',
        'Perceba se há maturidade para conectar presente e futuro.',
        'A resposta ajuda a entender o valor que ele atribui à experiência.'
      ],
      whatToObserve:
        'Visão estratégica de aprendizado e capacidade de extrapolar experiências.',
      exampleFollowUps: [
        'Em que contexto futuro você imagina usar esse aprendizado?',
        'Que tipo de crescimento você espera levar para depois da Watt?'
      ]
    },
    {
      id: 'q-13',
      section: 'WATT',
      order: 13,
      question:
        'Como você se vê contribuindo para a equipe, caso seja selecionado?',
      tipsForInterviewer: [
        'Observe se a resposta considera time, rotina e colaboração, e não apenas desempenho individual.',
        'Avalie segurança ao falar do que pode entregar.',
        'Procure coerência com o restante da entrevista.'
      ],
      whatToObserve:
        'Espírito de equipe, noção de contribuição prática e confiança.',
      exampleFollowUps: [
        'O que você acredita que conseguiria agregar já no começo?',
        'Como você costuma colaborar em grupo?'
      ]
    },

    // ── COMPETÊNCIAS E HABILIDADES ─────────────────────────────────────────
    {
      id: 'q-14',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 14,
      question:
        'Conte sobre uma situação em que você percebeu algo que precisava ser feito, mas que não era sua responsabilidade direta. O que você fez?',
      tipsForInterviewer: [
        'Busque entender se houve iniciativa real ou apenas opinião.',
        'Observe se o candidato agiu com senso de dono, responsabilidade e maturidade.',
        'Aprofunde em contexto, ação e resultado.'
      ],
      whatToObserve: 'Proatividade, senso de responsabilidade e iniciativa.',
      exampleFollowUps: [
        'O que te levou a agir naquela situação?',
        'Qual foi o resultado da sua atitude?'
      ]
    },
    {
      id: 'q-15',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 15,
      question:
        'Você já precisou dar uma notícia difícil ou feedback para alguém? Como foi a conversa?',
      tipsForInterviewer: [
        'Observe equilíbrio entre empatia e firmeza.',
        'Perceba se houve preocupação com a forma e com o impacto da mensagem.',
        'Busque exemplos concretos, não respostas hipotéticas.'
      ],
      whatToObserve:
        'Clareza, empatia, assertividade e maturidade na comunicação.',
      exampleFollowUps: [
        'Como a pessoa reagiu?',
        'Se tivesse que repetir essa conversa hoje, faria algo diferente?'
      ]
    },
    {
      id: 'q-16',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 16,
      question:
        'Já aconteceu de você ter que cumprir uma tarefa ou entregar um resultado mesmo quando estava com outras prioridades pessoais ou se sentindo desmotivado? Como você lidou com isso?',
      tipsForInterviewer: [
        'Observe se o candidato demonstra disciplina mesmo em cenários desfavoráveis.',
        'Avalie como ele organiza energia, prioridades e compromisso.',
        'Respostas maduras costumam incluir responsabilidade e comunicação.'
      ],
      whatToObserve:
        'Responsabilidade, comprometimento, resiliência e disciplina.',
      exampleFollowUps: [
        'O que te ajudou a manter a entrega?',
        'Você pediu ajuda ou reorganizou algo para conseguir cumprir?'
      ]
    },
    {
      id: 'q-17',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 17,
      question:
        'Me fale sobre um projeto em grupo que teve bons resultados. O que você acha que contribuiu para isso?',
      tipsForInterviewer: [
        'Observe se ele reconhece o papel do coletivo e o próprio papel dentro dele.',
        'Perceba se ele valoriza comunicação, divisão de tarefas e confiança.',
        'Aprofunde sobre o que efetivamente fez diferença no resultado.'
      ],
      whatToObserve:
        'Trabalho em equipe, colaboração e leitura de dinâmica coletiva.',
      exampleFollowUps: [
        'Qual foi seu papel nesse grupo?',
        'O que você acha que mais fortaleceu esse time?'
      ]
    },
    {
      id: 'q-18',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 18,
      question:
        'Conte sobre uma situação em que um grupo ou equipe estava sem direção clara ou desmotivado. O que você fez nessa situação?',
      tipsForInterviewer: [
        'Observe se houve iniciativa prática ou apenas percepção do problema.',
        'Liderança pode aparecer sem cargo formal; avalie influência e postura.',
        'Entenda como ele mobilizou pessoas ou ajudou a reorganizar o contexto.'
      ],
      whatToObserve: 'Liderança, iniciativa e capacidade de mobilizar pessoas.',
      exampleFollowUps: [
        'Como as pessoas reagiram à sua postura?',
        'O que você faria de diferente hoje?'
      ]
    },
    {
      id: 'q-19',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 19,
      question:
        'Como você costuma organizar seu tempo quando tem várias tarefas ou prazos para cumprir?',
      tipsForInterviewer: [
        'Observe se o candidato possui método prático de priorização.',
        'Peça exemplos de ferramentas, rotinas ou critérios de decisão.',
        'Perceba se ele sabe equilibrar urgência, importância e comunicação.'
      ],
      whatToObserve:
        'Planejamento, organização, priorização e gestão do tempo.',
      exampleFollowUps: [
        'Como você define o que vem primeiro?',
        'O que faz quando tudo parece urgente?'
      ]
    },
    {
      id: 'q-20',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 20,
      question:
        'Conte sobre uma situação em que você teve que mudar seu plano ou se adaptar rapidamente a uma mudança inesperada.',
      tipsForInterviewer: [
        'Observe se a adaptação foi apenas reativa ou também estratégica.',
        'Perceba como o candidato lida com frustração e mudança de rota.',
        'Busque clareza entre contexto, ação e resultado.'
      ],
      whatToObserve:
        'Adaptabilidade, flexibilidade e capacidade de resposta diante de mudanças.',
      exampleFollowUps: [
        'O que foi mais difícil nessa adaptação?',
        'Como você decidiu o que fazer depois da mudança?'
      ]
    },
    {
      id: 'q-21',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 21,
      question:
        'Você já se deparou com um problema inesperado no meio de uma tarefa ou projeto, e não havia ninguém por perto para ajudar de imediato? O que você fez para lidar com a situação?',
      tipsForInterviewer: [
        'Observe o raciocínio do candidato diante da incerteza.',
        'Avalie se ele tentou entender o problema, testar caminhos e agir com autonomia.',
        'Mais importante que “acertar” é mostrar processo de resolução.'
      ],
      whatToObserve:
        'Resolução de problemas, autonomia e capacidade analítica.',
      exampleFollowUps: [
        'Qual foi seu primeiro passo diante do problema?',
        'Como você avaliou se a solução estava funcionando?'
      ]
    },
    {
      id: 'q-22',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 22,
      question:
        'Você já presenciou ou vivenciou uma situação em que algo parecia errado ou injusto? Como você reagiu?',
      tipsForInterviewer: [
        'Observe senso ético, respeito e coragem para se posicionar.',
        'Perceba se o candidato consegue equilibrar firmeza com responsabilidade.',
        'A resposta pode revelar valores muito importantes para a cultura.'
      ],
      whatToObserve:
        'Ética, respeito, senso de justiça e postura diante de situações sensíveis.',
      exampleFollowUps: [
        'O que guiou sua decisão naquela situação?',
        'Você faria algo diferente hoje?'
      ]
    },
    {
      id: 'q-23',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 23,
      question:
        'Quando você está diante de uma tarefa desafiadora, como você lida com a insegurança ou pressão para entregar um bom resultado?',
      tipsForInterviewer: [
        'Observe se o candidato reconhece a pressão sem se paralisar por ela.',
        'Perceba estratégias de autorregulação, preparação e busca de apoio.',
        'A resposta ajuda a medir confiança e maturidade.'
      ],
      whatToObserve:
        'Confiança, controle emocional e postura diante de desafios.',
      exampleFollowUps: [
        'O que normalmente te ajuda a ganhar segurança?',
        'Você costuma pedir ajuda ou prefere tentar primeiro sozinho?'
      ]
    },
    {
      id: 'q-24',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 24,
      question:
        'Você já usou um conhecimento técnico que aprendeu fora do ambiente de trabalho, como em curso, projeto pessoal ou hobby, para resolver uma situação profissional? Como isso aconteceu?',
      tipsForInterviewer: [
        'Observe capacidade de transferir aprendizado entre contextos.',
        'Não avalie apenas profundidade técnica, mas aplicação prática do conhecimento.',
        'Peça detalhes para entender o raciocínio.'
      ],
      whatToObserve:
        'Conhecimento técnico, curiosidade, aprendizado aplicado e repertório prático.',
      exampleFollowUps: [
        'Como você aprendeu esse conhecimento?',
        'Qual foi o impacto de aplicar isso na prática?'
      ]
    },
    {
      id: 'q-25',
      section: 'COMPETÊNCIAS E HABILIDADES',
      order: 25,
      question:
        'Por último... Por que a Watt não deveria te escolher como novo membro?',
      tipsForInterviewer: [
        'Observe honestidade, maturidade e nível de autocrítica.',
        'Atenção a respostas que tentam apenas transformar fraqueza em propaganda.',
        'O ideal é que ele reconheça limitações sem se desqualificar completamente.'
      ],
      whatToObserve:
        'Capacidade autocrítica, autenticidade e equilíbrio entre humildade e confiança.',
      exampleFollowUps: [
        'E o que você faria para melhorar esse ponto?',
        'Por outro lado, por que deveria ser escolhido?'
      ]
    },

    // ── DISPONIBILIDADE DO CANDIDATO ───────────────────────────────────────
    {
      id: 'q-26',
      section: 'DISPONIBILIDADE DO CANDIDATO',
      order: 26,
      question:
        'Quais são seus principais compromissos fora desta possível função? Qual a carga horária de cada um?',
      tipsForInterviewer: [
        'Mapeie rotina real e consistência da disponibilidade apresentada.',
        'Observe se o candidato consegue dimensionar o próprio tempo com clareza.',
        'Essa pergunta é importante para alinhamento prático.'
      ],
      whatToObserve:
        'Disponibilidade real, organização de rotina e transparência.',
      exampleFollowUps: [
        'Quais desses compromissos são fixos e quais variam?',
        'Como você costuma se organizar com eles ao longo da semana?'
      ]
    },
    {
      id: 'q-27',
      section: 'DISPONIBILIDADE DO CANDIDATO',
      order: 27,
      question:
        'Você acredita que esses compromissos podem interferir na sua dedicação a esta vaga?',
      tipsForInterviewer: [
        'Observe honestidade e maturidade para reconhecer possíveis conflitos.',
        'A resposta não precisa ser “não”; o mais importante é a consciência e a gestão.',
        'Procure entender se existe plano para conciliar.'
      ],
      whatToObserve:
        'Comprometimento, realismo e capacidade de conciliar demandas.',
      exampleFollowUps: [
        'Como você lidaria caso surgisse conflito de agenda?',
        'Já passou por algo parecido antes?'
      ]
    },

    // ── DÚVIDAS DO CANDIDATO ───────────────────────────────────────────────
    {
      id: 'q-28',
      section: 'DÚVIDAS DO CANDIDATO',
      order: 28,
      question:
        'Você gostaria de fazer alguma pergunta sobre a vaga, a equipe ou a empresa?',
      tipsForInterviewer: [
        'Observe o tipo de dúvida levantada: isso revela interesse, preparo e prioridades.',
        'Mesmo se a pessoa disser que não tem perguntas, note a naturalidade dessa resposta.',
        'Use esse momento também para fechar a entrevista com acolhimento.'
      ],
      whatToObserve:
        'Interesse, preparação, curiosidade e engajamento com a oportunidade.',
      exampleFollowUps: [
        'Tem algo sobre rotina, desenvolvimento ou cultura que você gostaria de entender melhor?'
      ]
    },
    {
      id: 'q-29',
      section: 'DÚVIDAS DO CANDIDATO',
      order: 29,
      question: 'Tem algo que você gostaria de acrescentar ou destacar?',
      tipsForInterviewer: [
        'Dê espaço para o candidato trazer algo que não apareceu naturalmente.',
        'Esse momento costuma revelar prioridades pessoais ou mensagens finais importantes.',
        'Observe também a capacidade de síntese no encerramento.'
      ],
      whatToObserve:
        'Capacidade de fechamento, senso de prioridade e expressão final do candidato.',
      exampleFollowUps: [
        'Existe algum ponto da sua trajetória que você considera importante reforçar?',
        'Tem algo que você sente que ainda não conseguiu mostrar na entrevista?'
      ]
    }
  ];

  getAllQuestions(): InterviewQuestion[] {
    return this.questions;
  }
}

const interviewScriptRepository = new InterviewScriptRepository();
export default interviewScriptRepository;
