import { NextResponse } from 'next/server';
import memberRepository from '@/repositories/memberRepository';
import { FirebaseError } from '@/errors/repositoryErrors';

export async function GET() {
  try {
    const members = await memberRepository.getAllMembers();

    const simplifiedMembers = members.map((member) => ({
      id: member.id,
      name: member.name
    }));

    return NextResponse.json(
      {
        success: true,
        data: simplifiedMembers,
        count: simplifiedMembers.length
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof FirebaseError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }

    console.error('Erro ao listar membros:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao listar membros.'
      },
      { status: 500 }
    );
  }
}
