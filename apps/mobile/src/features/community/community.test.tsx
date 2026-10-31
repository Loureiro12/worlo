import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import { createI18n } from '@worlo/i18n';
import { applyVote, relativeTime, type TimeLabel, toComment, toPost } from '@/data/community';
import type { FeedRow } from '@/data/communityApi';
import { db } from '@/lib/database';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { CommunityScreen } from './CommunityScreen';
import { firstMissing } from './ComposeScreen';
import { postStats, searchPlaces } from './model';
import { PostScreen } from './PostScreen';
import { communityServer, resetCommunityServer } from './testServer';

jest.mock('@/data/communityApi', () => require('./testServer').mockModule());

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const P1 = demoId('post:p1');
const selected = (id: string) => screen.getByTestId(id).props.accessibilityState?.selected;
const myVoteOn = (postId: string) =>
  communityServer.votes.find((v) => v.post_id === postId && v.user_id === DEMO_USER.id)?.value;
const t = createI18n('pt-BR').t as unknown as TimeLabel;
/** React Query notifies observers in a batch (next tick): wait for the UI. */
const eventually = (assertion: () => void) => waitFor(assertion);

beforeEach(() => {
  resetStore();
  resetCommunityServer();
  jest.clearAllMocks();
  mockParams = {};
});

describe('reliability rule', () => {
  it('computes percent and level from votes including the user vote', () => {
    expect(postStats({ yes: 128, no: 4 })).toMatchObject({ pct: 97, level: 'high' });
    expect(postStats({ yes: 41, no: 9 })).toMatchObject({ pct: 82, level: 'checking' });
    expect(postStats({ yes: 0, no: 0 })).toMatchObject({ pct: 0, total: 0, level: 'waiting' });
    expect(postStats({ yes: 0, no: 0 }, 'yes')).toMatchObject({ pct: 100, level: 'high' });
    expect(postStats({ yes: 9, no: 1 }, 'no')).toMatchObject({ yes: 9, no: 2, pct: 82 });
  });

  it('validates compose in order: place → rating (review) → text', () => {
    const base = { place: null, type: 'Avaliação' as const, rating: 0, text: '' };
    expect(firstMissing(base)).toBe('place');
    const place = { title: 'Lisboa', kind: 'city' as const };
    expect(firstMissing({ ...base, place })).toBe('rating');
    expect(firstMissing({ ...base, place, rating: 4, text: 'curto' })).toBe('text');
    expect(firstMissing({ ...base, place, rating: 4, text: 'Valeu muito a pena!' })).toBeNull();
    expect(firstMissing({ ...base, type: 'Dica', place, text: '0123456789' })).toBeNull();
  });

  it('searches places accent-insensitively', () => {
    expect(searchPlaces('')).toHaveLength(3);
    expect(searchPlaces('florianopolis')[0]?.title).toBe('Florianópolis');
  });
});

