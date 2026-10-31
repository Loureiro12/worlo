import { act, fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import type { CommunityPost } from '@/store/slices/community';
import { renderWithProviders } from '@/test-utils';
import { CommunityScreen } from './CommunityScreen';
import { firstMissing } from './ComposeScreen';
import { postStats, searchPlaces } from './model';
import { PostScreen } from './PostScreen';

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

const myPost: CommunityPost = {
  id: 'u1',
  mine: true,
  author: 'Ana Ribeiro',
  ini: 'AR',
  where: 'Lisboa',
  when: 'agora',
  type: 'Dica',
  text: 'Pastel de nata da Manteigaria sai quentinho às 8h.',
  yes: 0,
  no: 0,
  tint: '#FAD9CE',
  photo: null,
};

const selected = (id: string) => screen.getByTestId(id).props.accessibilityState?.selected;

beforeEach(() => {
  resetStore();
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

describe('CommunityScreen', () => {
  it('renders the feed with type chips and reliability', async () => {
    await renderWithProviders(<CommunityScreen />);
    expect(screen.getByTestId('community-screen')).toBeOnTheScreen();
    expect(screen.getByText('Marina Costa')).toBeOnTheScreen();
    expect(screen.getByText('em Lisboa · há 2 dias')).toBeOnTheScreen();
    expect(screen.getByText('Dica')).toBeOnTheScreen();
    expect(screen.getByTestId('post-confirm-p1')).toHaveTextContent('97% confirmam');
  });

  it('toggles votes: one per user, counts include the vote', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('vote-yes-p1'));
    expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('129');
    expect(selected('vote-yes-p1')).toBe(true);

    await fireEvent.press(screen.getByTestId('vote-no-p1'));
    expect(screen.getByTestId('vote-yes-p1')).toHaveTextContent('128');
    expect(screen.getByTestId('vote-no-p1')).toHaveTextContent('5');
    expect(selected('vote-yes-p1')).toBe(false);
    expect(selected('vote-no-p1')).toBe(true);

    await fireEvent.press(screen.getByTestId('vote-no-p1'));
    expect(screen.getByTestId('vote-no-p1')).toHaveTextContent('4');
    expect(useStore.getState().votes.p1).toBeUndefined();
  });

  it('shows my posts on top, waiting for confirmations, and blocks my vote', async () => {
    useStore.setState({ myPosts: [myPost] });
    await renderWithProviders(<CommunityScreen />);
    const cards = screen.getAllByTestId(/^post-card-/);
    expect(cards[0]?.props.testID).toBe('post-card-u1');
    expect(screen.getByTestId('post-confirm-u1')).toHaveTextContent('Aguardando confirmações');

    await fireEvent.press(screen.getByTestId('vote-yes-u1'));
    expect(screen.getByText('Quem confirma são outros viajantes.')).toBeOnTheScreen();
    expect(useStore.getState().votes.u1).toBeUndefined();
  });

  it('navigates to post, author, search and compose', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('post-open-p1'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post('p1'));
    await fireEvent.press(screen.getByText('Rafael Lima'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler('Rafael Lima'));
    await fireEvent.press(screen.getByTestId('community-search'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.search);
    await fireEvent.press(screen.getByTestId('community-compose'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.compose());
  });

  it('Seguindo shows an empty state, then posts from followed people', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('community-segment-following'));
    expect(screen.getByTestId('community-following-empty')).toBeOnTheScreen();

    await act(() => useStore.getState().toggleFollow('Marina Costa'));
    expect(screen.getByTestId('post-card-p1')).toBeOnTheScreen();
    expect(screen.queryByTestId('post-card-p2')).toBeNull();
  });

  it('Especialistas: follow toggles Seguir ↔ Seguindo', async () => {
    await renderWithProviders(<CommunityScreen />);
    await fireEvent.press(screen.getByTestId('community-segment-experts'));
    expect(screen.getByText('Especialista verificado · Portugal')).toBeOnTheScreen();
    const follow = () => screen.getByTestId('expert-follow-e1');
    expect(follow()).toHaveTextContent('Seguir');
    await fireEvent.press(follow());
    expect(follow()).toHaveTextContent('Seguindo');
    expect(follow().props.accessibilityState?.selected).toBe(true);
    expect(useStore.getState().following.e1).toBe(true);
  });

  it('shows the offline state (needs network)', async () => {
    useStore.setState({ demo: 'offline' });
    await renderWithProviders(<CommunityScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(screen.queryByTestId('community-screen')).toBeNull();
  });
});

describe('PostScreen', () => {
  it('shows high reliability, explanation and comments', async () => {
    mockParams = { id: 'p1' };
    await renderWithProviders(<PostScreen />);
    expect(screen.getByTestId('post-pct')).toHaveTextContent('97%');
    expect(screen.getByTestId('post-reliability-label')).toHaveTextContent('Alta confiabilidade');
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      '128 viajantes confirmaram e 4 disseram que está desatualizado. Quanto mais gente confirma, mais alto aparece.',
    );
    expect(screen.getByText('(2)')).toBeOnTheScreen();
    expect(screen.getByText('Confirmo! Fui sábado às 8h40 e sentei na janela.')).toBeOnTheScreen();
  });

  it('labels "Em verificação" below 90% and updates with my vote', async () => {
    mockParams = { id: 'p3' };
    await renderWithProviders(<PostScreen />);
    expect(screen.getByTestId('post-pct')).toHaveTextContent('82%');
    expect(screen.getByTestId('post-reliability-label')).toHaveTextContent('Em verificação');
    await fireEvent.press(screen.getByTestId('post-vote-no'));
    expect(selected('post-vote-no')).toBe(true);
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      /41 viajantes confirmaram e 10 disseram/,
    );
    await fireEvent.press(screen.getByTestId('post-vote-yes'));
    expect(selected('post-vote-no')).toBe(false);
    expect(screen.getByTestId('post-reliability-explain')).toHaveTextContent(
      /42 viajantes confirmaram e 9 disseram/,
    );
  });

  it('own post: 0 votes waits for confirmations and voting is blocked', async () => {
    useStore.setState({ myPosts: [myPost] });
    mockParams = { id: 'u1' };
    await renderWithProviders(<PostScreen />);
    expect(screen.getByTestId('post-pct')).toHaveTextContent('0%');
    expect(screen.getByTestId('post-reliability-label')).toHaveTextContent(
      'Aguardando confirmações',
    );
    await fireEvent.press(screen.getByTestId('post-vote-yes'));
    expect(screen.getByText('Quem confirma são outros viajantes.')).toBeOnTheScreen();
    expect(useStore.getState().votes.u1).toBeUndefined();
    await fireEvent.press(screen.getByTestId('post-author'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler('me'));
  });

  it('adds a comment; send is disabled while empty', async () => {
    mockParams = { id: 'p1' };
    await renderWithProviders(<PostScreen />);
    expect(screen.getByTestId('post-comment-send')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('post-comment-input'), '  Vale muito!  ');
    expect(screen.getByTestId('post-comment-send')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('post-comment-send'));
    expect(screen.getByText('Vale muito!')).toBeOnTheScreen();
    expect(screen.getByText('(3)')).toBeOnTheScreen();
    expect(screen.getByTestId('post-comment-input').props.value).toBe('');
    expect(useStore.getState().comments.p1?.[0]).toMatchObject({
      who: 'Ana Ribeiro',
      text: 'Vale muito!',
    });
  });

  it('opens the author profile', async () => {
    mockParams = { id: 'p2' };
    await renderWithProviders(<PostScreen />);
    await fireEvent.press(screen.getByTestId('post-author'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler('Rafael Lima'));
  });
});
