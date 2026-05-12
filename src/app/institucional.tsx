'use client';

import Link from 'next/link';
import Image from 'next/image';
import useMetadata from '../hooks/use-metadata';
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  CircuitBoard,
  Handshake,
  Lightbulb,
  LineChart,
  PlugZap,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Target,
  UsersRound,
  Wrench
} from 'lucide-react';

const values = [
  {
    title: 'Compromisso',
    description:
      'Entregamos cada projeto com responsabilidade, organiza\u00e7\u00e3o e aten\u00e7\u00e3o aos detalhes.',
    icon: ShieldCheck
  },
  {
    title: 'Inova\u00e7\u00e3o',
    description:
      'Buscamos solu\u00e7\u00f5es criativas, modernas e alinhadas \u00e0s necessidades de cada cliente.',
    icon: Lightbulb
  },
  {
    title: 'Qualidade',
    description:
      'Prezamos por entregas bem estruturadas, confi\u00e1veis e tecnicamente embasadas.',
    icon: BadgeCheck
  },
  {
    title: 'Proximidade',
    description:
      'Trabalhamos lado a lado com o cliente durante toda a jornada do projeto.',
    icon: Handshake
  },
  {
    title: 'Impacto',
    description:
      'Queremos que cada solu\u00e7\u00e3o gere resultado pr\u00e1tico, mensur\u00e1vel e duradouro.',
    icon: Target
  }
];

const services = [
  {
    title: 'Automa\u00e7\u00e3o e Sistemas Supervis\u00f3rios',
    description:
      'Desenvolvimento de solu\u00e7\u00f5es para monitoramento, controle e otimiza\u00e7\u00e3o de processos.',
    icon: CircuitBoard
  },
  {
    title: 'Projetos El\u00e9tricos',
    description:
      'Elabora\u00e7\u00e3o de projetos t\u00e9cnicos voltados para seguran\u00e7a, efici\u00eancia e conformidade.',
    icon: PlugZap
  },
  {
    title: 'Efici\u00eancia Energ\u00e9tica',
    description:
      'An\u00e1lise de consumo, identifica\u00e7\u00e3o de oportunidades de economia e propostas de melhoria.',
    icon: LineChart
  },
  {
    title: 'Energia Solar',
    description:
      'Estudos, dimensionamentos e solu\u00e7\u00f5es voltadas para gera\u00e7\u00e3o fotovoltaica.',
    icon: SunMedium
  },
  {
    title: 'Consultoria T\u00e9cnica Personalizada',
    description:
      'Desenvolvimento de solu\u00e7\u00f5es sob medida para demandas espec\u00edficas de cada cliente.',
    icon: Wrench
  },
  {
    title: 'Conforto e Seguran\u00e7a',
    description:
      'Inspe\u00e7\u00f5es, laudos e solu\u00e7\u00f5es el\u00e9tricas para ambientes mais seguros e regularizados.',
    icon: ShieldCheck
  }
];

const gallery = [
  'Equipe Watt Consultoria',
  'Projetos em desenvolvimento',
  'Reuni\u00f5es com clientes',
  'Bastidores da empresa'
];

const differentiators = [
  'Atendimento pr\u00f3ximo e personalizado.',
  'Solu\u00e7\u00f5es com excelente custo-benef\u00edcio.',
  'Equipe multidisciplinar e em constante capacita\u00e7\u00e3o.',
  'Apoio t\u00e9cnico e orienta\u00e7\u00e3o acad\u00eamica.',
  'Compromisso com resultados e melhoria cont\u00ednua.'
];

const partners = [
  { name: 'Galva', src: '/images/homepage/parceiros/galva.png' },
  { name: 'KVAR', src: '/images/homepage/parceiros/kvar.png' },
  { name: 'Santana', src: '/images/homepage/parceiros/santana.png' },
  { name: 'XPE', src: '/images/homepage/parceiros/xpe.png' }
];

function PlaceholderImage({
  label,
  className = ''
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-lg border border-white/30 bg-[#23242d] shadow-2xl ${className}`}
      aria-label={label}
    >
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(10,146,236,0.62),transparent_30%),linear-gradient(135deg,rgba(35,36,45,0.98),rgba(10,146,236,0.9)_55%,rgba(255,255,255,0.85))]' />
      <div className='absolute inset-0 [background-image:linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:36px_36px] opacity-30' />
      <div className='absolute right-0 bottom-0 left-0 h-1/2 bg-gradient-to-t from-[#23242d]/85 to-transparent' />
      <div className='relative flex h-full min-h-[260px] flex-col justify-end p-6 text-white'>
        <div className='mb-4 flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur'>
          <Sparkles className='size-3.5 text-white' />
          Imagem tempor&aacute;ria
        </div>
        <p className='max-w-sm text-xl font-semibold'>{label}</p>
      </div>
    </div>
  );
}