describe('RPC row → view mapping', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  const row: FeedRow = {
    id: 'post-1',
    author_id: 'u-marina',
    author_name: 'Marina Costa',
    author_username: 'marinaporai',
    author_avatar: null,
    author_expert_role: null,
    type: 'review',
    place_label: 'Lisboa',
    place_ref: null,
    title: null,
    text: 'Vale a pena.',
    rating: 4,
    photo_paths: ['u-marina/a.jpg', 'u-marina/b.jpg'],
    trip_id: null,
    visibility: 'friends',
    created_at: '2026-10-29T11:00:00Z',
    yes: 5,
    no: 1,
    my_vote: 'yes',
    comments: 3,
  };

  it('maps a feed row: type, author, relative time, my vote out of the counts, photos', () => {
    const post = toPost(row, { meId: 'me-id', t, now });
    expect(post).toMatchObject({
      id: 'post-1',
      authorId: 'u-marina',
      author: 'Marina Costa',
      ini: 'MC',
      where: 'Lisboa',
      when: 'há 2 dias',
      type: 'Avaliação',
      rating: 4,
      yes: 4,
      no: 1,
      myVote: 'yes',
      mine: false,
      visibility: 'friends',
      comments: 3,
      photo: 'https://storage.test/post-photos/u-marina/a.jpg',
    });
    expect(post.photos).toHaveLength(2);
    expect(postStats(post, post.myVote)).toMatchObject({ yes: 5, no: 1 });
    expect(
      toPost({ ...row, author_id: 'me-id', my_vote: null }, { meId: 'me-id', t, now }),
    ).toMatchObject({ mine: true, yes: 5, myVote: undefined });
  });

  it('maps comments and relative times', () => {
    const comment = toComment(
      {
        id: 'c1',
        author_id: 'me-id',
        author_name: 'Ana Ribeiro',
        author_username: 'anaribeiro',
        author_avatar: null,
        text: 'Oi',
        created_at: '2026-10-31T11:40:00Z',
      },
      { meId: 'me-id', t, now },
    );
    expect(comment).toMatchObject({ who: 'Ana Ribeiro', ini: 'AR', when: 'há 20 min', mine: true });
    const ago = (ms: number) => relativeTime(new Date(now - ms).toISOString(), t, now);
    expect(ago(10_000)).toBe('agora');
    expect(ago(3 * 3_600_000)).toBe('há 3 h');
    expect(ago(86_400_000)).toBe('há 1 dia');
    expect(ago(8 * 86_400_000)).toBe('há 1 semana');
    expect(ago(400 * 86_400_000)).toBe('há 1 ano');
  });

  it('applies a vote change to the server counts', () => {
    expect(applyVote(row, 'no')).toMatchObject({ yes: 4, no: 2, my_vote: 'no' });
    expect(applyVote(row, null)).toMatchObject({ yes: 4, no: 1, my_vote: null });
    expect(applyVote({ ...row, my_vote: null }, 'yes')).toMatchObject({ yes: 6, my_vote: 'yes' });
  });
});

