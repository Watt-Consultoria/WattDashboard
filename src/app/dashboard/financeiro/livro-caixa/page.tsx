// 'use client';

// import * as React from 'react';
// import { Plus } from 'lucide-react';
// import { toast } from 'sonner';
// import PageContainer from '@/components/layout/page-container';
// import { Button } from '@/components/ui/button';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle
// } from '@/components/ui/alert-dialog';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle
// } from '@/components/ui/card';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle
// } from '@/components/ui/dialog';
// import { Textarea } from '@/components/ui/textarea';
// import { CashbookSummaryCards } from '@/components/finance/CashbookSummaryCards';
// import { FinanceAccessDenied } from '@/components/finance/FinanceAccessDenied';
// import {
//   buildFinanceFilters,
//   FinanceTransactionFilters,
//   type FinanceFilterState
// } from '@/components/finance/FinanceTransactionFilters';
// import { FinanceTransactionForm } from '@/components/finance/FinanceTransactionForm';
// import { FinanceTransactionTable } from '@/components/finance/FinanceTransactionTable';
// import { useFirebaseData } from '@/contexts/firebase-data-context';
// import { canAccessFinanceCashbook } from '@/lib/executive-permissions';
// import financeService from '@/services/financeService';
// import type {
//   CreateFinanceTransactionDTO,
//   FinanceCashbookSummary,
//   FinanceTransaction
// } from '@/types/finance';
// import useMetadata from '@/hooks/use-metadata';

// const emptySummary: FinanceCashbookSummary = {
//   totalIncomeCents: 0,
//   totalExpenseCents: 0,
//   netResultCents: 0,
//   currentBalanceCents: 0,
//   pendingIncomeCents: 0,
//   pendingExpenseCents: 0
// };

// const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

// const initialFilters = (): FinanceFilterState => ({
//   competenceMonth: getCurrentMonth(),
//   type: 'all',
//   category: 'all',
//   status: 'all'
// });

// const clearedFilters = (): FinanceFilterState => ({
//   competenceMonth: '',
//   type: 'all',
//   category: 'all',
//   status: 'all'
// });

// export default function LivroCaixaPage() {
//   const { currentMember, isLoading: isLoadingMember } = useFirebaseData();
//   const [filters, setFilters] = React.useState<FinanceFilterState>(() =>
//     initialFilters()
//   );
//   const [transactions, setTransactions] = React.useState<FinanceTransaction[]>(
//     []
//   );
//   const [summary, setSummary] =
//     React.useState<FinanceCashbookSummary>(emptySummary);
//   const [isLoading, setIsLoading] = React.useState(true);
//   const [isSubmitting, setIsSubmitting] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);
//   const [isFormOpen, setIsFormOpen] = React.useState(false);
//   const [editingTransaction, setEditingTransaction] =
//     React.useState<FinanceTransaction | null>(null);
//   const [transactionToCancel, setTransactionToCancel] =
//     React.useState<FinanceTransaction | null>(null);
//   const [cancelReason, setCancelReason] = React.useState('');

//   useMetadata({ title: 'Livro de Caixa' });

//   const canAccess = canAccessFinanceCashbook(currentMember);
//   const financeFilters = React.useMemo(
//     () => buildFinanceFilters(filters),
//     [filters]
//   );

//   const loadData = React.useCallback(async () => {
//     if (!currentMember || !canAccess) return;

//     setIsLoading(true);
//     setError(null);
//     try {
//       const [nextTransactions, nextSummary] = await Promise.all([
//         financeService.getTransactions(financeFilters, currentMember),
//         financeService.getCashbookSummary(financeFilters, currentMember)
//       ]);

//       setTransactions(nextTransactions);
//       setSummary(nextSummary);
//     } catch (loadError) {
//       const message =
//         loadError instanceof Error
//           ? loadError.message
//           : 'Nao foi possivel carregar o Livro de Caixa.';
//       setError(message);
//       toast.error(message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [canAccess, currentMember, financeFilters]);

//   React.useEffect(() => {
//     if (isLoadingMember) return;
//     if (!currentMember || !canAccess) {
//       setIsLoading(false);
//       return;
//     }
//     loadData();
//   }, [canAccess, currentMember, isLoadingMember, loadData]);

//   const openCreateForm = () => {
//     setEditingTransaction(null);
//     setIsFormOpen(true);
//   };

//   const openEditForm = (transaction: FinanceTransaction) => {
//     setEditingTransaction(transaction);
//     setIsFormOpen(true);
//   };