export default function Institucional() {
  useMetadata({ title: 'Watt' });

  return (
    <main className='h-screen overflow-y-auto scroll-smooth bg-[#f5f8fb] text-[#23242d] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      <header className='sticky top-0 z-30 border-b border-[#23242d]/10 bg-white/90 backdrop-blur-xl'>
        <nav className='mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8'>
          <Link href='/' className='flex items-center gap-3'>
            <span className='flex h-8 w-10 items-center justify-center overflow-hidden'>
              <Image
                src='/logo_preto.png'
                alt='Logo da Watt Consultoria'
                width={618}
                height={419}
                className='h-6 w-auto object-contain'
                priority
              />
            </span>
            <span className='text-lg font-bold tracking-tight'>
              Watt Consultoria
            </span>
          </Link>
          <div className='hidden items-center gap-7 text-sm font-medium text-[#23242d]/70 md:flex'>
            <a href='#sobre' className='hover:text-[#0a92ec]'>
              Sobre
            </a>
            <a href='#servicos' className='hover:text-[#0a92ec]'>
              Servi&ccedil;os
            </a>
            <a href='#diferenciais' className='hover:text-[#0a92ec]'>
              Diferenciais
            </a>
            <a href='#parceiros' className='hover:text-[#0a92ec]'>
              Parceiros
            </a>
            <a href='#contato' className='hover:text-[#0a92ec]'>
              Contato
            </a>
          </div>
          <Link
            href='https://wa.me/5581996373427?text=Ol%C3%A1%20*Watt%20Consultoria*!%20Gostaria%20de%20conversar%20com%20voc%C3%AAs%20sobre'
            className='rounded-md bg-[#0a92ec] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0a92ec]/20 transition hover:bg-[#087fce]'
          >
            Fale conosco
          </Link>
        </nav>
      </header>

      <section className='relative overflow-hidden bg-white'>
        <div className='absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0a92ec]/12 to-transparent' />
        <div className='mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16'>
          <div className='relative z-10'>
            <h1 className='max-w-3xl text-4xl leading-tight font-black tracking-tight text-[#23242d] sm:text-5xl lg:text-[56px]'>
              Transformamos desafios em solu&ccedil;&otilde;es de engenharia.
            </h1>
            <p className='mt-5 max-w-xl text-base leading-7 text-[#23242d]/72 sm:text-lg'>
              Empresa J&uacute;nior da UFPE que une viv&ecirc;ncia em
              engenharia, inova&ccedil;&atilde;o e compromisso para entregar
              projetos com resultado real.
            </p>
            <div className='mt-7 flex flex-col gap-3 sm:flex-row'>
              <Link
                href='https://wa.me/5581996373427?text=Ol%C3%A1%20*Watt%20Consultoria*!%20Gostaria%20de%20conversar%20com%20voc%C3%AAs%20sobre'
                className='inline-flex items-center justify-center gap-2 rounded-md bg-[#0a92ec] px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-[#0a92ec]/25 transition hover:bg-[#087fce]'
              >
                Fale conosco
                <ArrowRight className='size-4' />
              </Link>
              <Link
                href='#servicos'
                className='inline-flex items-center justify-center rounded-md border border-[#23242d]/20 bg-white px-5 py-3 text-sm font-bold text-[#23242d] transition hover:border-[#0a92ec] hover:text-[#0a92ec]'
              >
                Ver servi&ccedil;os
              </Link>
            </div>
          </div>
          <div className='relative h-56 overflow-hidden rounded-lg border border-[#23242d]/10 bg-white shadow-2xl sm:h-72 lg:h-[min(52vh,420px)]'>
            <Image
              src='/images/homepage/imagem02.jpg'
              alt='Solu\u00e7\u00f5es t\u00e9cnicas, estrat\u00e9gicas e personalizadas'
              fill
              sizes='(min-width: 1024px) 48vw, 100vw'
              className='object-cover'
              priority
            />
          </div>
        </div>
      </section>

      <section id='sobre' className='bg-[#f5f8fb] py-16'>
        <div className='mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-8'>
          <div className='relative h-48 overflow-hidden rounded-lg border border-[#23242d]/10 bg-white shadow-2xl sm:h-64 lg:h-[min(42vh,320px)]'>
            <Image
              src='/images/homepage/imagem01.jpg'
              alt='Foto institucional da equipe Watt Consultoria'
              fill
              sizes='(min-width: 1024px) 44vw, 100vw'
              className='object-cover'
            />
          </div>
          <div>
            <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
              Sobre a Watt
            </p>
            <h2 className='mt-3 text-3xl font-black tracking-tight text-[#23242d] sm:text-4xl'>
              Engenharia jovem, orientada por conhecimento e conectada ao
              mercado.
            </h2>
            <p className='mt-5 text-base leading-8 text-[#23242d]/72'>
              A Watt Consultoria &eacute; uma empresa j&uacute;nior formada por
              estudantes de Engenharia El&eacute;trica e Engenharia de Controle
              e Automa&ccedil;&atilde;o da Universidade Federal de Pernambuco.
              Atuamos conectando conhecimento acad&ecirc;mico, pr&aacute;tica de
              mercado e vis&atilde;o estrat&eacute;gica para entregar
              solu&ccedil;&otilde;es acess&iacute;veis e eficientes.
            </p>
            {/* <div className='mt-7 grid gap-3 sm:grid-cols-3'>
              {[
                ['100+', 'projetos conclu\u00eddos'],
                ['9+', 'anos de hist\u00f3ria'],
                ['UFPE', 'origem acad\u00eamica']
              ].map(([value, label]) => (
                <div
                  key={value}
                  className='rounded-lg border border-[#23242d]/10 bg-white p-4 shadow-sm'
                >
                  <p className='text-2xl font-black text-[#0a92ec]'>{value}</p>
                  <p className='mt-1 text-xs leading-5 font-medium text-[#23242d]/65'>
                    {label}
                  </p>
                </div>
              ))}
            </div> */}
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div className='rounded-lg border border-[#23242d]/10 bg-white p-5 shadow-sm'>
                <p className='text-sm font-bold tracking-[0.16em] text-[#0a92ec] uppercase'>
                  Miss&atilde;o
                </p>
                <p className='mt-3 text-sm leading-6 text-[#23242d]/72'>
                  Unir viv&ecirc;ncia empresarial a solu&ccedil;&otilde;es
                  inovadoras, transformando, com energia, a vida das pessoas.
                </p>
              </div>
              <div className='rounded-lg border border-[#23242d]/10 bg-white p-5 shadow-sm'>
                <p className='text-sm font-bold tracking-[0.16em] text-[#0a92ec] uppercase'>
                  Vis&atilde;o
                </p>
                <p className='mt-3 text-sm leading-6 text-[#23242d]/72'>
                  Ser refer&ecirc;ncia nacional como Empresa J&uacute;nior de
                  Engenharia El&eacute;trica e Controle e
                  Automa&ccedil;&atilde;o.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='bg-white py-16'>
        <div className='mx-auto max-w-7xl px-5 lg:px-8'>
          <div className='max-w-2xl'>
            <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
              Nossos valores
            </p>
            <h2 className='mt-3 text-3xl font-black tracking-tight sm:text-4xl'>
              O jeito Watt de construir solu&ccedil;&otilde;es.
            </h2>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
            {values.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className='rounded-lg border border-[#23242d]/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#0a92ec]/35 hover:shadow-md'
              >
                <div className='mb-4 flex size-10 items-center justify-center rounded-lg bg-[#0a92ec]/10 text-[#0a92ec]'>
                  <Icon className='size-5' />
                </div>
                <h3 className='font-bold text-[#23242d]'>{title}</h3>
                <p className='mt-3 text-sm leading-6 text-[#23242d]/65'>
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='servicos' className='bg-[#23242d] py-16 text-white'>
        <div className='mx-auto max-w-7xl px-5 lg:px-8'>
          <div className='grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end'>
            <div>
              <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
                Nossos servi&ccedil;os
              </p>
              <h2 className='mt-3 text-3xl font-black tracking-tight sm:text-4xl'>
                Projetos t&eacute;cnicos com clareza, m&eacute;todo e foco em
                resultado.
              </h2>
            </div>
            <p className='max-w-2xl text-base leading-8 text-white/72 lg:justify-self-end'>
              Atuamos em demandas de engenharia que pedem an&aacute;lise,
              execu&ccedil;&atilde;o respons&aacute;vel e solu&ccedil;&otilde;es
              compat&iacute;veis com a realidade de cada cliente.
            </p>
          </div>
          <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {services.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className='rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-sm transition hover:border-[#0a92ec]/70 hover:bg-white/[0.09]'
              >
                <div className='mb-4 flex size-11 items-center justify-center rounded-lg bg-[#0a92ec] text-white'>
                  <Icon className='size-6' />
                </div>
                <h3 className='text-lg font-bold'>{title}</h3>
                <p className='mt-3 text-sm leading-6 text-white/70'>
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='bg-[#f5f8fb] py-16'>
        <div className='mx-auto max-w-7xl px-5 lg:px-8'>
          <div className='flex flex-col justify-between gap-6 sm:flex-row sm:items-end'>
            <div className='max-w-2xl'>
              <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
                Fotos da empresa
              </p>
              <h2 className='mt-3 text-3xl font-black tracking-tight sm:text-4xl'>
                Espa&ccedil;os para registrar equipe, projetos e bastidores.
              </h2>
            </div>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {gallery.map((label) => (
              <PlaceholderImage
                key={label}
                label={label}
                className='min-h-[230px]'
              />
            ))}
          </div>
        </div>
      </section>

      <section id='diferenciais' className='bg-white py-16'>
        <div className='mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8'>
          <div>
            <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
              Diferenciais
            </p>
            <h2 className='mt-3 text-3xl font-black tracking-tight sm:text-4xl'>
              Por que contratar a Watt Consultoria?
            </h2>
            <p className='mt-5 text-base leading-8 text-[#23242d]/72'>
              Combinamos energia jovem, m&eacute;todo t&eacute;cnico e
              acompanhamento pr&oacute;ximo para entregar consultoria
              acess&iacute;vel sem abrir m&atilde;o de qualidade.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            {differentiators.map((item) => (
              <div
                key={item}
                className='flex items-start gap-4 rounded-lg border border-[#23242d]/10 bg-[#f5f8fb] p-5'
              >
                <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0a92ec] text-white'>
                  <UsersRound className='size-4' />
                </div>
                <p className='leading-7 font-medium text-[#23242d]'>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id='parceiros' className='bg-[#23242d] py-16 text-white'>
        <div className='mx-auto max-w-7xl px-5 lg:px-8'>
          <div className='grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center'>
            <div>
              <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
                Nossos parceiros
              </p>
              <h2 className='mt-3 text-3xl font-black tracking-tight sm:text-4xl'>
                Rela&ccedil;&otilde;es que fortalecem projetos e resultados.
              </h2>
              <p className='mt-5 max-w-xl text-base leading-8 text-white/72'>
                A Watt constr&oacute;i sua trajet&oacute;ria ao lado de empresas
                e institui&ccedil;&otilde;es que acreditam em engenharia,
                desenvolvimento e impacto pr&aacute;tico.
              </p>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {partners.map((partner) => (
                <div
                  key={partner.name}
                  className='flex h-28 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] p-6 transition hover:border-[#0a92ec]/70 hover:bg-white/[0.09]'
                >
                  <Image
                    src={partner.src}
                    alt={`Logo ${partner.name}`}
                    width={220}
                    height={90}
                    className='max-h-16 w-auto object-contain'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id='contato'
        className='bg-[#23242d] px-5 py-16 text-white lg:px-8'
      >
        <div className='mx-auto max-w-5xl rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl sm:p-12'>
          <p className='text-sm font-bold tracking-[0.18em] text-[#0a92ec] uppercase'>
            Vamos conversar
          </p>
          <h2 className='mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl'>
            Pronto para transformar sua ideia em um projeto de impacto?
          </h2>
          <p className='mx-auto mt-5 max-w-2xl text-base leading-8 text-white/72'>
            Entre em contato com a Watt Consultoria e descubra como podemos
            ajudar o seu neg&oacute;cio com solu&ccedil;&otilde;es
            t&eacute;cnicas, estrat&eacute;gicas e personalizadas.
          </p>
          <Link
            href='https://wa.me/5581996373427?text=Ol%C3%A1%20*Watt%20Consultoria*!%20Gostaria%20de%20conversar%20com%20voc%C3%AAs%20sobre'
            className='mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-[#0a92ec] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#0a92ec]/25 transition hover:bg-[#087fce]'
          >
            Fale com a Watt
            <ArrowRight className='size-4' />
          </Link>
        </div>
      </section>
    </main>
  );
}
