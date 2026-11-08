export const computeDueDate = (startDate: Date, days: number): string => {
  const dueDate = new Date(startDate);

  dueDate.setUTCDate(dueDate.getUTCDate() + days);
  return dueDate.toISOString().split('T')[0];
};
