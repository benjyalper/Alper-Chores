// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { FamilyMemberDTO, OccurrenceDTO } from '@shared/types';
import { I18nProvider } from '../../client/src/i18n/I18nContext';
import { ToastProvider } from '../../client/src/components/Toast';
import { MemberSelect } from '../../client/src/components/MemberSelect';
import { StatusControl } from '../../client/src/components/StatusControl';
import { OccurrenceCard } from '../../client/src/features/schedule/OccurrenceCard';

const wrap = (ui: ReactNode) => (
  <I18nProvider>
    <ToastProvider>{ui}</ToastProvider>
  </I18nProvider>
);

const members: FamilyMemberDTO[] = [
  {
    id: 'm1',
    name: 'Benjy',
    color: '#4F86C6',
    emoji: '🧑',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'm2',
    name: 'Yifat',
    color: '#E4739B',
    emoji: '👩',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

describe('MemberSelect', () => {
  it('renders an Unassigned option plus each active member', () => {
    render(wrap(<MemberSelect members={members} value={null} onChange={() => {}} />));
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Unassigned/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Benjy/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Yifat/ })).toBeInTheDocument();
  });

  it('calls onChange with the selected member id', () => {
    const onChange = vi.fn();
    render(wrap(<MemberSelect members={members} value={null} onChange={onChange} />));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'm2' } });
    expect(onChange).toHaveBeenCalledWith('m2');
  });
});

describe('StatusControl', () => {
  it('toggles to completed and offers a separate skip control', () => {
    const onChange = vi.fn();
    render(wrap(<StatusControl status="PENDING" onChange={onChange} />));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('COMPLETED');
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    expect(onChange).toHaveBeenCalledWith('SKIPPED');
  });
});

const occ: OccurrenceDTO = {
  occurrenceKey: 't1__2026-07-08',
  templateId: 't1',
  categoryId: 'c1',
  name: 'Feed the cat',
  description: null,
  date: '2026-07-08',
  time: '12:00',
  timeSlotLabel: null,
  isMeal: false,
  mealType: null,
  assignedMemberId: null,
  status: 'PENDING',
  completedAt: null,
  completedByMemberId: null,
  completionNote: null,
  isRecurring: true,
  frequency: 'DAILY',
  hasNotes: false,
  notes: null,
  mealSummary: null,
};

describe('OccurrenceCard', () => {
  it('shows the chore name, time and a recurring indicator', () => {
    render(
      wrap(
        <OccurrenceCard
          occ={occ}
          members={members}
          onAssign={() => {}}
          onStatus={() => {}}
          onOpenMeal={() => {}}
          onReset={() => {}}
        />,
      ),
    );
    expect(screen.getByText('Feed the cat')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('recurring assignment opens the scope chooser before saving', () => {
    const onAssign = vi.fn();
    render(
      wrap(
        <OccurrenceCard
          occ={occ}
          members={members}
          onAssign={onAssign}
          onStatus={() => {}}
          onOpenMeal={() => {}}
          onReset={() => {}}
        />,
      ),
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'm1' } });
    // Scope dialog appears; assignment not yet committed.
    expect(onAssign).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    expect(onAssign).toHaveBeenCalledWith(occ, 'm1', 'occurrence');
  });
});