describe('CommunityScreen', () => {
  it('renders the demo feed with type chips and reliability', async () => {
    await renderWithProviders(<CommunityScreen />);
    expect(await screen.findByTestId('post-card-p1')).toBeOnTheScreen();
    expect(screen.getAllByText('Marina Costa').length).toBeGreaterThan(0);
    const p1 = communityServer.posts.find((p) => p.id === P1);
    const when = relativeTime(String(p1?.created_at), t);
    expect(screen.getByText(`em Lisboa · ${when}`)).toBeOnTheScreen();
    // Seeds: 7 demo accounts confirm Marina's tip and 1 disputes it.
    expect(screen.getByTestId('post-confirm-p1')).toHaveTextContent('88% confirmam');
    expect(screen.getByTestId('post-card-p2')).toBeOnTheScreen();
    expect(screen.getByTestId('post-card-ana-28')).toBeOnTheScreen();
  });

  it('toggles votes optimistically: one per user, counts include the vote', async () => {
    await renderWithProviders(<CommunityScreen />);
    await screen.findByTestId('post-card-p1');
    await fireEvent.press(screen.getByTestId('vote-yes-p1'));
    await eventually(() => expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('8'));
    expect(selected('vote-yes-p1')).toBe(true);
    await waitFor(() => expect(myVoteOn(P1)).toBe('yes'));

    await fireEvent.press(screen.getByTestId('vote-no-p1'));
    await eventually(() => expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('7'));
    expect(screen.getByTestId('vote-no-p1')).toHaveTextContent('2');
    expect(selected('vote-no-p1')).toBe(true);
    await waitFor(() => expect(myVoteOn(P1)).toBe('no'));

    // Same value again removes the vote.
    await fireEvent.press(screen.getByTestId('vote-no-p1'));
    await eventually(() => expect(screen.getByTestId('vote-no-p1')).toHaveTextContent('1'));
    await waitFor(() => expect(myVoteOn(P1)).toBeUndefined());
  });

  it('rolls the vote back with a toast when the server fails', async () => {
    communityServer.fail.add('vote');
    await renderWithProviders(<CommunityScreen />);
    await screen.findByTestId('post-card-p1');
    await fireEvent.press(screen.getByTestId('vote-yes-p1'));
    expect(await screen.findByText('Não deu pra salvar agora. Tenta de novo.')).toBeOnTheScreen();
    expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('7');
    expect(selected('vote-yes-p1')).toBe(false);
  });

  it('offline: votes show the offline copy and change nothing', async () => {
    await renderWithProviders(<CommunityScreen />);
    await screen.findByTestId('post-card-p1');
    communityServer.online = false;
    await fireEvent.press(screen.getByTestId('vote-yes-p1'));
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('7');
  });

  it('own posts: waiting/confirmed by others, and my vote is blocked', async () => {
    await renderWithProviders(<CommunityScreen />);
    await screen.findByTestId('post-card-ana-28');
    await fireEvent.press(screen.getByTestId('vote-yes-ana-28'));
    expect(screen.getByText('Quem confirma são outros viajantes.')).toBeOnTheScreen();
    expect(myVoteOn(demoId('post:ana-28'))).toBeUndefined();
  });

  it('navigates to post, author (user id), search and compose', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(await screen.findByTestId('post-open-p1'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post(P1));
    await fireEvent.press(screen.getByText('Rafael Lima'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler(userId('Rafael Lima')));
    await fireEvent.press(screen.getByTestId('community-search'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.search);
    await fireEvent.press(screen.getByTestId('community-compose'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.compose());
  });

  it('Seguindo: posts from the people Ana follows only', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('community-segment-following'));
    expect(await screen.findByTestId('post-card-p1')).toBeOnTheScreen();
    expect(screen.queryByText('Ana Serrano')).toBeNull();
    expect(screen.queryByTestId('post-card-ana-28')).toBeNull();
  });

  it('Seguindo: empty state when Ana follows nobody', async () => {
    db.delete(schema.follows).run();
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('community-segment-following'));
    expect(await screen.findByTestId('community-following-empty')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Ver especialistas'));
    expect(screen.getByTestId('expert-anaserrano')).toBeOnTheScreen();
    expect(await screen.findByTestId('expert-post-anaserrano')).toBeOnTheScreen();
  });

  it('Especialistas: synced experts with their latest post; follow writes a follows row', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('community-segment-experts'));
    expect(screen.getByText('Especialista verificado · Portugal')).toBeOnTheScreen();
    expect(await screen.findByTestId('expert-post-anaserrano')).toBeOnTheScreen();
    const follow = () => screen.getByTestId('expert-follow-anaserrano');
    expect(follow()).toHaveTextContent('Seguir');
    await fireEvent.press(follow());
    expect(follow()).toHaveTextContent('Seguindo');
    expect(follow().props.accessibilityState?.selected).toBe(true);
    const expert = userId('Ana Serrano');
    const pending = db
      .select()
      .from(schema.outbox)
      .all()
      .filter((o) => o.tableName === 'follows');
    expect(pending).toHaveLength(1);
    expect(
      db
        .select()
        .from(schema.follows)
        .all()
        .some((f) => f.followeeId === expert && f.userId === DEMO_USER.id && !f.deletedAt),
    ).toBe(true);
  });

  it('shows the offline state when the feed cannot load', async () => {
    communityServer.online = false;
    await renderWithProviders(<CommunityScreen />);
    expect(await screen.findByText('Você está sem internet')).toBeOnTheScreen();
    expect(screen.queryByTestId('community-screen')).toBeNull();
  });

  it('shows the demo offline state (needs network)', async () => {
    useStore.setState({ demo: 'offline' });
    await renderWithProviders(<CommunityScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(screen.queryByTestId('community-screen')).toBeNull();
  });
});

