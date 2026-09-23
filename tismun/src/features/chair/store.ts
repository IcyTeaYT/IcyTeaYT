import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { AWARD_LABEL, type AwardType } from '@/config/awards';
import { DEFAULTS, MOTION_BY_ID, PRESENTATION, VOTING, type MotionTypeId } from '@/config/rules';
import type { Delegation } from '@/data/source/types';
import { requiredVotes, resolveVote } from '@/lib/majority';
import { formatClock } from '@/lib/time';
import { adjustTimer, createTimer, pauseTimer, resetTimer, startTimer, type TimerState } from '@/lib/timer';
import type {
  Amendment,
  AmendmentStatus,
  Award,
  Attendance,
  GslState,
  LogEntry,
  LogType,
  Motion,
  PresentationState,
  Resolution,
  ResolutionStatus,
  RollCallChoice,
  SessionStatus,
  SpeakerEntry,
  UnmoderatedState,
  VoteSession,
} from './types';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Which clock an action is talking about. */
export type TimerKey = 'gsl' | 'unmod' | 'present';

export interface ChairState {
  /** Delegation id → country name, so log entries read in plain English. */
  names: Record<string, string>;
  /** Delegation id → ISO code, so the projector can show a flag on its own. */
  codes: Record<string, string>;
  rollCallTakenAt: number | null;
  attendance: Record<string, Attendance>;
  gsl: GslState;
  unmoderated: UnmoderatedState;
  presentation: PresentationState;
  /** How many draft resolution presentations have been completed. */
  presentationsHeld: number;
  /** How many crisis briefings the chairs have given. */
  briefingsHeld: number;
  /** How many Unmoderated Caucuses have been opened. */
  unmoderatedHeld: number;
  motions: Motion[];
  resolutions: Resolution[];
  amendments: Amendment[];
  vote: VoteSession | null;
  awards: Award[];
  log: LogEntry[];
  soundEnabled: boolean;

  // Housekeeping
  syncRoster: (roster: Delegation[]) => void;
  resetSession: () => void;
  toggleSound: () => void;
  addLog: (type: LogType, summary: string, detail?: string) => void;

  // Roll call
  setAttendance: (delegationId: string, status: Attendance) => void;
  markAllPresent: () => void;
  takeRollCall: () => void;

  // Timers (shared by every tool)
  timerStart: (key: TimerKey) => void;
  timerPause: (key: TimerKey) => void;
  timerToggle: (key: TimerKey) => void;
  timerReset: (key: TimerKey) => void;
  timerAdjust: (key: TimerKey, deltaMs: number) => void;

  // General Speakers' List
  gslSetSpeakingTime: (seconds: number) => void;
  gslAdd: (delegationId: string) => void;
  gslRemove: (entryId: string) => void;
  gslSetQueue: (entries: SpeakerEntry[]) => void;
  gslNext: () => void;
  gslYield: (kind: 'chair' | 'delegate' | 'questions', toDelegationId?: string) => void;
  gslClear: () => void;

  // Unmoderated caucus
  unmodStart: (input: { purpose: string; proposedBy: string; durationSec: number }) => void;
  unmodExtend: (seconds: number) => void;
  unmodEnd: () => void;

  // Presentation of a draft resolution
  presentStart: (input: {
    kind: PresentationState['kind'];
    resolutionId: string | null;
    presenterId: string | null;
    durationSec: number;
  }) => void;
  /** Move straight on to the question-and-answer period, on a fresh clock. */
  presentOpenQuestions: (durationSec: number) => void;
  /** Finish — whether or not there was a question-and-answer period. */
  presentEnd: () => void;

  // Motions
  /** Returns the new motion's id, so the caller can take it straight to a vote. */
  raiseMotion: (input: {
    type: MotionTypeId;
    proposedBy: string;
    params: Record<string, string | number>;
  }) => string;
  setMotionVotes: (id: string, votesFor: number, votesAgainst: number) => void;
  decideMotion: (id: string, presentCount: number) => void;
  withdrawMotion: (id: string) => void;
  markMotionStarted: (id: string) => void;

