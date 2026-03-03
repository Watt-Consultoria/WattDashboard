'use client';

/**
 * Client-side hook for navigation items.
 *
 * RBAC is disabled in this project; all items are returned as-is.
 * In production, only "Individual" page is shown.
 */

import { useMemo } from 'react';
import type { NavItem } from '@/types';
import { useAuth } from '@/features/auth/components/auth-provider';
import { useFirebaseData } from '@/contexts/firebase-data-context';

/**
 * Hook to return navigation items.
 *
 * @param items - Array of navigation items
 * @returns Items (filtered in production to show only Individual)
 */
export function useFilteredNavItems(items: NavItem[]) {
  const { user } = useAuth();
  const { members } = useFirebaseData();

  return useMemo(() => {
    const isTestEnvironment = process.env.NODE_ENV !== 'production';
    // const isDevelopment = process.env.NODE_ENV === 'development';

    // if (isDevelopment) {
    //   return items;
    // }

    const currentMember = members.find(
      (member) => member.id === user?.uid || member.email === user?.email
    );

    const role = currentMember?.role?.toLowerCase().trim() ?? '';
    const tags =
      currentMember?.tags?.map((tag) => tag.toLowerCase().trim()) ?? [];
    const sector = currentMember?.sector?.toLowerCase().trim() ?? '';

    const allowedUrls = new Set(['/dashboard/individual']);

    const allowAcompanhamento = [
      'diretor',
      'presidente',
      'assessor',
      'gerente'
    ].includes(role);
    if (allowAcompanhamento) {
      allowedUrls.add('/dashboard/acompanhamento');
    }

    const allowPonto = ['diretor', 'presidente', 'assessor'].includes(role);
    if (allowPonto) {
      allowedUrls.add('/dashboard/ponto');
    }

    const allowLeads =
      ['diretor', 'presidente', 'assessor'].includes(role) ||
      sector === 'Comercial';
    if (allowLeads) {
      allowedUrls.add('/dashboard/leads');
    }

    const allowReembolsos = true;
    if (allowReembolsos) {
      allowedUrls.add('/dashboard/reembolsos');
    }

    const allowTeamview = [
      'diretor',
      'presidente',
      'assessor',
      'gerente'
    ].includes(role);
    if (allowTeamview) {
      allowedUrls.add('/dashboard/teamview');
    }

    const allowPSeletivo =
      tags.includes('psel') ||
      ['diretor', 'presidente', 'gerente', 'assessor'].includes(role);
    if (allowPSeletivo) {
      allowedUrls.add('/dashboard/pseletivo');
    }

    if (isTestEnvironment) {
      allowedUrls.add('/dashboard/pseletivo/membro');
    }

    const allowFormularios = ['diretor', 'presidente', 'assessor'].includes(
      role
    );
    if (allowFormularios) {
      allowedUrls.add('/dashboard/formularios');
    }

    const allowFaltas = ['diretor', 'presidente', 'assessor'].includes(role);
    if (allowFaltas) {
      allowedUrls.add('/dashboard/faltas');
    }

    const allowHog = true;
    if (allowHog) {
      allowedUrls.add('/dashboard/hogwatts');
    }

    const allowFinanceiro = ['presidente', 'assessor'].includes(role);
    if (allowFinanceiro) {
      allowedUrls.add('/dashboard/financeiro/reembolsos');
    }
    const filterItem = (item: NavItem): NavItem | null => {
      const includeItem = Boolean(item.url && allowedUrls.has(item.url));
      if (item.items && item.items.length > 0) {
        const filteredSubItems = item.items.filter(
          (subItem) => subItem.url && allowedUrls.has(subItem.url)
        );
        if (filteredSubItems.length > 0) {
          return {
            ...item,
            items: filteredSubItems
          };
        }
      }
      return includeItem ? { ...item } : null;
    };

    return items.map(filterItem).filter(Boolean) as NavItem[];
  }, [items, members, user]);
}
