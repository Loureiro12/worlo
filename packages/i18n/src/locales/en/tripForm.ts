import type { TranslationSchema } from '../../types';

const tripForm: TranslationSchema['tripForm'] = {
  overline: {
    onboarding: 'Step 2 of 2',
    newPast: 'New trip',
    newFuture: 'New destination',
    edit: 'Edit',
  },
  title: {
    past: 'Tell us about a trip you took',
    future: 'Where do you want to go?',
    edit: 'Edit trip',
  },
  sub: {
    past: 'The destination and a name are enough. Fill in the rest whenever you like.',
    future: 'Save the destination now. Memories and expenses wait until the trip happens.',
    edit: 'Collaborators can edit this information too.',
  },
  kind: {
    label: 'Trip type',
    past: 'Been there',
    future: 'Want to go',
  },
  dest: 'Destination',
  destPlaceholder: 'Where to?',
  name: {
    past: 'Trip name',
    future: 'Destination name',
  },
  namePlaceholder: {
    past: 'Winter in Floripa',
    future: 'Cherry blossoms in Japan',
  },
  errors: {
    dest: 'Tell us where you went.',
    name: 'Give this trip a name.',
  },
  collab: {
    past: 'Who went with you',
    future: 'Who’s going with you',
    remove: 'Remove {{name}}',
    inviteLink: 'Invite by link',
    linkCopied: 'Invite link copied. Whoever joins becomes a collaborator.',
    saveFirst: 'Save the trip first to get an invite link.',
  },
  when: 'When was it',
  whenPlaceholder: 'July 2025',
  tripType: 'Kind of trip',
  types: {
    solo: 'Solo',
    couple: 'Couple',
    family: 'Family',
    friends: 'Friends',
    work: 'Work',
  },
  food: 'Food',
  foodPlaceholder: 'What was the best thing you ate?',
  shopping: 'Shopping',
  shoppingPlaceholder: 'Did you bring anything back?',
  experiences: 'Other experiences',
  exp: {
    beach: 'Beach',
    trail: 'Hiking',
    museum: 'Museum',
    show: 'Concert',
    boat: 'Boat',
    nightlife: 'Nightlife',
    party: 'Local festival',
  },
  photosTitle: 'Photos from this trip',
  photosText: 'You can import them later, from your profile.',
  save: {
    past: 'Save to my map',
    future: 'Save destination',
    edit: 'Save changes',
  },
  toasts: {
    pastSaved: 'Trip saved to your map.',
    pastInvited: 'Trip saved. Invite sent to {{names}}.',
    futureSaved: 'Destination saved. Shall we?',
    futureInvited: 'Destination saved. Invite sent to {{names}}.',
    updated: 'Trip updated.',
    updatedInvited: 'Trip updated. Invite sent to {{names}}.',
  },
  defaults: {
    period: 'Date to be decided',
    savedNow: 'Saved just now',
    savedOn: 'Saved {{month}}',
    invitedBy: 'Invite from {{name}}',
    destNote: 'Destination: {{dest}}',
  },
};

export default tripForm;