describe('PostScreen', () => {
  it('shows reliability from real votes, the explanation and comments', async () => {
    mockParams = { id: P1 };
    await renderWithProviders(<PostScreen />);
    expect(await screen.findByTestId('post-pct')).toHaveTextContent('88%');
    expect(screen.getByTestId('post-reliability-label')).toHaveTextContent('Em verificação');
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      '7 viajantes confirmaram e 1 disseram que está desatualizado. Quanto mais gente confirma, mais alto aparece.',
    );
    expect(
      await screen.findByText('Confirmo! Fui sábado às 8h40 e sentei na janela.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('(2)')).toBeOnTheScreen();
  });

  it('votes from the detail and updates the explanation', async () => {
    mockParams = { id: P1 };
    await renderWithProviders(<PostScreen />);
    await screen.findByTestId('post-pct');
    await fireEvent.press(screen.getByTestId('post-vote-no'));
    await eventually(() => expect(selected('post-vote-no')).toBe(true));
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      /7 viajantes confirmaram e 2 disseram/,
    );
    await fireEvent.press(screen.getByTestId('post-vote-yes'));
    await eventually(() => expect(selected('post-vote-no')).toBe(false));
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      /8 viajantes confirmaram e 1 disseram/,
    );
    await waitFor(() => expect(myVoteOn(P1)).toBe('yes'));
  });

  it('own post: confirmed by others, voting blocked, author opens my profile', async () => {
    mockParams = { id: demoId('post:ana-28') };
    await renderWithProviders(<PostScreen />);
    expect(await screen.findByTestId('post-pct')).toHaveTextContent('100%');
    expect(screen.getByTestId('post-reliability-label')).toHaveTextContent('Alta confiabilidade');
    await fireEvent.press(screen.getByTestId('post-vote-yes'));
    expect(screen.getByText('Quem confirma são outros viajantes.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('post-author'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler('me'));
  });

  it('adds a comment; send is disabled while empty', async () => {
    mockParams = { id: P1 };
    await renderWithProviders(<PostScreen />);
    await screen.findByText('(2)');
    expect(screen.getByTestId('post-comment-send')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('post-comment-input'), '  Vale muito!  ');
    expect(screen.getByTestId('post-comment-send')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('post-comment-send'));
    expect(screen.getByText('Vale muito!')).toBeOnTheScreen();
    expect(screen.getByText('(3)')).toBeOnTheScreen();
    expect(screen.getByTestId('post-comment-input').props.value).toBe('');
    await waitFor(() =>
      expect(communityServer.comments.at(-1)).toMatchObject({
        post_id: P1,
        user_id: DEMO_USER.id,
        text: 'Vale muito!',
      }),
    );
  });

  it('rolls a failed comment back and keeps the text', async () => {
    communityServer.fail.add('comment');
    mockParams = { id: P1 };
    await renderWithProviders(<PostScreen />);
    await screen.findByText('(2)');
    await fireEvent.changeText(screen.getByTestId('post-comment-input'), 'Vale muito!');
    await fireEvent.press(screen.getByTestId('post-comment-send'));
    expect(await screen.findByText('Não deu pra salvar agora. Tenta de novo.')).toBeOnTheScreen();
    expect(screen.getByText('(2)')).toBeOnTheScreen();
    expect(screen.getByTestId('post-comment-input').props.value).toBe('Vale muito!');
  });

  it('opens the author profile by user id', async () => {
    mockParams = { id: demoId('post:p2') };
    await renderWithProviders(<PostScreen />);
    await fireEvent.press(await screen.findByTestId('post-author'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler(userId('Rafael Lima')));
  });

  it('unknown post: not found', async () => {
    mockParams = { id: demoId('post:nope') };
    await renderWithProviders(<PostScreen />);
    expect(await screen.findByText('Essa publicação não existe mais.')).toBeOnTheScreen();
  });

  it('offline without cache: offline state', async () => {
    communityServer.online = false;
    mockParams = { id: P1 };
    await renderWithProviders(<PostScreen />);
    expect(await screen.findByText('Você está sem internet')).toBeOnTheScreen();
    await act(async () => {
      communityServer.online = true;
    });
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByTestId('post-pct')).toBeOnTheScreen();
  });
});