  // Resolutions
  /** Returns the new resolution's id so the caller can open it. */
  addResolution: (input: Omit<Resolution, 'id' | 'createdAt' | 'status'>) => string;
  setResolutionStatus: (id: string, status: ResolutionStatus) => void;
  removeResolution: (id: string) => void;
  addAmendment: (input: Omit<Amendment, 'id' | 'createdAt' | 'status'>) => void;
  setAmendmentStatus: (id: string, status: AmendmentStatus) => void;
  removeAmendment: (id: string) => void;

  // Voting
  startVote: (input: {
    subjectKind: 'resolution' | 'amendment';
    subjectId: string;
    subjectLabel: string;
    mode: 'placard' | 'roll-call';
    eligible: string[];
  }) => void;
  setVoteMode: (mode: 'placard' | 'roll-call') => void;
  adjustPlacard: (field: 'for' | 'against' | 'abstain', delta: number) => void;
  castRollCallVote: (delegationId: string, choice: RollCallChoice | null) => void;
  beginSecondRound: () => void;
  closeVote: () => void;
  cancelVote: () => void;

  // Awards
  /**
   * Gives the award to a delegation, replacing whoever held it before. A
   * delegation holding the other award loses that one: nobody holds both.
   */
  giveAward: (type: AwardType, delegation: Delegation) => void;
  removeAward: (type: AwardType) => void;
}

const emptyGsl = (): GslState => ({
  speakingTimeSec: DEFAULTS.speakingTimeSec,
  queue: [],
  spoken: [],
  currentId: null,
  timer: createTimer(DEFAULTS.speakingTimeSec * 1000),
});

const emptyUnmoderated = (): UnmoderatedState => ({
  active: false,
  purpose: '',
  proposedBy: null,
  timer: createTimer(DEFAULTS.unmoderatedSec * 1000),
});

export const emptyPresentation = (): PresentationState => ({
  active: false,
  kind: 'draft',
  resolutionId: null,
  presenterId: null,
  phase: 'presenting',
  timer: createTimer(PRESENTATION.draftSec * 1000),
});

const initialState = () => ({
  names: {} as Record<string, string>,
  codes: {} as Record<string, string>,
  rollCallTakenAt: null as number | null,
  attendance: {} as Record<string, Attendance>,
  gsl: emptyGsl(),
  unmoderated: emptyUnmoderated(),
  presentation: emptyPresentation(),
  presentationsHeld: 0,
  briefingsHeld: 0,
  unmoderatedHeld: 0,
  motions: [] as Motion[],
  resolutions: [] as Resolution[],
  amendments: [] as Amendment[],
  vote: null as VoteSession | null,
  awards: [] as Award[],
  log: [] as LogEntry[],
  soundEnabled: false,
});