//   const handleSubmit = async (data: CreateFinanceTransactionDTO) => {
//     setIsSubmitting(true);
//     try {
//       if (editingTransaction) {
//         await financeService.updateTransaction(
//           editingTransaction.id,
//           data,
//           currentMember
//         );
//         toast.success('Movimentacao atualizada.');
//       } else {
//         await financeService.createTransaction(data, currentMember);
//         toast.success('Movimentacao criada.');
//       }

//       setIsFormOpen(false);
//       setEditingTransaction(null);
//       await loadData();
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const confirmCancelTransaction = async () => {
//     if (!transactionToCancel) return;

//     setIsSubmitting(true);
//     try {
//       await financeService.cancelTransaction(
//         transactionToCancel.id,
//         cancelReason,
//         currentMember
//       );
//       toast.success('Movimentacao cancelada.');
//       setTransactionToCancel(null);
//       setCancelReason('');
//       await loadData();
//     } catch (cancelError) {
//       toast.error(
//         cancelError instanceof Error
//           ? cancelError.message
//           : 'Nao foi possivel cancelar a movimentacao.'
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (isLoadingMember || isLoading) {
//     return (
//       <PageContainer>
//         <div className='text-muted-foreground py-10 text-center text-sm'>
//           Carregando Livro de Caixa...
//         </div>
//       </PageContainer>
//     );
//   }

//   if (!canAccess) {
//     return (
//       <PageContainer>
//         <FinanceAccessDenied />
//       </PageContainer>
//     );
//   }

//   return (
//     <PageContainer>
//       <div className='flex flex-col gap-6'>
//         <div className='flex flex-col justify-between gap-3 md:flex-row md:items-center'>
//           <div>
//             <h1 className='text-3xl font-bold tracking-tight'>
//               Livro de Caixa
//             </h1>
//             <p className='text-muted-foreground'>
//               Controle de entradas, saidas e saldo financeiro da empresa.
//             </p>
//           </div>

//           <Button type='button' className='gap-2' onClick={openCreateForm}>
//             <Plus className='h-4 w-4' />
//             Nova movimentacao
//           </Button>
//         </div>

//         <CashbookSummaryCards summary={summary} />

//         <Card>
//           <CardHeader>
//             <CardTitle>Filtros</CardTitle>
//             <CardDescription>
//               Refine as movimentacoes por competencia, tipo, categoria e
//               status.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <FinanceTransactionFilters
//               filters={filters}
//               onChange={setFilters}
//               onClear={() => setFilters(clearedFilters())}
//             />
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Movimentacoes</CardTitle>
//             <CardDescription>
//               {transactions.length} movimentacao(oes) encontradas.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {error ? (
//               <div className='text-destructive mb-4 text-sm'>{error}</div>
//             ) : null}
//             <FinanceTransactionTable
//               transactions={transactions}
//               isLoading={isLoading}
//               onEdit={openEditForm}
//               onCancel={(transaction) => {
//                 setTransactionToCancel(transaction);
//                 setCancelReason('');
//               }}
//             />
//           </CardContent>
//         </Card>
//       </div>

//       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
//         <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-3xl'>
//           <DialogHeader>
//             <DialogTitle>
//               {editingTransaction
//                 ? 'Editar movimentacao'
//                 : 'Nova movimentacao'}
//             </DialogTitle>
//             <DialogDescription>
//               Valores sao salvos em centavos no Firestore.
//             </DialogDescription>
//           </DialogHeader>
//           <FinanceTransactionForm
//             transaction={editingTransaction}
//             defaultCompetenceMonth={filters.competenceMonth}
//             isSubmitting={isSubmitting}
//             onSubmit={handleSubmit}
//             onCancel={() => setIsFormOpen(false)}
//           />
//         </DialogContent>
//       </Dialog>

//       <AlertDialog
//         open={Boolean(transactionToCancel)}
//         onOpenChange={(open) => {
//           if (!open) setTransactionToCancel(null);
//         }}
//       >
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Cancelar movimentacao</AlertDialogTitle>
//             <AlertDialogDescription>
//               O cancelamento nao exclui o registro. A movimentacao deixara de
//               entrar nos calculos financeiros.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <Textarea
//             value={cancelReason}
//             onChange={(event) => setCancelReason(event.target.value)}
//             placeholder='Motivo do cancelamento, opcional'
//           />
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={isSubmitting}>
//               Voltar
//             </AlertDialogCancel>
//             <AlertDialogAction
//               disabled={isSubmitting}
//               onClick={(event) => {
//                 event.preventDefault();
//                 confirmCancelTransaction();
//               }}
//             >
//               {isSubmitting ? 'Cancelando...' : 'Confirmar cancelamento'}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </PageContainer>
//   );
// }
export default function LivroCaixaPage() {}
