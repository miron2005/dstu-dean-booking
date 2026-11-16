export type PeriodPhase = 'upcoming' | 'ongoing' | 'finished' | 'cancelled';

interface PeriodTimes {
  status: string;
  starts_at: string;
  ends_at: string;
}

export const PERIOD_PHASE_LABELS: Record<PeriodPhase, string> = {
  upcoming: 'Запланирован',
  ongoing: 'Идёт приём',
  finished: 'Завершён',
  cancelled: 'Отменён',
};

export function getPeriodPhase(
  period: PeriodTimes,
  now: number = Date.now(),
): PeriodPhase {
  if (period.status === 'cancelled') {
    return 'cancelled';
  }

  if (new Date(period.ends_at).getTime() <= now) {
    return 'finished';
  }

  if (new Date(period.starts_at).getTime() <= now) {
    return 'ongoing';
  }

  return 'upcoming';
}