function createChairState(committeeId: string) {
  return (
    set: (partial: Partial<ChairState> | ((state: ChairState) => Partial<ChairState>)) => void,
    get: () => ChairState,
  ): ChairState => {
    const nameOf = (delegationId: string | null | undefined): string =>
      (delegationId && get().names[delegationId]) || 'a delegation';

    const log = (type: LogType, summary: string, detail?: string) => {
      const entry: LogEntry = { id: uid(), at: Date.now(), type, summary, ...(detail ? { detail } : {}) };
      set((state) => ({ log: [entry, ...state.log] }));
    };

    /** Read + write whichever clock a timer action names. */
    const mapTimer = (key: TimerKey, transform: (timer: TimerState) => TimerState) => {
      set((state) => {
        switch (key) {
          case 'gsl':
            return { gsl: { ...state.gsl, timer: transform(state.gsl.timer) } };
          case 'unmod':
            return { unmoderated: { ...state.unmoderated, timer: transform(state.unmoderated.timer) } };
          case 'present':
            return { presentation: { ...state.presentation, timer: transform(state.presentation.timer) } };
        }
      });
    };

    return {
      ...initialState(),

      syncRoster(roster) {
        set((state) => {
          const names: Record<string, string> = {};
          const codes: Record<string, string> = {};
          const attendance: Record<string, Attendance> = {};
          for (const delegation of roster) {
            names[delegation.id] = delegation.country;
            codes[delegation.id] = delegation.countryCode;
            // Keep any answer already recorded for a delegation still on the roster.
            attendance[delegation.id] = state.attendance[delegation.id] ?? 'absent';
          }
          return { names, codes, attendance };
        });
      },

      resetSession() {
        // Awards survive a reset: they belong to the conference, not to one
        // session, and a reset between sessions must not quietly revoke them.
        set({
          ...initialState(),
          names: get().names,
          codes: get().codes,
          awards: get().awards,
          soundEnabled: get().soundEnabled,
        });
        log('session', 'Session reset', `All committee state for ${committeeId.toUpperCase()} was cleared.`);
      },

      toggleSound() {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      addLog(type, summary, detail) {
        log(type, summary, detail);
      },

      /* ── Roll call ─────────────────────────────────────────────────────── */

      setAttendance(delegationId, status) {
        set((state) => ({ attendance: { ...state.attendance, [delegationId]: status } }));
      },

      markAllPresent() {
        set((state) => {
          const attendance: Record<string, Attendance> = {};
          for (const id of Object.keys(state.names)) attendance[id] = 'present';
          return { attendance };
        });
      },

      takeRollCall() {
        const state = get();
        const entries = Object.entries(state.attendance);
        const present = entries.filter(([, status]) => status !== 'absent');
        const voting = entries.filter(([, status]) => status === 'present-voting');
        set({ rollCallTakenAt: Date.now() });
        log(
          'roll-call',
          `Roll call taken — ${present.length} of ${entries.length} present`,
          `${voting.length} present and voting. Absent: ${
            entries
              .filter(([, status]) => status === 'absent')
              .map(([id]) => state.names[id] ?? id)
              .join(', ') || 'none'
          }.`,
        );
      },

      /* ── Timers ────────────────────────────────────────────────────────── */

      timerStart(key) {
        mapTimer(key, (timer) => startTimer(timer, Date.now()));
      },
      timerPause(key) {
        mapTimer(key, (timer) => pauseTimer(timer, Date.now()));
      },
      timerToggle(key) {
        mapTimer(key, (timer) =>
          timer.startedAt === null ? startTimer(timer, Date.now()) : pauseTimer(timer, Date.now()),
        );
      },
      timerReset(key) {
        mapTimer(key, resetTimer);
      },
      timerAdjust(key, deltaMs) {
        mapTimer(key, (timer) => adjustTimer(timer, deltaMs));
      },

      /* ── General Speakers' List ────────────────────────────────────────── */

      gslSetSpeakingTime(seconds) {
        set((state) => ({
          gsl: {
            ...state.gsl,
            speakingTimeSec: seconds,
            // Only re-time an untouched clock; never rob the delegate speaking.
            timer: state.gsl.currentId === null ? createTimer(seconds * 1000) : state.gsl.timer,
          },
        }));
        log('speaker', `Speaking time set to ${formatClock(seconds * 1000)}`);
      },

      gslAdd(delegationId) {
        set((state) => {
          if (
            state.gsl.queue.some((entry) => entry.delegationId === delegationId) ||
            state.gsl.currentId !== null &&
              state.gsl.queue.find((entry) => entry.id === state.gsl.currentId)?.delegationId === delegationId
          ) {
            return {};
          }
          return {
            gsl: { ...state.gsl, queue: [...state.gsl.queue, { id: uid(), delegationId }] },
          };
        });
      },

      gslRemove(entryId) {
        set((state) => ({
          gsl: {
            ...state.gsl,
            queue: state.gsl.queue.filter((entry) => entry.id !== entryId),
            currentId: state.gsl.currentId === entryId ? null : state.gsl.currentId,
          },
        }));
      },

      gslSetQueue(entries) {
        set((state) => ({ gsl: { ...state.gsl, queue: entries } }));
      },

      gslNext() {
        const state = get();
        const { queue, currentId, speakingTimeSec } = state.gsl;
        const currentIndex = queue.findIndex((entry) => entry.id === currentId);
        const current = currentIndex >= 0 ? queue[currentIndex] : undefined;

        // Whoever was speaking moves to Spoken; the next in line takes the floor.
        const remaining = current ? queue.filter((entry) => entry.id !== current.id) : queue;
        const next = remaining[0];

        const fresh = createTimer(speakingTimeSec * 1000);
        set({
          gsl: {
            ...state.gsl,
            queue: remaining,
            spoken: current ? [current, ...state.gsl.spoken] : state.gsl.spoken,
            currentId: next?.id ?? null,
            // Recognising a delegate starts their clock — the chair should not
            // have to press Next and then Start while the room waits.
            timer: next ? startTimer(fresh, Date.now()) : fresh,
          },
        });

        if (next) log('speaker', `${nameOf(next.delegationId)} recognised`, `Speaking time ${formatClock(speakingTimeSec * 1000)}.`);
        else if (current) log('speaker', 'Speakers’ list exhausted');
      },

      gslYield(kind, toDelegationId) {
        const state = get();
        const current = state.gsl.queue.find((entry) => entry.id === state.gsl.currentId);
        if (!current) return;

        const yielded: SpeakerEntry['yielded'] =
          kind === 'delegate' && toDelegationId ? { kind, toDelegationId } : { kind };

        set({
          gsl: {
            ...state.gsl,
            queue: state.gsl.queue.map((entry) =>
              entry.id === current.id ? { ...entry, yielded } : entry,
            ),
          },
        });

        const target =
          kind === 'chair'
            ? 'the Chair'
            : kind === 'questions'
              ? 'questions'
              : nameOf(toDelegationId);
        log('speaker', `${nameOf(current.delegationId)} yielded to ${target}`);
      },

      gslClear() {
        set((state) => ({ gsl: { ...emptyGsl(), speakingTimeSec: state.gsl.speakingTimeSec } }));
        log('speaker', 'Speakers’ list cleared');
      },

      /* ── Unmoderated caucus ────────────────────────────────────────────── */

      unmodStart({ purpose, proposedBy, durationSec }) {
        set((state) => ({
          unmoderated: {
            active: true,
            purpose,
            proposedBy,
            timer: startTimer(createTimer(durationSec * 1000), Date.now()),
          },
          unmoderatedHeld: state.unmoderatedHeld + 1,
        }));
        log(
          'caucus',
          `Unmoderated caucus opened — ${formatClock(durationSec * 1000)}`,
          `Proposed by ${nameOf(proposedBy)}.${purpose ? ` Purpose: ${purpose}.` : ''}`,
        );
      },

      unmodExtend(seconds) {
        set((state) => ({
          unmoderated: { ...state.unmoderated, timer: adjustTimer(state.unmoderated.timer, seconds * 1000) },
        }));
        log('caucus', `Unmoderated caucus extended by ${formatClock(seconds * 1000)}`);
      },

      unmodEnd() {
        const wasActive = get().unmoderated.active;
        set({ unmoderated: emptyUnmoderated() });
        if (wasActive) log('caucus', 'Unmoderated caucus closed');
      },

      /* ── Presentation of a draft resolution ────────────────────────────── */

      presentStart({ kind, resolutionId, presenterId, durationSec }) {
        set({
          presentation: {
            active: true,
            kind,
            resolutionId,
            presenterId,
            phase: 'presenting',
            // The presenter is on their feet: the clock starts with them.
            timer: startTimer(createTimer(durationSec * 1000), Date.now()),
          },
        });
        if (kind === 'briefing') {
          log('presentation', 'Crisis briefing opened by the Chair', `Briefing time ${formatClock(durationSec * 1000)}.`);
          return;
        }
        const resolution = get().resolutions.find((entry) => entry.id === resolutionId);
        log(
          'presentation',
          `${presenterId ? nameOf(presenterId) : 'The Main Submitter'} presents ${resolution?.number ?? 'the draft resolution'}`,
          `${resolution ? `${resolution.title}. ` : ''}Presentation time ${formatClock(durationSec * 1000)}.`,
        );
      },

      presentOpenQuestions(durationSec) {
        const current = get().presentation;
        if (!current.active) return;
        set({
          presentation: {
            ...current,
            phase: 'questions',
            timer: startTimer(createTimer(durationSec * 1000), Date.now()),
          },
        });
        log('presentation', 'Question-and-answer period opened', `${formatClock(durationSec * 1000)}.`);
      },

      presentEnd() {
        const current = get().presentation;
        if (!current.active) return;
        set((state) =>
          current.kind === 'briefing'
            ? { presentation: emptyPresentation(), briefingsHeld: state.briefingsHeld + 1 }
            : { presentation: emptyPresentation(), presentationsHeld: state.presentationsHeld + 1 },
        );
        log(
          'presentation',
          current.kind === 'briefing'
            ? current.phase === 'questions'
              ? 'Crisis briefing questions closed'
              : 'Crisis briefing finished'
            : current.phase === 'questions'
            ? 'Question-and-answer period closed'
            : 'Presentation finished — no question-and-answer period',
        );
      },

      /* ── Motions ───────────────────────────────────────────────────────── */

      raiseMotion({ type, proposedBy, params }) {
        const motion: Motion = {
          id: uid(),
          type,
          proposedBy,
          params,
          status: 'floor',
          votesFor: 0,
          votesAgainst: 0,
          raisedAt: Date.now(),
          decidedAt: null,
          started: false,
        };
        set((state) => ({ motions: [motion, ...state.motions] }));
        log('motion', `${nameOf(proposedBy)} moved: ${MOTION_BY_ID[type].label}`, describeParams(params));
        return motion.id;
      },

      setMotionVotes(id, votesFor, votesAgainst) {
        set((state) => ({
          motions: state.motions.map((motion) =>
            motion.id === id
              ? { ...motion, votesFor: Math.max(0, votesFor), votesAgainst: Math.max(0, votesAgainst) }
              : motion,
          ),
        }));
      },

      decideMotion(id, presentCount) {
        const motion = get().motions.find((entry) => entry.id === id);
        if (!motion) return;

        const rule = MOTION_BY_ID[motion.type];
        // Procedural votes are measured against the delegations PRESENT, not
        // against votes cast: on a motion, staying silent cannot help it carry.
        const required = requiredVotes(rule.majority, presentCount);
        const passed = motion.votesFor >= required;

        set((state) => ({
          motions: state.motions.map((entry) =>
            entry.id === id
              ? { ...entry, status: passed ? 'passed' : 'failed', decidedAt: Date.now() }
              : entry,
          ),
        }));

        log(
          'motion',
          `${rule.label} — ${passed ? 'passed' : 'failed'}`,
          `${motion.votesFor} for, ${motion.votesAgainst} against. ${required} needed (${rule.majority === 'two-thirds' ? 'two-thirds' : 'simple'} majority of ${presentCount} present).`,
        );
      },

      withdrawMotion(id) {
        const motion = get().motions.find((entry) => entry.id === id);
        set((state) => ({
          motions: state.motions.map((entry) =>
            entry.id === id ? { ...entry, status: 'withdrawn', decidedAt: Date.now() } : entry,
          ),
        }));
        if (motion) log('motion', `${MOTION_BY_ID[motion.type].label} withdrawn`);
      },

      markMotionStarted(id) {
        set((state) => ({
          motions: state.motions.map((entry) => (entry.id === id ? { ...entry, started: true } : entry)),
        }));
      },

      /* ── Resolutions ───────────────────────────────────────────────────── */

      addResolution(input) {
        const resolution: Resolution = { ...input, id: uid(), status: 'draft', createdAt: Date.now() };
        set((state) => ({ resolutions: [...state.resolutions, resolution] }));
        log(
          'resolution',
          `${resolution.number} created — ${resolution.title}`,
          `Main submitters: ${resolution.mainSubmitters.map(nameOf).join(', ') || 'none'}. ${resolution.signatories.length} signatories.`,
        );
        return resolution.id;
      },

      setResolutionStatus(id, status) {
        const resolution = get().resolutions.find((entry) => entry.id === id);
        set((state) => ({
          resolutions: state.resolutions.map((entry) =>
            entry.id === id ? { ...entry, status } : entry,
          ),
        }));
        if (resolution) log('resolution', `${resolution.number} — ${status}`);
      },

      removeResolution(id) {
        set((state) => ({
          resolutions: state.resolutions.filter((entry) => entry.id !== id),
          amendments: state.amendments.filter((entry) => entry.resolutionId !== id),
        }));
      },

      addAmendment(input) {
        const amendment: Amendment = {
          ...input,
          id: uid(),
          // A friendly amendment is accepted the moment it is submitted.
          status: input.friendly ? 'accepted' : 'pending',
          createdAt: Date.now(),
        };
        set((state) => ({ amendments: [...state.amendments, amendment] }));
        const resolution = get().resolutions.find((entry) => entry.id === input.resolutionId);
        log(
          'resolution',
          `${input.friendly ? 'Friendly' : 'Unfriendly'} amendment submitted by ${nameOf(input.submittedBy)}`,
          `${resolution?.number ?? 'Resolution'} — ${input.clause}. ${input.friendly ? 'Accepted without a vote.' : 'Requires a vote.'}`,
        );
      },

      setAmendmentStatus(id, status) {
        set((state) => ({
          amendments: state.amendments.map((entry) =>
            entry.id === id ? { ...entry, status } : entry,
          ),
        }));
      },

      removeAmendment(id) {
        set((state) => ({ amendments: state.amendments.filter((entry) => entry.id !== id) }));
      },

      /* ── Voting ────────────────────────────────────────────────────────── */

      startVote({ subjectKind, subjectId, subjectLabel, mode, eligible }) {
        const rollCall: Record<string, RollCallChoice | null> = {};
        for (const id of eligible) rollCall[id] = null;

        set({
          vote: {
            id: uid(),
            subjectKind,
            subjectId,
            subjectLabel,
            mode,
            placard: { for: 0, against: 0, abstain: 0 },
            rollCall,
            secondRound: false,
            secondRoundIds: [],
            startedAt: Date.now(),
          },
        });

        if (subjectKind === 'resolution') {
          set((state) => ({
            resolutions: state.resolutions.map((entry) =>
              entry.id === subjectId ? { ...entry, status: 'voting' } : entry,
            ),
          }));
        }
        log('vote', `Voting opened on ${subjectLabel}`, `${mode === 'roll-call' ? 'Roll call' : 'Placard'} vote, ${eligible.length} delegations eligible.`);
      },

      setVoteMode(mode) {
        set((state) => (state.vote ? { vote: { ...state.vote, mode } } : {}));
      },

      adjustPlacard(field, delta) {
        set((state) =>
          state.vote
            ? {
                vote: {
                  ...state.vote,
                  placard: {
                    ...state.vote.placard,
                    [field]: Math.max(0, state.vote.placard[field] + delta),
                  },
                },
              }
            : {},
        );
      },

      castRollCallVote(delegationId, choice) {
        set((state) =>
          state.vote
            ? { vote: { ...state.vote, rollCall: { ...state.vote.rollCall, [delegationId]: choice } } }
            : {},
        );
      },

      beginSecondRound() {
        const vote = get().vote;
        if (!vote) return;
        const called = Object.entries(vote.rollCall)
          .filter(([, choice]) => choice === 'pass')
          .map(([id]) => id);
        set({ vote: { ...vote, secondRound: true, secondRoundIds: called } });
        log(
          'vote',
          `Second round — ${called.length} ${called.length === 1 ? 'delegation is' : 'delegations are'} called again`,
          called.map((id) => get().names[id] ?? id).join(', '),
        );
      },

      closeVote() {
        const state = get();
        const vote = state.vote;
        if (!vote) return;

        const tally =
          vote.mode === 'placard'
            ? vote.placard
            : Object.values(vote.rollCall).reduce(
                (total, choice) => ({
                  for: total.for + (choice === 'yes' ? 1 : 0),
                  against: total.against + (choice === 'no' ? 1 : 0),
                  // A delegation still passing when the vote closes has abstained.
                  abstain: total.abstain + (choice === 'abstain' || choice === 'pass' ? 1 : 0),
                }),
                { for: 0, against: 0, abstain: 0 },
              );

        const kind = vote.subjectKind === 'resolution' ? VOTING.resolution : VOTING.amendment;
        const outcome = resolveVote(tally, kind, VOTING.abstentionsCountTowardMajority);

        if (vote.subjectKind === 'resolution') {
          set({
            resolutions: state.resolutions.map((entry) =>
              entry.id === vote.subjectId
                ? { ...entry, status: outcome.passed ? 'passed' : 'failed' }
                : entry,
            ),
          });
        } else {
          set({
            amendments: state.amendments.map((entry) =>
              entry.id === vote.subjectId
                ? { ...entry, status: outcome.passed ? 'passed' : 'failed' }
                : entry,
            ),
          });
        }

        set({ vote: null });
        log(
          'vote',
          `${vote.subjectLabel} — ${outcome.passed ? 'PASSED' : 'FAILED'}`,
          `${tally.for} for, ${tally.against} against, ${tally.abstain} abstaining. ${outcome.required} of ${outcome.base} votes cast needed.`,
        );
      },

      cancelVote() {
        const vote = get().vote;
        if (!vote) return;
        if (vote.subjectKind === 'resolution') {
          set((state) => ({
            resolutions: state.resolutions.map((entry) =>
              entry.id === vote.subjectId ? { ...entry, status: 'debate' } : entry,
            ),
          }));
        }
        set({ vote: null });
        log('vote', `Voting on ${vote.subjectLabel} cancelled`);
      },

      /* ── Awards ────────────────────────────────────────────────────────── */

      giveAward(type, delegation) {
        const label = AWARD_LABEL[type];
        const previous = get().awards.find((award) => award.type === type) ?? null;
        if (previous?.delegationId === delegation.id) return;

        const award: Award = {
          type,
          delegationId: delegation.id,
          country: delegation.country,
          countryCode: delegation.countryCode || null,
          delegateName: delegation.delegateName,
          awardedAt: Date.now(),
        };
        set((state) => ({
          awards: [
            ...state.awards.filter(
              (entry) => entry.type !== type && entry.delegationId !== delegation.id,
            ),
            award,
          ],
        }));
        log(
          'award',
          `${label} awarded to ${delegation.country}`,
          [
            delegation.delegateName ? `Delegate: ${delegation.delegateName}.` : '',
            previous ? `Replaces ${previous.country}.` : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        );
      },

      removeAward(type) {
        const previous = get().awards.find((award) => award.type === type);
        if (!previous) return;
        set((state) => ({ awards: state.awards.filter((award) => award.type !== type) }));
        log('award', `${AWARD_LABEL[type]} withdrawn from ${previous.country}`);
      },
    };
  };
}

function describeParams(params: Record<string, string | number>): string | undefined {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === '' || value === undefined) continue;
    if (key.endsWith('Sec') && typeof value === 'number') {
      parts.push(`${labelFor(key)} ${formatClock(value * 1000)}`);
    } else {
      parts.push(`${labelFor(key)} ${value}`);
    }
  }
  return parts.length ? parts.join(' · ') : undefined;
}

