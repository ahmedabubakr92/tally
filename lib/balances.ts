type ExpenseForBalance = {
  paidById: string;
  splits: { userId: string; shareAmount: { toString(): string } }[];
};

type SettlementForBalance = {
  paidById: string;
  paidToId: string;
  amount: { toString(): string };
};

export type Balance = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export function computeBalances(
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[],
): Balance[] {
  // ledger key: `${debtor}::${creditor} - value: total owed in that direction
  const ledger = new Map<string, number>();

  function addDebt(debtor: string, creditor: string, amount: number) {
    const key = `${debtor}::${creditor}`;
    ledger.set(key, (ledger.get(key) ?? 0) + amount);
  }

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId !== expense.paidById) {
        addDebt(
          split.userId,
          expense.paidById,
          Number(split.shareAmount.toString()),
        );
      }
    }
  }

  for (const s of settlements) {
    addDebt(s.paidById, s.paidToId, -Number(s.amount.toString()));
  }

  const balances: Balance[] = [];
  const seen = new Set<string>();

  for (const key of ledger.keys()) {
    const [a, b] = key.split("::");
    const pairKey = [a, b].sort().join("::");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const [x, y] = pairKey.split("::");
    const net =
      (ledger.get(`${x}::${y}`) ?? 0) - (ledger.get(`${y}::${x}`) ?? 0);

    const EPSILON = 0.001;
    if (net > EPSILON) {
      balances.push({
        fromUserId: x,
        toUserId: y,
        amount: Math.round(net * 100) / 100,
      });
    } else if (net < -EPSILON) {
      balances.push({
        fromUserId: y,
        toUserId: x,
        amount: Math.round(-net * 100) / 100,
      });
    }
  }

  return balances;
}