function labelFor(key: string): string {
  switch (key) {
    case 'totalTimeSec':
      return 'Total';
    case 'speakingTimeSec':
      return 'Speaking time';
    case 'topic':
      return 'Topic:';
    case 'purpose':
      return 'Purpose:';
    default:
      return '';
  }
}

export type ChairStore = UseBoundStore<StoreApi<ChairState>>;

const stores = new Map<string, ChairStore>();

/**
 * One persisted store per committee, created on first use.
 *
 * Keying the storage by committee means two chairs sharing a laptop — or one
 * chair who also sits as a delegate elsewhere — never overwrite each other's
 * session, and a refresh mid-debate restores exactly what was on screen.
 */
export function chairStoreFor(committeeId: string): ChairStore {
  const existing = stores.get(committeeId);
  if (existing) return existing;

  const store = create<ChairState>()(
    persist(createChairState(committeeId), {
      name: `tismun.chair.${committeeId}`,
      version: 2,
      // Version 2 is the simplified procedure: no Moderated Caucus, and no
      // Divide the Question. A session saved before then may still hold them.
      migrate: (persisted) => {
        const state = { ...(persisted as Partial<ChairState> & { moderated?: unknown }) };
        delete state.moderated;
        if (state.motions) state.motions = knownMotions(state.motions);
        return state as ChairState;
      },
    }),
  );
  stores.set(committeeId, store);
  return store;
}

/**
 * Motions of a type the rules still define. A session saved, or handed over,
 * from an older version may hold motion types that have since been removed,
 * and every screen that shows a motion looks its rule up by type.
 */
export const knownMotions = (motions: Motion[]): Motion[] =>
  motions.filter((motion) => motion.type in MOTION_BY_ID);

/* ── Derived selectors ───────────────────────────────────────────────────── */

/**
 * These take the attendance record rather than the whole state on purpose.
 *
 * zustand v5 reads through useSyncExternalStore, which compares what a selector
 * returns by reference — a selector that builds a fresh array every call looks
 * like a change on every render and spins. So components select the (stable)
 * attendance object and derive these inside a useMemo.
 */
export const presentIds = (attendance: Record<string, Attendance>): string[] =>
  Object.entries(attendance)
    .filter(([, status]) => status !== 'absent')
    .map(([id]) => id);

export const presentAndVotingIds = (attendance: Record<string, Attendance>): string[] =>
  Object.entries(attendance)
    .filter(([, status]) => status === 'present-voting')
    .map(([id]) => id);

/**
 * The data half of the store, without the actions.
 *
 * This is exactly what `persist` writes to localStorage, so anything that
 * reads a committee's session from storage — rather than from a live store —
 * can be typed against it.
 */
export type ChairData = Pick<
  ChairState,
  | 'names'
  | 'codes'
  | 'rollCallTakenAt'
  | 'attendance'
  | 'gsl'
  | 'unmoderated'
  | 'presentation'
  | 'presentationsHeld'
  | 'briefingsHeld'
  | 'unmoderatedHeld'
  | 'motions'
  | 'resolutions'
  | 'amendments'
  | 'vote'
  | 'awards'
  | 'log'
>;

export function sessionStatusOf(state: ChairData): SessionStatus {
  if (state.vote) return 'Voting Procedure';
  if (state.presentation?.active) {
    if (state.presentation.phase === 'questions') return 'Question-and-Answer Period';
    return state.presentation.kind === 'briefing'
      ? 'Crisis Briefing'
      : 'Presentation of the Draft Resolution';
  }
  if (state.unmoderated.active) return 'Unmoderated Caucus';
  if (state.gsl.currentId) return 'General Speakers’ List';
  if (state.rollCallTakenAt) return 'In session';
  return 'Not in session';
}
